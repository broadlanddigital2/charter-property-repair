#!/usr/bin/env python3
"""
Convert a mysqldump of the legacy Laravel database (insurance-api) into a
Postgres SQL script for the Supabase project.

    mysqldump --single-transaction --skip-extended-insert=false \
        -h <host> -u <user> -p <database> > legacy.sql
    python3 mysql_to_supabase.py legacy.sql > import.sql
    psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f import.sql

What it does
  * legacy `guid` becomes the new uuid primary key (legacy `id` -> legacy_id)
  * foreign keys are remapped from integer ids to uuids
  * users -> public.contacts; ACTIVE users also get an auth.users login that
    keeps their existing bcrypt password, so nobody has to reset
  * order lines get a snapshot of product sku/name/price/band/in-budget
  * runs in one transaction and is idempotent (ON CONFLICT DO NOTHING)

Standard library only (Python 3.9+).
"""
from __future__ import annotations

import json
import re
import sys
import uuid
from collections import defaultdict

# --------------------------------------------------------------------------
# mysqldump parsing
# --------------------------------------------------------------------------
CREATE_RE = re.compile(r"CREATE TABLE (?:IF NOT EXISTS )?`(\w+)` \((.*?)\)\s*(?:ENGINE[^;]*)?;", re.S)
COL_RE = re.compile(r"(?:^|,|\()\s*`(\w+)`\s+[a-z]", re.M | re.I)
INSERT_RE = re.compile(r"INSERT INTO `(\w+)`\s*(\(([^)]*)\))?\s*VALUES\s*", re.I)

ESCAPES = {"0": "\0", "b": "\b", "n": "\n", "r": "\r", "t": "\t", "Z": "\x1a"}


def parse_values(s: str, i: int):
    """Parse `(...),(...);` starting at s[i]. Returns (rows, end_index)."""
    rows, n = [], len(s)
    while i < n:
        while s[i] in " \n\r\t,":
            i += 1
        if s[i] == ";":
            return rows, i + 1
        assert s[i] == "(", f"expected '(' at {i}: {s[i:i+40]!r}"
        i += 1
        row = []
        while True:
            while s[i] in " \n\r\t":
                i += 1
            c = s[i]
            if c == "'":
                i += 1
                buf = []
                while True:
                    c = s[i]
                    if c == "\\":
                        nxt = s[i + 1]
                        buf.append(ESCAPES.get(nxt, nxt))
                        i += 2
                    elif c == "'":
                        if i + 1 < n and s[i + 1] == "'":
                            buf.append("'")
                            i += 2
                        else:
                            i += 1
                            break
                    else:
                        buf.append(c)
                        i += 1
                row.append("".join(buf))
            else:
                j = i
                while s[j] not in ",)":
                    j += 1
                tok = s[i:j].strip()
                i = j
                if tok.upper() == "NULL":
                    row.append(None)
                elif tok.startswith("0x"):
                    row.append(bytes.fromhex(tok[2:]).decode("utf-8", "replace"))
                else:
                    try:
                        row.append(int(tok))
                    except ValueError:
                        row.append(float(tok))
            while s[i] in " \n\r\t":
                i += 1
            if s[i] == ",":
                i += 1
                continue
            assert s[i] == ")", f"expected ')' at {i}"
            i += 1
            rows.append(row)
            break
    return rows, i


def load_dump(text: str) -> dict[str, list[dict]]:
    columns = {m.group(1): COL_RE.findall(m.group(2)) for m in CREATE_RE.finditer(text)}
    tables: dict[str, list[dict]] = defaultdict(list)
    pos = 0
    while True:
        m = INSERT_RE.search(text, pos)
        if not m:
            break
        table = m.group(1)
        cols = [c.strip(" `") for c in m.group(3).split(",")] if m.group(3) else columns.get(table)
        if not cols:
            raise SystemExit(f"No column list for table {table}; dump with CREATE TABLE statements")
        rows, pos = parse_values(text, m.end())
        tables[table].extend(dict(zip(cols, r)) for r in rows)
    return tables


# --------------------------------------------------------------------------
# SQL output helpers
# --------------------------------------------------------------------------
def lit(v) -> str:
    if v is None:
        return "null"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return repr(v)
    if isinstance(v, (dict, list)):
        v = json.dumps(v)
    return "'" + str(v).replace("'", "''") + "'"


