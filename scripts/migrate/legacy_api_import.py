#!/usr/bin/env python3
"""
Export the catalogue, price bands, company bands, job budgets and orders from
the legacy Laravel API (insurance-api.broadlanddigital.co.uk) and write a
Postgres script that loads them into the Supabase project.

Use this when there is no access to the legacy MySQL server (for a full
migration including passwords, use mysql_to_supabase.py on a mysqldump).

    LEGACY_ADMIN_EMAIL=... LEGACY_ADMIN_PASSWORD=... \
      python3 legacy_api_import.py > import.sql            # BEGIN ... COMMIT
    python3 legacy_api_import.py --dry-run > import.sql   # BEGIN ... ROLLBACK
    psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f import.sql

What it loads
  * price bands, suppliers, categories (full tree), products  — legacy guids kept as ids
  * company price bands  — matched to the ServiceM8-synced companies by service_mate_uuid
                           (companies missing from the sync are inserted)
  * contacts  — any not already synced are added (inactive; activate from the admin to send an invite)
  * job budgets — matched by service_mate_uuid
  * orders + order lines — lines snapshot the product's sku/name/price/band
Not available through the API: passwords and basket contents.

Standard library only. Progress goes to stderr; only SQL goes to stdout.
"""
from __future__ import annotations

import json
import os
import secrets
import sys
import time
import urllib.error
import urllib.request

BASE = os.environ.get("LEGACY_API_URL", "https://insurance-api.broadlanddigital.co.uk").rstrip("/") + "/api"
MIN_GAP = 1.1  # legacy API is throttled to 60 requests/minute
_last = 0.0
TOKEN = None


def log(*a):
    print(*a, file=sys.stderr, flush=True)


