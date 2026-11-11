# Charter Property Repair — insurance replacement-products portal

Rebuild of the legacy Docker/Laravel/MySQL stack
(`insurance.broadlanddigital.co.uk`, `insurance-admin…`, `insurance-api…`,
`servicem8.broadlanddigital.co.uk`) on **Supabase + Cloudflare Workers**.

```
apps/portal     Customer portal (Next.js static export → Cloudflare Worker)
apps/admin      Back-office admin  (Next.js static export → Cloudflare Worker)
supabase/
  migrations/   Postgres schema, RLS, business logic, cron
  functions/    Edge functions (Deno)
scripts/migrate MySQL dump → Supabase import
```

| Legacy | New |
|---|---|
| Laravel API + MySQL (`insurance-api`) | Supabase Postgres + RLS + SQL functions; no separate API server |
| Sanctum tokens, `users` table | Supabase Auth + `public.contacts` (contact gets a login when activated) |
| `BudgetService` (PHP) | `is_in_budget()`, `basket_budget()` (SQL) |
| `POST /api/order` + ServiceM8 note | `place-order` edge function |
| `app:customer-import`, `app:user-import`, `app:job-import` (manual) | `servicem8-sync` `customers` mode, hourly via pg_cron |
| Python FastAPI `servicem8` service + MySQL | `servicem8-sync` `reporting` mode (nightly) + `reporting-api` |
| Cloudflare Images uploads | Supabase Storage `images` bucket (existing imagedelivery.net URLs keep working) |
| Bitbucket Pipelines → SSH `docker compose` | GitHub Actions → `wrangler deploy` + `supabase db push / functions deploy` |

## Supabase project

* Project: **Charter Property Repair** — ref `gnnabvwdlpsxmdgvthpi` (eu-west-2, Broadland Digital org)
* URL: `https://gnnabvwdlpsxmdgvthpi.supabase.co`

### Data model
`price_bands`, `suppliers`, `categories` (tree), `products`, `companies`,
`contacts`, `jobs`, `baskets` (one per company), `basket_lines`, `orders`,
`order_lines` (snapshot of sku/name/price/band at order time),
`sync_runs`; reporting tables in the unexposed `reporting` schema.
Primary keys are uuids equal to the legacy `guid`; `legacy_id` keeps the old integer id.

### Access rules (RLS)
* Catalogue (products, categories, suppliers, price bands): any **active** user can read; admins write.
* Companies, contacts, jobs, baskets, orders: customers see **only their own company**; admins see all.
* Orders are only created by `place-order` (service role) — customers can't forge them.
* Admin = active contact with `type = 'ADMIN'`.

### Budget rule (unchanged from legacy)
A product is *Included in Budget* when the company has a price band and the
product has no band or `product.band >= company.band`. For a job:
`customer_to_pay = total_in_budget > budget ? total_in_budget − budget + total_out_of_budget : total_out_of_budget`,
including lines from previous orders on that job.

### Edge functions
| Function | Auth | Purpose |
|---|---|---|
| `place-order` | user JWT | Basket → ServiceM8 job note → order + lines, clears basket |
| `admin-users` | admin JWT | Create/update contacts, activate (invite / reset email), deactivate |
| `servicem8-sync` | `x-cron-secret` or admin JWT | `customers` (hourly :17) and `reporting` (02:43 UTC) |
| `reporting-api` | `x-api-key` or admin JWT | `GET …/reporting-api/job-data`, `…/queue-data` |

### Configuration
Non-secret settings and internally generated secrets live in `private.app_config`
(only readable by the service role):

| key | |
|---|---|
| `PORTAL_URL`, `ADMIN_URL` | used for invite / reset-password redirects |
| `SERVICEM8_NOTES_ENABLED` | `false` on staging so test orders don't post notes to live jobs; set `true` at go-live |
| `CRON_SECRET`, `REPORTING_API_KEY` | generated in-database |
| `BETTERSTACK_HEARTBEAT_URL` | optional, pinged after the nightly reporting sync |

```sql
update private.app_config set value = 'true' where key = 'SERVICEM8_NOTES_ENABLED';
select value from private.app_config where key = 'REPORTING_API_KEY';   -- give this to the report consumer
```