def ts(v):
    return None if not v or str(v).startswith("0000-00-00") else v


def as_uuid(v):
    if not v:
        return None
    try:
        return str(uuid.UUID(str(v)))
    except ValueError:
        return None


def boolean(v):
    return bool(int(v)) if v not in (None, "") else False


def insert(out, table: str, rows: list[dict], conflict: str = "(id)"):
    if not rows:
        out.append(f"-- {table}: 0 rows")
        return
    cols = list(rows[0].keys())
    out.append(f"-- {table}: {len(rows)} rows")
    for k in range(0, len(rows), 500):
        chunk = rows[k : k + 500]
        values = ",\n".join("(" + ", ".join(lit(r[c]) for c in cols) + ")" for r in chunk)
        out.append(f"insert into {table} ({', '.join(cols)}) values\n{values}\non conflict {conflict} do nothing;")


# --------------------------------------------------------------------------
# main
# --------------------------------------------------------------------------
def main(path: str):
    t = load_dump(open(path, encoding="utf-8", errors="replace").read())
    warn = lambda msg: print(f"-- WARNING: {msg}", file=sys.stderr)

    def idmap(table):
        m = {}
        for r in t.get(table, []):
            g = as_uuid(r.get("guid")) or str(uuid.uuid4())
            m[r["id"]] = g
        return m

    band_ids, sup_ids, cat_ids, prod_ids = idmap("price_bands"), idmap("suppliers"), idmap("categories"), idmap("products")
    co_ids, user_ids, job_ids = idmap("companies"), idmap("users"), idmap("jobs")
    basket_ids, bl_ids, order_ids, ol_ids = idmap("baskets"), idmap("basket_lines"), idmap("orders"), idmap("order_lines")
    band_value = {r["id"]: r["band"] for r in t.get("price_bands", [])}

    out = ["-- Generated by scripts/migrate/mysql_to_supabase.py", "begin;"]

    insert(out, "public.price_bands", [
        {"id": band_ids[r["id"]], "legacy_id": r["id"], "band": r["band"],
         "created_at": ts(r.get("created_at")) or "now()", "updated_at": ts(r.get("updated_at")) or "now()"}
        for r in t.get("price_bands", [])])

    insert(out, "public.suppliers", [
        {"id": sup_ids[r["id"]], "legacy_id": r["id"], "name": r["name"], "image": r.get("image"),
         "created_at": ts(r.get("created_at")) or "now()", "updated_at": ts(r.get("updated_at")) or "now()"}
        for r in t.get("suppliers", [])])

    # categories: parents before children
    cats = t.get("categories", [])
    by_id = {r["id"]: r for r in cats}
    depth = {}
    def d(cid, seen=()):
        if cid in depth:
            return depth[cid]
        p = by_id.get(cid, {}).get("parent_id")
        depth[cid] = 0 if not p or p not in by_id or p in seen else d(p, seen + (cid,)) + 1
        return depth[cid]
    cats = sorted(cats, key=lambda r: d(r["id"]))
    insert(out, "public.categories", [
        {"id": cat_ids[r["id"]], "legacy_id": r["id"],
         "parent_id": cat_ids.get(r.get("parent_id")) if r.get("parent_id") else None,
         "name": r["name"], "image": r.get("image"),
         "created_at": ts(r.get("created_at")) or "now()", "updated_at": ts(r.get("updated_at")) or "now()"}
        for r in cats])

    products = []
    for r in t.get("products", []):
        if r.get("supplier_id") not in sup_ids or r.get("category_id") not in cat_ids:
            warn(f"product {r['id']} skipped: missing supplier/category")
            continue
        misc = r.get("miscellaneous")
        if isinstance(misc, str):
            try:
                misc = json.loads(misc)
            except ValueError:
                misc = {"raw": misc}
        products.append({
            "id": prod_ids[r["id"]], "legacy_id": r["id"],
            "supplier_id": sup_ids[r["supplier_id"]], "category_id": cat_ids[r["category_id"]],
            "price_band_id": band_ids.get(r.get("price_band_id")),
            "sku": (r.get("sku") or "")[:100], "name": r["name"], "manufacturer": r.get("manufacturer"),
            "description": r.get("description"), "image": r.get("image"), "price": r.get("price"),
            "price_has_vat": boolean(r.get("price_has_vat")),
            "miscellaneous": json.dumps(misc) if misc is not None else None,
            "created_at": ts(r.get("created_at")) or "now()", "updated_at": ts(r.get("updated_at")) or "now()"})
    insert(out, "public.products", products)
    valid_products = {p["legacy_id"] for p in products}

    seen_sm8 = set()
    companies = []
    for r in t.get("companies", []):
        sm8 = as_uuid(r.get("service_mate_uuid"))
        if sm8 in seen_sm8:
            warn(f"company {r['id']} duplicate service_mate_uuid {sm8}; cleared")
            sm8 = None
        seen_sm8.add(sm8)
        companies.append({
            "id": co_ids[r["id"]], "legacy_id": r["id"], "service_mate_uuid": sm8,
            "price_band_id": band_ids.get(r.get("price_band_id")), "name": r["name"],
            **{k: r.get(k) for k in ["website", "abn_number", "address", "address_street", "address_city",
                                     "address_state", "address_postcode", "address_country", "billing_address",
                                     "badges", "fax_number", "custom_field_payment_terms", "payment_terms"]},
            "active": boolean(r.get("active")), "is_individual": boolean(r.get("is_individual")),
            "tax_rate_uuid": as_uuid(r.get("tax_rate_uuid")), "parent_company_uuid": as_uuid(r.get("parent_company_uuid")),
            "created_at": ts(r.get("created_at")) or "now()", "updated_at": ts(r.get("updated_at")) or "now()"})
    insert(out, "public.companies", companies)

    # users -> auth.users (active only, keeping bcrypt hash) + contacts
    auth_users, identities, contacts, seen_email, seen_contact_sm8 = [], [], [], set(), set()
    for r in t.get("users", []):
        email = (r.get("email") or "").strip()
        if not email or email.lower() in seen_email:
            warn(f"user {r['id']} skipped: empty/duplicate email {email!r}")
            continue
        seen_email.add(email.lower())
        cid = user_ids[r["id"]]
        active = boolean(r.get("active"))
        user_id = None
        pw = r.get("password") or ""
        if active and pw.startswith("$2"):
            user_id = cid
            auth_users.append({
                "instance_id": "00000000-0000-0000-0000-000000000000", "id": user_id,
                "aud": "authenticated", "role": "authenticated", "email": email.lower(),
                "encrypted_password": "$2a$" + pw[4:] if pw.startswith("$2y$") else pw,
                "email_confirmed_at": ts(r.get("email_verified_at")) or ts(r.get("created_at")) or "now()",
                "raw_app_meta_data": json.dumps({"provider": "email", "providers": ["email"]}),
                "raw_user_meta_data": json.dumps({"name": r.get("name")}),
                "created_at": ts(r.get("created_at")) or "now()", "updated_at": ts(r.get("updated_at")) or "now()",
                "confirmation_token": "", "recovery_token": "", "email_change": "", "email_change_token_new": ""})
            identities.append({
                "id": str(uuid.uuid4()), "user_id": user_id, "provider": "email", "provider_id": user_id,
                "identity_data": json.dumps({"sub": user_id, "email": email.lower(), "email_verified": True}),
                "created_at": "now()", "updated_at": "now()"})
        elif active:
            warn(f"user {r['id']} active but has no bcrypt password; will need re-activation")
        sm8 = as_uuid(r.get("service_mate_uuid"))
        if sm8 in seen_contact_sm8:
            sm8 = None
        seen_contact_sm8.add(sm8)
        contacts.append({
            "id": cid, "legacy_id": r["id"], "user_id": user_id,
            "company_id": co_ids.get(r.get("company_id")), "service_mate_uuid": sm8,
            "name": r.get("name") or email, "email": email, "active": active and user_id is not None,
            "is_primary_contact": boolean(r.get("is_primary_contact")),
            "phone": r.get("phone"), "mobile": r.get("mobile"), "type": r.get("type") or "JOB",
            "created_at": ts(r.get("created_at")) or "now()", "updated_at": ts(r.get("updated_at")) or "now()"})
    if auth_users:
        cols = list(auth_users[0].keys())
        out.append(f"-- auth.users: {len(auth_users)} logins (existing passwords kept)")
        for k in range(0, len(auth_users), 500):
            vals = ",\n".join("(" + ", ".join(lit(u[c]) for c in cols) + ")" for u in auth_users[k:k + 500])
            out.append(f"insert into auth.users ({', '.join(cols)}) values\n{vals}\non conflict (id) do nothing;")
        insert(out, "auth.identities", identities, "(provider_id, provider)")
    insert(out, "public.contacts", contacts)

    jobs = []
    for r in t.get("jobs", []):
        if r.get("company_id") not in co_ids or not as_uuid(r.get("service_mate_uuid")):
            warn(f"job {r['id']} skipped: missing company or service_mate_uuid")
            continue
        jobs.append({
            "id": job_ids[r["id"]], "legacy_id": r["id"], "company_id": co_ids[r["company_id"]],
            "service_mate_uuid": as_uuid(r["service_mate_uuid"]), "budget": r.get("budget"),
            "created_at": ts(r.get("created_at")) or "now()", "updated_at": ts(r.get("updated_at")) or "now()"})
    insert(out, "public.jobs", jobs, "")  # bare ON CONFLICT: also tolerates duplicate service_mate_uuid
    valid_jobs = {j["legacy_id"] for j in jobs}

    # one basket per company (keep the newest)
    baskets = {}
    for r in sorted(t.get("baskets", []), key=lambda r: str(r.get("updated_at") or "")):
        if r.get("company_id") in co_ids:
            baskets[r["company_id"]] = r
    insert(out, "public.baskets", [
        {"id": basket_ids[r["id"]], "legacy_id": r["id"], "company_id": co_ids[r["company_id"]],
         "created_at": ts(r.get("created_at")) or "now()", "updated_at": ts(r.get("updated_at")) or "now()"}
        for r in baskets.values()])
    # lines from a company's older/duplicate baskets are merged into the kept one
    basket_company = {r["id"]: r.get("company_id") for r in t.get("baskets", [])}
    kept_for = {r["id"]: baskets[basket_company[r["id"]]]["id"]
                for r in t.get("baskets", []) if basket_company[r["id"]] in baskets}
    insert(out, "public.basket_lines", [
        {"id": bl_ids[r["id"]], "legacy_id": r["id"], "basket_id": basket_ids[kept_for[r["basket_id"]]],
         "product_id": prod_ids[r["product_id"]],
         "created_at": ts(r.get("created_at")) or "now()", "updated_at": ts(r.get("updated_at")) or "now()"}
        for r in t.get("basket_lines", []) if r.get("basket_id") in kept_for and r.get("product_id") in valid_products])

    insert(out, "public.orders", [
        {"id": order_ids[r["id"]], "legacy_id": r["id"], "job_id": job_ids[r["job_id"]],
         "service_mate_note_uuid": as_uuid(r.get("service_mate_note_uuid")),
         "created_at": ts(r.get("created_at")) or "now()", "updated_at": ts(r.get("updated_at")) or "now()"}
        for r in t.get("orders", []) if r.get("job_id") in valid_jobs])
    valid_orders = {r["id"] for r in t.get("orders", []) if r.get("job_id") in valid_jobs}

    # order line snapshots (in_budget uses the company band at migration time)
    prod_by_id = {r["id"]: r for r in t.get("products", [])}
    job_company = {r["id"]: r.get("company_id") for r in t.get("jobs", [])}
    order_job = {r["id"]: r.get("job_id") for r in t.get("orders", [])}
    company_band = {r["id"]: band_value.get(r.get("price_band_id")) for r in t.get("companies", [])}
    lines = []
    for r in t.get("order_lines", []):
        if r.get("order_id") not in valid_orders:
            continue
        p = prod_by_id.get(r.get("product_id"), {})
        pband = band_value.get(p.get("price_band_id"))
        cband = company_band.get(job_company.get(order_job.get(r["order_id"])))
        lines.append({
            "id": ol_ids[r["id"]], "legacy_id": r["id"], "order_id": order_ids[r["order_id"]],
            "product_id": prod_ids.get(r.get("product_id")) if r.get("product_id") in valid_products else None,
            "sku": p.get("sku"), "name": p.get("name"), "price": p.get("price"), "price_band": pband,
            "in_budget": cband is not None and (pband is None or pband >= cband),
            "created_at": ts(r.get("created_at")) or "now()", "updated_at": ts(r.get("updated_at")) or "now()"})
    insert(out, "public.order_lines", lines)

    out.append("commit;")
    # 'now()' was emitted as a string literal; let Postgres evaluate it
    print("\n".join(out).replace("'now()'", "now()"))


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    main(sys.argv[1])
