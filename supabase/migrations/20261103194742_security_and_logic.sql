-- Access helpers, row-level security and business logic.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Who is calling?  (security definer so they can read contacts under RLS)
-- ---------------------------------------------------------------------------
create or replace function private.my_contact()
returns public.contacts
language sql stable security definer set search_path = ''
as $$
  select c.* from public.contacts c
  where c.user_id = auth.uid() and c.active
  limit 1
$$;

create or replace function private.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.contacts c
    where c.user_id = auth.uid() and c.active and upper(c.type) = 'ADMIN'
  )
$$;

create or replace function private.my_company_id()
returns uuid
language sql stable security definer set search_path = ''
as $$
  select c.company_id from public.contacts c
  where c.user_id = auth.uid() and c.active
  limit 1
$$;

create or replace function private.is_active_user()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.contacts c where c.user_id = auth.uid() and c.active)
$$;

-- Price band of the caller's company (null when none -> nothing is "in budget",
-- matching legacy BudgetService::isProductInBudget).
create or replace function private.my_company_band()
returns integer
language sql stable security definer set search_path = ''
as $$
  select pb.band
  from public.contacts c
  join public.companies co on co.id = c.company_id
  join public.price_bands pb on pb.id = co.price_band_id
  where c.user_id = auth.uid() and c.active
  limit 1
$$;

grant execute on all functions in schema private to authenticated, service_role;

-- Legacy rule: in budget when the company has a band AND
-- (product has no band OR product band >= company band).
create or replace function public.is_in_budget(product_band integer, company_band integer)
returns boolean
language sql immutable set search_path = ''
as $$
  select company_band is not null and (product_band is null or product_band >= company_band)
$$;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
alter table public.price_bands  enable row level security;
alter table public.suppliers    enable row level security;
alter table public.categories   enable row level security;
alter table public.products     enable row level security;
alter table public.companies    enable row level security;
alter table public.contacts     enable row level security;
alter table public.jobs         enable row level security;
alter table public.baskets      enable row level security;
alter table public.basket_lines enable row level security;
alter table public.orders       enable row level security;
alter table public.order_lines  enable row level security;

-- Catalogue: readable by any active user, writable by admins.
do $$
declare t text;
begin
  foreach t in array array['price_bands','suppliers','categories','products'] loop
    execute format($f$create policy "%1$s: active users read" on public.%1$I
      for select to authenticated using ((select private.is_active_user()))$f$, t);
    execute format($f$create policy "%1$s: admins write" on public.%1$I
      for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()))$f$, t);
  end loop;
end $$;

-- Companies
create policy "companies: own or admin read" on public.companies
  for select to authenticated
  using (id = (select private.my_company_id()) or (select private.is_admin()));
create policy "companies: admins write" on public.companies
  for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- Contacts
create policy "contacts: same company or admin read" on public.contacts
  for select to authenticated
  using (user_id = (select auth.uid())
         or company_id = (select private.my_company_id())
         or (select private.is_admin()));
create policy "contacts: admins write" on public.contacts
  for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- Jobs
create policy "jobs: own company or admin read" on public.jobs
  for select to authenticated
  using (company_id = (select private.my_company_id()) or (select private.is_admin()));
create policy "jobs: admins write" on public.jobs
  for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- Baskets: customers manage their own company's basket
create policy "baskets: own company or admin read" on public.baskets
  for select to authenticated
  using (company_id = (select private.my_company_id()) or (select private.is_admin()));
create policy "baskets: own company create" on public.baskets
  for insert to authenticated
  with check (company_id = (select private.my_company_id()) or (select private.is_admin()));
create policy "baskets: admins update/delete" on public.baskets
  for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy "basket_lines: own basket read" on public.basket_lines
  for select to authenticated
  using (exists (select 1 from public.baskets b where b.id = basket_id
                 and (b.company_id = (select private.my_company_id()) or (select private.is_admin()))));