def call(method: str, path: str, body: dict | None = None):
    global _last
    for attempt in range(1, 8):
        wait = _last + MIN_GAP - time.time()
        if wait > 0:
            time.sleep(wait)
        _last = time.time()
        req = urllib.request.Request(BASE + path, method=method,
                                     data=json.dumps(body).encode() if body is not None else None)
        req.add_header("Accept", "application/json")
        req.add_header("Content-Type", "application/json")
        req.add_header("User-Agent", "cpr-legacy-export/1.0")
        if TOKEN:
            req.add_header("Authorization", f"Bearer {TOKEN}")
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                return json.loads(r.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            if e.code == 429 or e.code >= 500:
                retry = int(e.headers.get("Retry-After") or 0) or 10 * attempt
                log(f"  {path}: HTTP {e.code}, retrying in {retry}s")
                time.sleep(retry)
                continue
            raise SystemExit(f"{method} {path} failed: HTTP {e.code} {e.read()[:300]!r}")
    raise SystemExit(f"{method} {path} kept failing")


def walk_tree(nodes, parent=None, out=None):
    out = {} if out is None else out
    for n in nodes or []:
        out[n["guid"]] = parent
        walk_tree(n.get("children"), n["guid"], out)
    return out


def main():
    global TOKEN
    dry = "--dry-run" in sys.argv
    email, password = os.environ.get("LEGACY_ADMIN_EMAIL"), os.environ.get("LEGACY_ADMIN_PASSWORD")
    if not email or not password:
        raise SystemExit("Set LEGACY_ADMIN_EMAIL and LEGACY_ADMIN_PASSWORD")

    log("Logging in to the legacy API…")
    TOKEN = call("POST", "/auth/login-as-admin", {"email": email, "password": password}).get("token")
    if not TOKEN:
        raise SystemExit("Login failed (is the account an active ADMIN?)")

    log("Fetching price bands, suppliers, categories…")
    bands = call("GET", "/price-band").get("price_bands", [])
    suppliers = call("GET", "/supplier").get("suppliers", [])
    categories = call("GET", "/category").get("categories", [])
    parent_of = walk_tree(call("GET", "/category/search/tree").get("category_trees", []))
    # the tree endpoint hides the "Colours" root; fetch its subtree separately
    for c in categories:
        if c["guid"] not in parent_of:
            detail = call("GET", f"/category/{c['guid']}").get("category") or {}
            parent_of.setdefault(c["guid"], None)
            walk_tree(detail.get("children"), c["guid"], parent_of)

    log("Fetching products (one large request)…")
    products = call("GET", "/product").get("products", [])
    log("Fetching companies, jobs, orders…")
    companies = call("GET", "/company").get("companies", [])
    jobs = call("GET", "/job").get("jobs", [])
    orders = call("GET", "/order").get("orders", [])
    log(f"  {len(orders)} orders; fetching their lines…")
    order_lines = []
    for i, o in enumerate(orders, 1):
        d = call("GET", f"/order/{o['guid']}").get("order") or {}
        for ln in d.get("order_lines") or []:
            order_lines.append({"guid": ln.get("guid"), "order_guid": o["guid"],
                                "product_guid": (ln.get("product") or {}).get("guid"),
                                "created_at": ln.get("created_at")})
        if i % 25 == 0:
            log(f"  {i}/{len(orders)}")

    # ---- shape the rows -------------------------------------------------
    def misc(v):
        if v in (None, ""):
            return None
        if isinstance(v, str):
            try:
                return json.loads(v)
            except ValueError:
                return {"raw": v}
        return v

    data = {
        "bands": [{"id": b["guid"], "band": b["band"], "created_at": b.get("created_at")} for b in bands],
        "suppliers": [{"id": s["guid"], "name": s["name"], "image": s.get("image"), "created_at": s.get("created_at")} for s in suppliers],
        "categories": [{"id": c["guid"], "parent_id": parent_of.get(c["guid"]), "name": c["name"],
                        "image": c.get("image"), "created_at": c.get("created_at")} for c in categories],
        "products": [{
            "id": p["guid"], "supplier_id": (p.get("supplier") or {}).get("guid"),
            "category_id": (p.get("category") or {}).get("guid"),
            "price_band_id": (p.get("price_band") or {}).get("guid"),
            "sku": (p.get("sku") or "")[:100], "name": p.get("name"), "manufacturer": p.get("manufacturer"),
            "description": p.get("description"), "image": p.get("image"), "price": p.get("price"),
            "price_has_vat": bool(int(p.get("price_has_vat") or 0)), "miscellaneous": misc(p.get("miscellaneous")),
            "created_at": p.get("created_at")} for p in products],
        "companies": [{
            "legacy_guid": c["guid"], "service_mate_uuid": c.get("service_mate_uuid"), "name": c.get("name"),
            "price_band_id": (c.get("price_bands") or {}).get("guid"),
            "active": bool(int(c.get("active") or 0)), "is_individual": bool(int(c.get("is_individual") or 0)),
            **{k: c.get(k) for k in ["website", "address", "address_street", "address_city", "address_state",
                                     "address_postcode", "address_country", "billing_address", "payment_terms"]},
        } for c in companies],
        "contacts": [{
            "legacy_guid": u.get("guid"), "company_service_mate_uuid": c.get("service_mate_uuid"),
            "company_legacy_guid": c["guid"], "name": u.get("name"), "email": (u.get("email") or "").strip(),
            "type": u.get("type") or "JOB", "is_primary_contact": bool(int(u.get("is_primary_contact") or 0)),
            "phone": u.get("phone"), "mobile": u.get("mobile"),
        } for c in companies for u in (c.get("contacts") or []) if u.get("email")],
        "jobs": [{"legacy_guid": j["guid"], "service_mate_uuid": j.get("service_mate_uuid"), "budget": j.get("budget")} for j in jobs],
        "orders": [{"id": o["guid"], "job_service_mate_uuid": (o.get("job") or {}).get("service_mate_uuid"),
                    "service_mate_note_uuid": o.get("service_mate_note_uuid"), "created_at": o.get("created_at")} for o in orders],
        "order_lines": order_lines,
    }
    log("Exported: " + ", ".join(f"{k}={len(v)}" for k, v in data.items()))

    # ---- SQL ----------------------------------------------------------------
    tag = "j" + secrets.token_hex(6)
    lit = lambda v: f"${tag}${json.dumps(v)}${tag}$::jsonb"
    print("-- generated by scripts/migrate/legacy_api_import.py")
    print("begin;")
    print("create temp table _src (k text primary key, v jsonb) on commit drop;")
    for k, v in data.items():
        print(f"insert into _src values ('{k}', {lit(v)});")
    print(IMPORT_SQL)
    print("rollback;" if dry else "commit;")


IMPORT_SQL = r"""
-- price bands, suppliers, categories, products (legacy guid = id)
insert into public.price_bands (id, band, created_at)
select r.id, r.band, coalesce(r.created_at, now())
from jsonb_to_recordset((select v from _src where k = 'bands')) r(id uuid, band int, created_at timestamptz)
on conflict (id) do update set band = excluded.band;

insert into public.suppliers (id, name, image, created_at)
select r.id, r.name, r.image, coalesce(r.created_at, now())
from jsonb_to_recordset((select v from _src where k = 'suppliers')) r(id uuid, name text, image text, created_at timestamptz)
on conflict (id) do update set name = excluded.name, image = excluded.image;

-- categories: insert flat, then set parents (avoids ordering issues)
insert into public.categories (id, name, image, created_at)
select r.id, r.name, r.image, coalesce(r.created_at, now())
from jsonb_to_recordset((select v from _src where k = 'categories')) r(id uuid, name text, image text, created_at timestamptz)
on conflict (id) do update set name = excluded.name, image = excluded.image;
update public.categories c set parent_id = r.parent_id
from jsonb_to_recordset((select v from _src where k = 'categories')) r(id uuid, parent_id uuid)
where c.id = r.id and r.parent_id is distinct from c.parent_id
  and exists (select 1 from public.categories p where p.id = r.parent_id);

insert into public.products (id, supplier_id, category_id, price_band_id, sku, name, manufacturer, description,
                             image, price, price_has_vat, miscellaneous, created_at)
select r.id, r.supplier_id, r.category_id, pb.id, r.sku, r.name, r.manufacturer, r.description,
       r.image, r.price, coalesce(r.price_has_vat, false), r.miscellaneous, coalesce(r.created_at, now())
from jsonb_to_recordset((select v from _src where k = 'products'))
     r(id uuid, supplier_id uuid, category_id uuid, price_band_id uuid, sku text, name text, manufacturer text,
       description text, image text, price int, price_has_vat boolean, miscellaneous jsonb, created_at timestamptz)
left join public.price_bands pb on pb.id = r.price_band_id
where exists (select 1 from public.suppliers s where s.id = r.supplier_id)
  and exists (select 1 from public.categories c where c.id = r.category_id)
on conflict (id) do update set
  supplier_id = excluded.supplier_id, category_id = excluded.category_id, price_band_id = excluded.price_band_id,
  sku = excluded.sku, name = excluded.name, manufacturer = excluded.manufacturer, description = excluded.description,
  image = excluded.image, price = excluded.price, price_has_vat = excluded.price_has_vat, miscellaneous = excluded.miscellaneous;

-- companies: set band on synced companies; insert any the sync doesn't have
create temp table _co on commit drop as
select * from jsonb_to_recordset((select v from _src where k = 'companies'))
  r(legacy_guid uuid, service_mate_uuid uuid, name text, price_band_id uuid, active boolean, is_individual boolean,
    website text, address text, address_street text, address_city text, address_state text, address_postcode text,
    address_country text, billing_address text, payment_terms text);

update public.companies c set price_band_id = co.price_band_id, active = co.active
from _co co
where c.service_mate_uuid = co.service_mate_uuid
  and exists (select 1 from public.price_bands pb where pb.id = co.price_band_id or co.price_band_id is null);

insert into public.companies (id, service_mate_uuid, name, price_band_id, active, is_individual, website, address,
  address_street, address_city, address_state, address_postcode, address_country, billing_address, payment_terms)
select co.legacy_guid, co.service_mate_uuid, coalesce(co.name, 'Unnamed'), pb.id, co.active, co.is_individual,
  co.website, co.address, co.address_street, co.address_city, co.address_state, co.address_postcode,
  co.address_country, co.billing_address, co.payment_terms
from _co co
left join public.price_bands pb on pb.id = co.price_band_id
where not exists (select 1 from public.companies c where c.service_mate_uuid = co.service_mate_uuid)
on conflict do nothing;

-- contacts not already present (by email); inactive until an admin activates them
insert into public.contacts (id, company_id, name, email, type, is_primary_contact, phone, mobile, active)
select coalesce(r.legacy_guid, gen_random_uuid()),
       (select c.id from public.companies c where c.service_mate_uuid = r.company_service_mate_uuid or c.id = r.company_legacy_guid limit 1),
       coalesce(r.name, r.email), r.email, r.type, coalesce(r.is_primary_contact, false), r.phone, r.mobile, false
from jsonb_to_recordset((select v from _src where k = 'contacts'))
     r(legacy_guid uuid, company_service_mate_uuid uuid, company_legacy_guid uuid, name text, email text, type text,
       is_primary_contact boolean, phone text, mobile text)
where r.email <> '' and not exists (select 1 from public.contacts x where lower(x.email) = lower(r.email))
on conflict do nothing;

-- job budgets
update public.jobs j set budget = r.budget
from jsonb_to_recordset((select v from _src where k = 'jobs')) r(legacy_guid uuid, service_mate_uuid uuid, budget int)
where j.service_mate_uuid = r.service_mate_uuid and r.budget is not null;

-- orders (only where the job is known) + snapshotted lines
insert into public.orders (id, job_id, service_mate_note_uuid, created_at)
select r.id, j.id, r.service_mate_note_uuid, coalesce(r.created_at, now())
from jsonb_to_recordset((select v from _src where k = 'orders'))
     r(id uuid, job_service_mate_uuid uuid, service_mate_note_uuid uuid, created_at timestamptz)
join public.jobs j on j.service_mate_uuid = r.job_service_mate_uuid
on conflict (id) do nothing;

insert into public.order_lines (id, order_id, product_id, sku, name, price, price_band, in_budget, created_at)
select coalesce(r.guid, gen_random_uuid()), o.id, p.id, p.sku, p.name, p.price, pb.band,
       public.is_in_budget(pb.band, cb.band), coalesce(r.created_at, now())
from jsonb_to_recordset((select v from _src where k = 'order_lines'))
     r(guid uuid, order_guid uuid, product_guid uuid, created_at timestamptz)
join public.orders o on o.id = r.order_guid
join public.jobs j on j.id = o.job_id
join public.companies co on co.id = j.company_id
left join public.price_bands cb on cb.id = co.price_band_id
left join public.products p on p.id = r.product_guid
left join public.price_bands pb on pb.id = p.price_band_id
on conflict (id) do nothing;

-- summary (no personal data)
select 'price_bands' t, count(*) from public.price_bands union all
select 'suppliers', count(*) from public.suppliers union all
select 'categories', count(*) from public.categories union all
select 'products', count(*) from public.products union all
select 'companies_with_band', count(*) from public.companies where price_band_id is not null union all
select 'contacts', count(*) from public.contacts union all
select 'jobs_with_budget', count(*) from public.jobs where budget is not null union all
select 'orders', count(*) from public.orders union all
select 'order_lines', count(*) from public.order_lines;
"""

if __name__ == "__main__":
    main()
