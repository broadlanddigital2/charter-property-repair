-- Charter Property Repair: core tables (see core_schema for conventions)

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Catalogue
-- ---------------------------------------------------------------------------
create table public.price_bands (
  id          uuid primary key default gen_random_uuid(),
  legacy_id   bigint unique,
  band        integer not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table public.price_bands is
  'Price tiers. A product is "in budget" for a company when product.band >= company.band (or the product has no band).';

create table public.suppliers (
  id          uuid primary key default gen_random_uuid(),
  legacy_id   bigint unique,
  name        text not null check (char_length(name) <= 100),
  image       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  legacy_id   bigint unique,
  parent_id   uuid references public.categories(id) on delete cascade,
  name        text not null check (char_length(name) <= 255),
  image       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index categories_parent_id_idx on public.categories(parent_id);

create table public.products (
  id             uuid primary key default gen_random_uuid(),
  legacy_id      bigint unique,
  supplier_id    uuid not null references public.suppliers(id) on delete cascade,
  category_id    uuid not null references public.categories(id) on delete cascade,
  price_band_id  uuid references public.price_bands(id) on delete set null,
  sku            text not null check (char_length(sku) <= 100),
  name           text not null,
  manufacturer   text,
  description    text,
  image          text,
  price          integer,
  price_has_vat  boolean not null default false,
  miscellaneous  jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index products_category_id_idx   on public.products(category_id);
create index products_supplier_id_idx   on public.products(supplier_id);
create index products_price_band_id_idx on public.products(price_band_id);
create index products_name_trgm_idx     on public.products using gin (name extensions.gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- Customers (companies come from ServiceM8)
-- ---------------------------------------------------------------------------
create table public.companies (
  id                         uuid primary key default gen_random_uuid(),
  legacy_id                  bigint unique,
  service_mate_uuid          uuid unique,
  price_band_id              uuid references public.price_bands(id) on delete set null,
  name                       text not null,
  website                    text,
  abn_number                 text,
  address                    text,
  address_street             text,
  address_city               text,
  address_state              text,
  address_postcode           text,
  address_country            text,
  billing_address            text,
  active                     boolean not null default false,
  is_individual              boolean not null default false,
  badges                     text,
  fax_number                 text,
  tax_rate_uuid              uuid,
  custom_field_payment_terms text,
  parent_company_uuid        uuid,
  payment_terms              text,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now()
);
create index companies_price_band_id_idx on public.companies(price_band_id);

-- Contacts replace the legacy `users` table. A contact only gets a login
-- (auth.users row, linked via user_id) when an admin activates it.
create table public.contacts (
  id                  uuid primary key default gen_random_uuid(),
  legacy_id           bigint unique,
  user_id             uuid unique references auth.users(id) on delete set null,
  company_id          uuid references public.companies(id) on delete cascade,
  service_mate_uuid   uuid unique,
  name                text not null,
  email               extensions.citext not null unique,
  active              boolean not null default false,
  is_primary_contact  boolean not null default false,
  phone               text,
  mobile              text,
  type                text not null default 'JOB',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index contacts_company_id_idx on public.contacts(company_id);
comment on column public.contacts.type is 'ServiceM8 contact type (JOB, BILLING, PROPERTY MANAGER, ...) or ADMIN for back-office staff.';

create table public.jobs (
  id                 uuid primary key default gen_random_uuid(),
  legacy_id          bigint unique,
  company_id         uuid not null references public.companies(id) on delete cascade,
  service_mate_uuid  uuid not null unique,
  budget             integer,
  -- cached from ServiceM8 by the sync, for display only
  job_number         text,
  job_address        text,
  status             text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index jobs_company_id_idx on public.jobs(company_id);

-- ---------------------------------------------------------------------------
-- Basket & orders
-- ---------------------------------------------------------------------------
create table public.baskets (
  id          uuid primary key default gen_random_uuid(),
  legacy_id   bigint unique,
  company_id  uuid not null unique references public.companies(id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.basket_lines (
  id          uuid primary key default gen_random_uuid(),
  legacy_id   bigint unique,
  basket_id   uuid not null references public.baskets(id) on delete cascade,
  product_id  uuid not null references public.products(id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index basket_lines_basket_id_idx  on public.basket_lines(basket_id);
create index basket_lines_product_id_idx on public.basket_lines(product_id);

create table public.orders (
  id                      uuid primary key default gen_random_uuid(),
  legacy_id               bigint unique,
  job_id                  uuid not null references public.jobs(id) on delete cascade,
  service_mate_note_uuid  uuid,
  placed_by               uuid references public.contacts(id) on delete set null,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create index orders_job_id_idx on public.orders(job_id);
create index orders_placed_by_idx on public.orders(placed_by);

-- Order lines snapshot the product at order time, so order history survives
-- catalogue edits/deletions (legacy cascaded deletes wiped history).
create table public.order_lines (
  id             uuid primary key default gen_random_uuid(),
  legacy_id      bigint unique,
  order_id       uuid not null references public.orders(id) on delete cascade,
  product_id     uuid references public.products(id) on delete set null,
  sku            text,
  name           text,
  price          integer,
  price_band     integer,
  in_budget      boolean,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index order_lines_order_id_idx   on public.order_lines(order_id);
create index order_lines_product_id_idx on public.order_lines(product_id);

-- updated_at triggers
do $$
declare t text;
begin
  foreach t in array array['price_bands','suppliers','categories','products','companies',
                           'contacts','jobs','baskets','basket_lines','orders','order_lines']
  loop
    execute format('create trigger set_updated_at before update on public.%I
                    for each row execute function public.set_updated_at()', t);
  end loop;
end $$;