create policy "basket_lines: own basket add" on public.basket_lines
  for insert to authenticated
  with check (exists (select 1 from public.baskets b where b.id = basket_id
                      and (b.company_id = (select private.my_company_id()) or (select private.is_admin()))));
create policy "basket_lines: own basket remove" on public.basket_lines
  for delete to authenticated
  using (exists (select 1 from public.baskets b where b.id = basket_id
                 and (b.company_id = (select private.my_company_id()) or (select private.is_admin()))));

-- Orders are created only by the place-order edge function (service role).
create policy "orders: own company or admin read" on public.orders
  for select to authenticated
  using (exists (select 1 from public.jobs j where j.id = job_id
                 and (j.company_id = (select private.my_company_id()) or (select private.is_admin()))));
create policy "orders: admins write" on public.orders
  for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy "order_lines: own company or admin read" on public.order_lines
  for select to authenticated
  using (exists (select 1 from public.orders o join public.jobs j on j.id = o.job_id
                 where o.id = order_id
                   and (j.company_id = (select private.my_company_id()) or (select private.is_admin()))));
create policy "order_lines: admins write" on public.order_lines
  for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- ---------------------------------------------------------------------------
-- Products with the caller's in_budget flag (0/1, as the frontend expects)
-- ---------------------------------------------------------------------------
create or replace view public.products_with_budget
with (security_invoker = on) as
select p.*,
       (case when public.is_in_budget(pb.band, (select private.my_company_band())) then 1 else 0 end) as in_budget
from public.products p
left join public.price_bands pb on pb.id = p.price_band_id;

grant select on public.products_with_budget to authenticated;

-- ---------------------------------------------------------------------------
-- Category helpers
-- ---------------------------------------------------------------------------
create or replace function public.category_descendant_ids(p_category_id uuid)
returns setof uuid
language sql stable set search_path = ''
as $$
  with recursive tree as (
    select id from public.categories where id = p_category_id
    union all
    select c.id from public.categories c join tree t on c.parent_id = t.id
  )
  select id from tree
$$;

-- Nested tree (legacy GET /category/search/tree hid the "Colours" root).
create or replace function private.category_node(p_id uuid)
returns jsonb
language plpgsql stable set search_path = ''
as $$
begin
  return (
    select jsonb_build_object(
      'guid', c.id, 'name', c.name, 'image', c.image,
      'created_at', c.created_at, 'updated_at', c.updated_at,
      'children', coalesce((
        select jsonb_agg(private.category_node(ch.id) order by ch.name)
        from public.categories ch where ch.parent_id = c.id
      ), '[]'::jsonb)
    )
    from public.categories c where c.id = p_id
  );
end;
$$;
grant execute on function private.category_node(uuid) to authenticated;

create or replace function public.category_tree()
returns jsonb
language sql stable set search_path = ''
as $$
  select coalesce(jsonb_agg(private.category_node(c.id) order by c.name), '[]'::jsonb)
  from public.categories c
  where c.parent_id is null and c.name <> 'Colours'
$$;

-- ---------------------------------------------------------------------------
-- Budget for a basket against a job (legacy BudgetService::calculateBudget)
-- ---------------------------------------------------------------------------
create or replace function public.basket_budget(p_basket_id uuid, p_job_id uuid)
returns jsonb
language plpgsql stable set search_path = ''
as $$
declare
  v_budget        integer;
  v_company_band  integer := private.my_company_band();
  v_in            bigint := 0;
  v_out           bigint := 0;
  v_to_pay        bigint;
