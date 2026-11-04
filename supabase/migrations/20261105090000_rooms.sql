-- Rooms: break the catalogue down by the rooms a product can be used in.
-- Many-to-many (a product can work in several rooms). Rooms are assigned by
-- rules (supplier + category + optional name/description pattern), seeded from
-- ROOM_LIST_FOR_MATERIALS.xlsx, and admins can override a single product.

create table public.rooms (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name       text not null,
  sort       integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.rooms (slug, name, sort) values
  ('kitchen',          'Kitchen',               1),
  ('utility',          'Utility',               2),
  ('lounge',           'Lounge',                3),
  ('dining',           'Dining',                4),
  ('study',            'Study',                 5),
  ('bedroom',          'Bedroom',               6),
  ('bathroom',         'Bathroom',              7),
  ('ensuite',          'Ensuite',               8),
  ('wc',               'WC',                    9),
  ('other-reception',  'Other reception room', 10),
  ('external',         'External',             11),
  ('roof',             'Roof',                 12);

-- A rule matches products by supplier name, optionally by category name
-- (the product's own category or its parent), optionally by a
-- case-insensitive regex over name + description. Highest priority wins, then
-- the most specific (own category > parent category > any category).
create table public.room_rules (
  id           uuid primary key default gen_random_uuid(),
  supplier     text not null,
  category     text,
  name_pattern text,
  rooms        text[] not null default '{}',
  priority     integer not null default 0,
  origin       text not null default 'manual' check (origin in ('sheet','suggested','manual')),
  note         text,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index room_rules_supplier_idx on public.room_rules (lower(supplier));

alter table public.products add column rooms_manual boolean not null default false;

create table public.product_rooms (
  product_id uuid not null references public.products(id) on delete cascade,
  room_id    uuid not null references public.rooms(id) on delete cascade,
  primary key (product_id, room_id)
);
create index product_rooms_room_idx on public.product_rooms (room_id, product_id);

create trigger set_updated_at before update on public.rooms
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.room_rules
  for each row execute function public.set_updated_at();

alter table public.rooms         enable row level security;
alter table public.room_rules    enable row level security;
alter table public.product_rooms enable row level security;

do $$
declare t text;
begin
  foreach t in array array['rooms','room_rules','product_rooms'] loop
    execute format($f$create policy "%1$s: active users read" on public.%1$I
      for select to authenticated using ((select private.is_active_user()))$f$, t);
    execute format($f$create policy "%1$s: admins write" on public.%1$I
      for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()))$f$, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Rule engine
-- ---------------------------------------------------------------------------
create or replace function private.apply_room_rules(p_ids uuid[] default null)
returns integer
language plpgsql security definer set search_path = ''
as $$
declare v_n integer;
begin
  delete from public.product_rooms pr
  using public.products p
  where p.id = pr.product_id and not p.rooms_manual
    and (p_ids is null or p.id = any(p_ids));

  with cand as (
    select p.id pid, r.rooms,
           row_number() over (
             partition by p.id
             order by r.priority desc,
                      case when r.category is null then 0
                           when lower(r.category) = lower(c.name) then 2 else 1 end desc,
                      (r.name_pattern is not null) desc, r.created_at, r.id) rn
    from public.products p
    join public.suppliers s  on s.id = p.supplier_id
    join public.categories c on c.id = p.category_id
    left join public.categories par on par.id = c.parent_id
    join public.room_rules r
      on r.active and lower(r.supplier) = lower(s.name)
     and (r.category is null or lower(r.category) in (lower(c.name), lower(coalesce(par.name, ''))))
     and (r.name_pattern is null or (p.name || ' ' || coalesce(p.description, '')) ~* r.name_pattern)
    where not p.rooms_manual and (p_ids is null or p.id = any(p_ids))
  )
  insert into public.product_rooms (product_id, room_id)
  select cand.pid, rm.id
  from cand join public.rooms rm on rm.slug = any(cand.rooms)
  where cand.rn = 1
  on conflict do nothing;

  get diagnostics v_n = row_count;
  return v_n;
end;
$$;
revoke execute on function private.apply_room_rules(uuid[]) from public, anon, authenticated;

create or replace function private.products_rooms_trg()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  perform private.apply_room_rules(array(select id from new_rows where not rooms_manual));
  return null;
end;
$$;

create trigger products_rooms_ins after insert on public.products
  referencing new table as new_rows for each statement execute function private.products_rooms_trg();
create trigger products_rooms_upd after update on public.products
  referencing new table as new_rows for each statement execute function private.products_rooms_trg();

create or replace function private.room_rules_trg()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  perform private.apply_room_rules(null);
  return null;
end;
$$;
create trigger room_rules_changed after insert or update or delete on public.room_rules
  for each statement execute function private.room_rules_trg();

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------
create or replace function private.product_rooms_json(p_product uuid)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('slug', r.slug, 'name', r.name) order by r.sort), '[]')
  from public.product_rooms pr join public.rooms r on r.id = pr.room_id
  where pr.product_id = p_product