Edge-function **secrets** (Dashboard → Edge Functions → Secrets):
`SERVICEM8_API_KEY` *(or `SERVICEM8_USERNAME` + `SERVICEM8_PASSWORD`)*.

Auth settings (Dashboard → Authentication):
* **URL configuration** — Site URL = portal URL; redirect URLs = `<portal>/reset-password`, `<admin>/reset-password`
* **SMTP** — configure a real SMTP sender (the built-in one only emails team members, 2/hour). Needed for activation & reset emails.
* Optionally edit the *Invite* and *Reset password* email templates.

## Frontends
Both apps are the original screens; only the data layer changed
(`services/requestService.ts` keeps the same function names/shapes, backed by
`services/supabase.ts`). Read endpoints are SQL RPCs (`api_me`, `api_products_by_category`,
`api_basket`, `api_order`, …) returning the legacy JSON shapes.

Changes vs legacy behaviour:
* Dashboard lists the company's open claims (jobs without an order) — legacy was hard-coded to one demo job.
* `/product/<guid>` → `/product?guid=<guid>`, `/reset-password/<token>` → `/reset-password` (static export).
* Customer portal gained the missing `/forgot-password` page.
* Comparison list fetches only the compared products (legacy downloaded the whole catalogue).
* Address lookup uses the Broadland Digital CRM postcode service (Royal Mail PAF) instead of Ideal Postcodes; browser key in `NEXT_PUBLIC_POSTCODE_LOOKUP_KEY` (repo variable `POSTCODE_LOOKUP_KEY`).

```bash
cd apps/portal   # or apps/admin
cp .env.example .env.local
npm install && npm run dev
```

## Deploy
GitHub Actions (`.github/workflows/deploy.yml`) on push to `main`:
builds both apps and `wrangler deploy`s them, then `supabase db push` + `functions deploy`.

Repository **variable** `POSTCODE_LOOKUP_KEY` (Settings → Secrets and variables → Actions → Variables): CRM postcode browser key.

Repository secrets:

| Secret | Used for |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Workers deploy (template "Edit Cloudflare Workers" + Zone:DNS edit on broadlanddigital.co.uk) |
| `CLOUDFLARE_ACCOUNT_ID` | Workers deploy |
| `SUPABASE_ACCESS_TOKEN` | `supabase` CLI (personal access token) |
| `SUPABASE_DB_PASSWORD` | `supabase link` |
| `SUPABASE_DB_URL` | `supabase db push` — the **Session pooler** connection string (Dashboard → Connect), password filled in. Runners have no IPv6, so the direct host doesn't work |

Staging hosts (custom domains on the Workers):
`insurance-staging.broadlanddigital.co.uk`, `insurance-admin-staging.broadlanddigital.co.uk`.

## Data migration

**Dev / no server access — from the old API (GitHub Actions):**
add repo secrets `LEGACY_ADMIN_EMAIL` / `LEGACY_ADMIN_PASSWORD` (an active ADMIN on the old system), then
Actions → *Import legacy data (from old API)* → Run workflow. Unticked = dry run (rolled back, prints counts);
tick **apply** to keep. Loads price bands, suppliers, categories, products, company bands, extra contacts,
job budgets and orders (`scripts/migrate/legacy_api_import.py`). Passwords and baskets aren't exposed by the API.

**Full cutover — from a MySQL dump:**
```bash
mysqldump --single-transaction -h <host> -u <user> -p <db> > legacy.sql
python3 scripts/migrate/mysql_to_supabase.py legacy.sql > import.sql
psql "postgresql://postgres:<password>@db.gnnabvwdlpsxmdgvthpi.supabase.co:5432/postgres" \
     -v ON_ERROR_STOP=1 -f import.sql
```
Idempotent and transactional. Active users keep their passwords (Laravel bcrypt
hashes are imported into Supabase Auth); inactive users are imported as contacts
and get an invite when an admin activates them.