begin
  -- RLS on jobs/baskets limits this to the caller's own records
  select j.budget into v_budget from public.jobs j where j.id = p_job_id;
  if not found then
    return null;
  end if;

  -- previous orders on this job (snapshotted at order time)
  select coalesce(sum(ol.price) filter (where ol.in_budget), 0),
         coalesce(sum(ol.price) filter (where not coalesce(ol.in_budget, false)), 0)
    into v_in, v_out
  from public.order_lines ol
  join public.orders o on o.id = ol.order_id
  where o.job_id = p_job_id;

  -- current basket
  select v_in  + coalesce(sum(p.price) filter (where public.is_in_budget(pb.band, v_company_band)), 0),
         v_out + coalesce(sum(p.price) filter (where not public.is_in_budget(pb.band, v_company_band)), 0)
    into v_in, v_out
  from public.basket_lines bl
  join public.products p on p.id = bl.product_id
  left join public.price_bands pb on pb.id = p.price_band_id
  where bl.basket_id = p_basket_id;

  if coalesce(v_budget, 0) < v_in then
    v_to_pay := v_in - coalesce(v_budget, 0) + v_out;
  else
    v_to_pay := v_out;
  end if;

  return jsonb_build_object(
    'budget', v_budget,
    'total_in_budget', v_in,
    'total_out_of_budget', v_out,
    'total_remaning_budget', coalesce(v_budget, 0) - v_in,  -- key spelling kept for frontend compatibility
    'customer_to_pay', v_to_pay
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Turn a company's basket into an order (called by the place-order function
-- after the ServiceM8 note succeeds; service role only).
-- ---------------------------------------------------------------------------
create or replace function private.create_order_from_basket(
  p_contact_id uuid, p_job_id uuid, p_note_uuid uuid
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_company_id  uuid;
  v_band        integer;
  v_basket_id   uuid;
  v_order_id    uuid;
begin
  select c.company_id into v_company_id
  from public.contacts c where c.id = p_contact_id and c.active;
  if v_company_id is null then
    raise exception 'Contact not found or inactive';
  end if;

  if not exists (select 1 from public.jobs j where j.id = p_job_id and j.company_id = v_company_id) then
    raise exception 'Job does not belong to this company';
  end if;

  select b.id into v_basket_id from public.baskets b where b.company_id = v_company_id;
  if v_basket_id is null or not exists (select 1 from public.basket_lines where basket_id = v_basket_id) then
    raise exception 'Basket is empty';
  end if;

  select pb.band into v_band
  from public.companies co join public.price_bands pb on pb.id = co.price_band_id
  where co.id = v_company_id;

  insert into public.orders (job_id, service_mate_note_uuid, placed_by)
  values (p_job_id, p_note_uuid, p_contact_id)
  returning id into v_order_id;

  insert into public.order_lines (order_id, product_id, sku, name, price, price_band, in_budget)
  select v_order_id, p.id, p.sku, p.name, p.price, pb.band, public.is_in_budget(pb.band, v_band)
  from public.basket_lines bl
  join public.products p on p.id = bl.product_id
  left join public.price_bands pb on pb.id = p.price_band_id
  where bl.basket_id = v_basket_id;

  delete from public.basket_lines where basket_id = v_basket_id;

  return v_order_id;
end;
$$;
revoke execute on function private.create_order_from_basket(uuid, uuid, uuid) from public, authenticated;
grant execute on function private.create_order_from_basket(uuid, uuid, uuid) to service_role;

-- Expose to the edge function via a thin public wrapper (service role only)
create or replace function public.create_order_from_basket(
  p_contact_id uuid, p_job_id uuid, p_note_uuid uuid
) returns uuid
language sql security definer set search_path = ''
as $$ select private.create_order_from_basket(p_contact_id, p_job_id, p_note_uuid) $$;
revoke execute on function public.create_order_from_basket(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.create_order_from_basket(uuid, uuid, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Storage: public image bucket, admin-managed
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('images', 'images', true, 2097152, array['image/jpeg','image/png','image/webp','image/gif','image/svg+xml'])
on conflict (id) do nothing;

create policy "images: admins upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'images' and (select private.is_admin()));
create policy "images: admins update" on storage.objects
  for update to authenticated
  using (bucket_id = 'images' and (select private.is_admin()));
create policy "images: admins delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'images' and (select private.is_admin()));