$$;

create or replace function private.product_json(p public.products, p_company_band integer)
returns jsonb
language sql stable set search_path = ''
as $$
  select private.legacy(to_jsonb(p))
    || jsonb_build_object(
         'miscellaneous', case when p.miscellaneous is null then null else p.miscellaneous::text end,
         'in_budget', case when public.is_in_budget(pb.band, p_company_band) then 1 else 0 end,
         'supplier',  (select private.legacy(to_jsonb(s)) from public.suppliers s where s.id = p.supplier_id),
         'category',  (select private.legacy(to_jsonb(c)) from public.categories c where c.id = p.category_id),
         'price_band', case when pb.id is null then null else private.legacy(to_jsonb(pb)) end,
         'rooms', private.product_rooms_json(p.id))
  from (select 1) _
  left join public.price_bands pb on pb.id = p.price_band_id
$$;

-- Rooms with product counts (sidebar / filters).
create or replace function public.api_rooms()
returns jsonb
language sql stable set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'guid', r.id, 'id', r.id, 'slug', r.slug, 'name', r.name, 'sort', r.sort,
           'products', (select count(*) from public.product_rooms pr where pr.room_id = r.id))
         order by r.sort), '[]')
  from public.rooms r
$$;
revoke execute on function public.api_rooms() from public, anon;
grant execute on function public.api_rooms() to authenticated;

-- Paged product list, now filterable by room ('none' = products with no room).
drop function if exists public.api_products_page(text, integer, integer);
create or replace function public.api_products_page(
  p_search text default null, p_page integer default 1, p_per_page integer default 10,
  p_room text default null
) returns jsonb
language plpgsql stable set search_path = ''
as $$
declare
  v_page  integer := greatest(coalesce(p_page, 1), 1);
  v_per   integer := least(greatest(coalesce(p_per_page, 10), 1), 100);
  v_q     text := nullif(btrim(coalesce(p_search, '')), '');
  v_room  text := nullif(btrim(coalesce(p_room, '')), '');
  v_band  integer := private.my_company_band();
  v_total integer;
  v_data  jsonb;
begin
  select count(*) into v_total
  from public.products p
  where (v_q is null or p.name ilike '%' || v_q || '%' or p.sku ilike '%' || v_q || '%')
    and (v_room is null
         or (v_room = 'none' and not exists (select 1 from public.product_rooms pr where pr.product_id = p.id))
         or exists (select 1 from public.product_rooms pr join public.rooms r on r.id = pr.room_id
                    where pr.product_id = p.id and r.slug = v_room));

  select coalesce(jsonb_agg(private.product_json(x, v_band) order by x.name, x.id), '[]') into v_data
  from (
    select p.* from public.products p
    where (v_q is null or p.name ilike '%' || v_q || '%' or p.sku ilike '%' || v_q || '%')
      and (v_room is null
           or (v_room = 'none' and not exists (select 1 from public.product_rooms pr where pr.product_id = p.id))
           or exists (select 1 from public.product_rooms pr join public.rooms r on r.id = pr.room_id
                      where pr.product_id = p.id and r.slug = v_room))
    order by p.name, p.id
    offset (v_page - 1) * v_per limit v_per
  ) x;

  return jsonb_build_object('total', v_total, 'page', v_page, 'per_page', v_per, 'data', v_data);
end;
$$;
revoke execute on function public.api_products_page(text, integer, integer, text) from public, anon;
grant execute on function public.api_products_page(text, integer, integer, text) to authenticated;

-- Admin override of one product's rooms. p_rooms = null resets to the rules.
create or replace function public.api_set_product_rooms(p_product uuid, p_rooms text[])
returns jsonb
language plpgsql security definer set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'Forbidden' using errcode = '42501';
  end if;
  if p_rooms is null then
    update public.products set rooms_manual = false where id = p_product;
    perform private.apply_room_rules(array[p_product]);
  else
    update public.products set rooms_manual = true where id = p_product;
    delete from public.product_rooms where product_id = p_product;
    insert into public.product_rooms (product_id, room_id)
    select p_product, r.id from public.rooms r where r.slug = any(p_rooms);
  end if;
  return jsonb_build_object('rooms', private.product_rooms_json(p_product),
    'rooms_manual', (select rooms_manual from public.products where id = p_product));
end;
$$;
revoke execute on function public.api_set_product_rooms(uuid, text[]) from public, anon;
grant execute on function public.api_set_product_rooms(uuid, text[]) to authenticated;