### Cutover checklist
1. Freeze orders on the legacy portal; take the dump; run the import.
2. Set ServiceM8 secret; run `servicem8-sync` (`customers`, then `reporting`) once.
3. `update private.app_config` → production `PORTAL_URL` / `ADMIN_URL`, `SERVICEM8_NOTES_ENABLED = true`.
4. Point `insurance.` / `insurance-admin.` at the Workers (change `routes` in each `wrangler.jsonc`), update Auth URL settings.
5. Repoint the reporting consumer to `…/functions/v1/reporting-api/job-data` with the new `x-api-key`.
6. Retire the Docker host; rotate the leaked TLS key and BetterStack heartbeat; cancel the Ideal Postcodes key.

## Not ported
* Supplier CSV importers (`ImportHowdensProducts`, `DuluxImporter`, price-band importers, …) — one-off loads whose data arrives via the migration. Re-add as an admin CSV import if new supplier feeds are expected.
* `SyncProductsToCloudflare` / `CacheWarmer` — image hosting no longer needs them.

## Rooms

Products are tagged with the rooms they can be used in (many-to-many, `product_rooms`).
Rooms come from **rules** in `room_rules`: supplier + category (own or parent) + optional
regex on name/description, with highest `priority` winning. The rules were seeded from
`scripts/rooms/ROOM_LIST_FOR_MATERIALS.xlsx` (`origin = 'sheet'`, generated by
`scripts/rooms/sheet_to_rules.py`) plus `suggested` rules for categories the sheet doesn't
cover. Triggers re-apply rules whenever products or rules change. An admin can pin a
product's rooms (`products.rooms_manual`), which rules then leave alone.

- Admin › Rooms: room counts and the editable rules matrix.
- Admin › Products: room filter chips (incl. "No room"), room badges, per-product override.
- RPCs: `api_rooms`, `api_set_product_rooms`, `api_products_page(..., p_room)`; product JSON carries `rooms`.

## Claims workflow (added Nov 2026)
1. **ServiceM8** — claim raised as a job against the client company; hourly sync brings it in.
2. **Admin › Claims** (tabs: Not activated / Activated / Open / Ordered / All; open = not Completed/Unsuccessful in ServiceM8):
   set **budget** (£, local — sync never overwrites), tick **rooms** (`job_rooms`: quantity + notes),
   add **claim users** (search existing contacts or create new → `contacts` type `CLAIMANT` under the claim's company,
   linked via `job_contacts`). **Activate claim & email user** (only shown once a user is attached) →
   `admin-users` `activate_claim`: creates a passwordless login, marks the contact active, sends the
   Supabase *Magic Link* email (link to `<portal>/claim-login` + 6-digit code), sets `jobs.activated_at`.
   Active users show a **Deactivate** button.
3. **Portal** — claim users sign in at `/claim-login` (email → 6-digit code; staff keep passwords).
   Dashboard → `/claim?job=` (rooms with progress + budget bar) → `/claim-room` (the room's **items**
   as steps; search that item's products; add with quantity; next item) → `/claim?job=&review=1` → Place order.
4. **Order** — `place-order` takes that claim's lines (with quantity, room, item) and posts the ServiceM8 note
   (disabled on staging).

**Room items**: each product in a room has an `item` (`product_rooms.item`) = the tagging rule's
`room_rules.item_name` (editable in Admin › Rooms) or a grouping of its category (`private.default_item`).
**Selections** are `basket_lines` with `job_id`, `room_id`, `item`, `quantity`; budget and orders are per claim
and count quantities. RPCs: `api_claim_view`, `api_item_products`, `api_set_selection`, `api_claim_selection`;
admin: `api_claims_page`, `api_set_claim`, `api_claim_add_user`, `api_claim_remove_user`, `api_search_contacts`.

**Access**: a claimant sees only claims linked in `job_contacts`, their own basket (`baskets.contact_id`) and those
claims' orders; company users share the company basket (`contact_id is null`). Policies use per-query
`(select private.is_admin())`-style checks — a per-row function made a full jobs scan take 4s.

**Email template**: paste `supabase/templates/magic_link.html` into Authentication › Emails › *Magic Link* and
*Confirm signup* (the CI token can't change auth config). Check Site URL = portal URL and SMTP rate limits.

**Test data (staging only)**: company "ZZ TEST – Claims Sandbox (not in ServiceM8)" with claims TEST-001/TEST-002;
`justin@broadlanddigital.co.uk` is attached to it. Delete both at cutover.
