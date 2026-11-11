-- Claim users & activation.
-- A claim (job) can have one or more claim users (contacts with type CLAIMANT,
-- stored under the claim's company so they appear in Users). When an admin
-- activates the claim they get an email and sign in with a 6-digit code.
-- A claimant only ever sees the claims they are linked to, their own basket
-- and their own claims' orders — never the rest of the company's data.

create table public.job_contacts (
  job_id     uuid not null references public.jobs(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  invited_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (job_id, contact_id)
);
create index job_contacts_contact_idx on public.job_contacts (contact_id);

alter table public.jobs add column activated_at timestamptz;

-- claimants get a personal basket instead of the shared company basket
alter table public.baskets add column contact_id uuid references public.contacts(id) on delete cascade;
alter table public.baskets drop constraint if exists baskets_company_id_key;
create unique index baskets_company_shared_uq on public.baskets (company_id) where contact_id is null;
create unique index baskets_contact_uq on public.baskets (contact_id) where contact_id is not null;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function private.my_contact_id()
returns uuid language sql stable security definer set search_path = ''
as $$ select c.id from public.contacts c where c.user_id = auth.uid() and c.active limit 1 $$;

create or replace function private.is_claimant()
returns boolean language sql stable security definer set search_path = ''
as $$
  select coalesce((select upper(c.type) = 'CLAIMANT' from public.contacts c
                   where c.user_id = auth.uid() and c.active limit 1), false)
$$;

-- Can the caller see this claim?
create or replace function private.can_see_job(p_job uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select private.is_admin()
      or (not private.is_claimant()
          and exists (select 1 from public.jobs j where j.id = p_job and j.company_id = private.my_company_id()))
      or (private.is_claimant()
          and exists (select 1 from public.job_contacts jc where jc.job_id = p_job and jc.contact_id = private.my_contact_id()))
$$;

grant execute on function private.my_contact_id(), private.is_claimant(), private.can_see_job(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Policies
-- ---------------------------------------------------------------------------
alter table public.job_contacts enable row level security;
create policy "job_contacts: own or admin read" on public.job_contacts
  for select to authenticated using (contact_id = (select private.my_contact_id()) or (select private.is_admin()));
create policy "job_contacts: admins write" on public.job_contacts
  for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

drop policy "jobs: own company or admin read" on public.jobs;
create policy "jobs: visible claims" on public.jobs
  for select to authenticated using (private.can_see_job(id));

drop policy "job_rooms: own company or admin read" on public.job_rooms;
create policy "job_rooms: visible claims" on public.job_rooms
  for select to authenticated using (private.can_see_job(job_id));

drop policy "orders: own company or admin read" on public.orders;
create policy "orders: visible claims" on public.orders
  for select to authenticated using (private.can_see_job(job_id));

drop policy "order_lines: own company or admin read" on public.order_lines;
create policy "order_lines: visible claims" on public.order_lines
  for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and private.can_see_job(o.job_id)));

-- claimants see only themselves; company users see their colleagues (not claimants)
drop policy "contacts: same company or admin read" on public.contacts;
create policy "contacts: self, colleagues or admin read" on public.contacts
  for select to authenticated
  using (user_id = (select auth.uid())
         or (select private.is_admin())
         or (not (select private.is_claimant())
             and company_id = (select private.my_company_id())
             and upper(coalesce(type, '')) <> 'CLAIMANT'));

-- Baskets: company users share the company basket; a claimant has their own.
create or replace function private.can_use_basket(p_company uuid, p_contact uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select private.is_admin()
      or (not private.is_claimant() and p_contact is null and p_company = private.my_company_id())
      or (private.is_claimant() and p_contact = private.my_contact_id())
$$;
grant execute on function private.can_use_basket(uuid, uuid) to authenticated;

-- a claimant creating "the company basket" (as the portal does) gets their own
create or replace function private.baskets_claimant_owner()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if private.is_claimant() then
    new.contact_id := private.my_contact_id();
    new.company_id := private.my_company_id();
  end if;
  return new;
end;
$$;
create trigger baskets_claimant_owner before insert on public.baskets
  for each row execute function private.baskets_claimant_owner();

drop policy "baskets: own company or admin read" on public.baskets;
drop policy "baskets: own company create" on public.baskets;
create policy "baskets: own read" on public.baskets
  for select to authenticated using (private.can_use_basket(company_id, contact_id));
create policy "baskets: own create" on public.baskets
  for insert to authenticated with check (private.can_use_basket(company_id, contact_id));

drop policy "basket_lines: own basket read" on public.basket_lines;
drop policy "basket_lines: own basket add" on public.basket_lines;
drop policy "basket_lines: own basket remove" on public.basket_lines;
create policy "basket_lines: own basket read" on public.basket_lines
  for select to authenticated
  using (exists (select 1 from public.baskets b where b.id = basket_id and private.can_use_basket(b.company_id, b.contact_id)));
create policy "basket_lines: own basket add" on public.basket_lines
  for insert to authenticated
  with check (exists (select 1 from public.baskets b where b.id = basket_id and private.can_use_basket(b.company_id, b.contact_id)));
create policy "basket_lines: own basket remove" on public.basket_lines
  for delete to authenticated
  using (exists (select 1 from public.baskets b where b.id = basket_id and private.can_use_basket(b.company_id, b.contact_id)));

-- ---------------------------------------------------------------------------
-- Orders: claimants order from their own basket, only on their own claims
-- ---------------------------------------------------------------------------
create or replace function private.order_basket_id(p_contact_id uuid)
returns uuid language sql stable security definer set search_path = ''
as $$
  select b.id from public.contacts c
  join public.baskets b
    on (upper(coalesce(c.type, '')) = 'CLAIMANT' and b.contact_id = c.id)
    or (upper(coalesce(c.type, '')) <> 'CLAIMANT' and b.company_id = c.company_id and b.contact_id is null)
  where c.id = p_contact_id
  limit 1
$$;
grant execute on function private.order_basket_id(uuid) to service_role;

create or replace function public.order_basket_id(p_contact_id uuid)
returns uuid language sql security definer set search_path = ''
as $$ select private.order_basket_id(p_contact_id) $$;
revoke execute on function public.order_basket_id(uuid) from public, anon, authenticated;
grant execute on function public.order_basket_id(uuid) to service_role;

create or replace function private.create_order_from_basket(
  p_contact_id uuid, p_job_id uuid, p_note_uuid uuid
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_company_id  uuid;
  v_claimant    boolean;
  v_band        integer;
  v_basket_id   uuid;
  v_order_id    uuid;
begin
  select c.company_id, upper(coalesce(c.type, '')) = 'CLAIMANT' into v_company_id, v_claimant
  from public.contacts c where c.id = p_contact_id and c.active;
  if v_company_id is null then
    raise exception 'Contact not found or inactive';
  end if;

  if v_claimant then
    if not exists (select 1 from public.job_contacts jc where jc.job_id = p_job_id and jc.contact_id = p_contact_id) then
      raise exception 'This claim is not linked to you';
    end if;
  elsif not exists (select 1 from public.jobs j where j.id = p_job_id and j.company_id = v_company_id) then
    raise exception 'Job does not belong to this company';
  end if;

  v_basket_id := private.order_basket_id(p_contact_id);
  if v_basket_id is null or not exists (select 1 from public.basket_lines where basket_id = v_basket_id) then
    raise exception 'Basket is empty';
  end if;

  select pb.band into v_band
  from public.jobs j join public.companies co on co.id = j.company_id
  join public.price_bands pb on pb.id = co.price_band_id
  where j.id = p_job_id;

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

-- Portal api_me: a claimant's "basket" is their own; jobs/contacts follow RLS.
create or replace function public.api_me()
returns jsonb
language sql stable set search_path = ''
as $$
  select private.legacy(to_jsonb(c)) || jsonb_build_object('company',
    (select private.legacy(to_jsonb(co)) || jsonb_build_object(
        'price_bands', (select private.legacy(to_jsonb(pb)) from public.price_bands pb where pb.id = co.price_band_id),
        'contacts', coalesce((select jsonb_agg(private.legacy(to_jsonb(cc)) order by cc.name)
                              from public.contacts cc where cc.company_id = co.id), '[]'),
        'basket',   (select private.legacy(to_jsonb(b)) from public.baskets b
                     where b.company_id = co.id and private.can_use_basket(b.company_id, b.contact_id)
                     order by (b.contact_id is null) limit 1),
        'jobs', coalesce((select jsonb_agg(private.legacy(to_jsonb(j)) || jsonb_build_object(
                    'rooms', private.job_rooms_json(j.id),
                    'orders', coalesce((select jsonb_agg(private.legacy(to_jsonb(o)) order by o.created_at)
                                        from public.orders o where o.job_id = j.id), '[]'))
                  order by j.created_at desc)
                  from public.jobs j
                  where private.can_see_job(j.id)
                    and (j.company_id = co.id
                         or exists (select 1 from public.job_contacts jc where jc.job_id = j.id and jc.contact_id = c.id))), '[]'))
     from public.companies co where co.id = c.company_id))
  from public.contacts c
  where c.user_id = auth.uid()
  limit 1
$$;

-- ---------------------------------------------------------------------------
-- Admin RPCs
-- ---------------------------------------------------------------------------
create or replace function private.job_users_json(p_job uuid)
returns jsonb language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'guid', c.id, 'name', c.name, 'email', c.email, 'mobile', c.mobile, 'phone', c.phone,
           'type', c.type, 'active', case when c.active then 1 else 0 end,
           'has_login', c.user_id is not null, 'invited_at', jc.invited_at)
         order by jc.created_at), '[]')
  from public.job_contacts jc join public.contacts c on c.id = jc.contact_id
  where jc.job_id = p_job
$$;

-- Link an existing user, or create a new claim user, on a claim.
--   p_contact: existing contact guid, or null to create from p_name/p_email/p_mobile
create or replace function public.api_claim_add_user(
  p_job uuid, p_contact uuid default null,
  p_name text default null, p_email text default null, p_mobile text default null
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_company uuid;
  v_contact uuid := p_contact;
  v_email   text := lower(btrim(coalesce(p_email, '')));
begin
  if not private.is_admin() then raise exception 'Forbidden' using errcode = '42501'; end if;
  select company_id into v_company from public.jobs where id = p_job;
  if v_company is null then raise exception 'Claim not found' using errcode = 'P0002'; end if;

  if v_contact is null then
    if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
      raise exception 'Enter a valid email address' using errcode = '22023';
    end if;
    if nullif(btrim(coalesce(p_name, '')), '') is null then
      raise exception 'Enter the user''s name' using errcode = '22023';
    end if;
    -- reuse an existing user with this email rather than duplicating them
    select id into v_contact from public.contacts where lower(email) = v_email
      order by (company_id = v_company) desc, created_at limit 1;
    if v_contact is null then
      insert into public.contacts (company_id, name, email, mobile, type, active, is_primary_contact)
      values (v_company, btrim(p_name), v_email, nullif(btrim(coalesce(p_mobile, '')), ''), 'CLAIMANT', false, false)
      returning id into v_contact;
    end if;
  end if;

  insert into public.job_contacts (job_id, contact_id) values (p_job, v_contact) on conflict do nothing;
  return private.job_users_json(p_job);
end;
$$;

create or replace function public.api_claim_remove_user(p_job uuid, p_contact uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
begin
  if not private.is_admin() then raise exception 'Forbidden' using errcode = '42501'; end if;
  delete from public.job_contacts where job_id = p_job and contact_id = p_contact;
  return private.job_users_json(p_job);
end;
$$;

-- People to pick from when adding a claim user (search by name/email/phone).
create or replace function public.api_search_contacts(p_q text, p_limit integer default 20)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select case when not private.is_admin() then '[]'::jsonb else coalesce((
    select jsonb_agg(x order by x->>'name') from (
      select jsonb_build_object('guid', c.id, 'name', c.name, 'email', c.email, 'mobile', c.mobile,
               'type', c.type, 'active', case when c.active then 1 else 0 end,
               'company_name', co.name) x
      from public.contacts c left join public.companies co on co.id = c.company_id
      where length(btrim(coalesce(p_q, ''))) >= 2
        and (c.name ilike '%' || btrim(p_q) || '%' or c.email ilike '%' || btrim(p_q) || '%'
             or c.mobile ilike '%' || btrim(p_q) || '%' or c.phone ilike '%' || btrim(p_q) || '%')
      order by c.name
      limit least(greatest(coalesce(p_limit, 20), 1), 50)
    ) s), '[]') end
$$;

revoke execute on function public.api_claim_add_user(uuid, uuid, text, text, text),
  public.api_claim_remove_user(uuid, uuid), public.api_search_contacts(text, integer) from public, anon;
grant execute on function public.api_claim_add_user(uuid, uuid, text, text, text),
  public.api_claim_remove_user(uuid, uuid), public.api_search_contacts(text, integer) to authenticated;

-- Claims list now carries users + activation.
create or replace function public.api_claims_page(
  p_search text default null, p_filter text default 'open',
  p_page integer default 1, p_per_page integer default 20
) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_page  integer := greatest(coalesce(p_page, 1), 1);
  v_per   integer := least(greatest(coalesce(p_per_page, 20), 1), 100);
  v_q     text := nullif(btrim(coalesce(p_search, '')), '');
  v_f     text := coalesce(nullif(p_filter, ''), 'open');
  v_res   jsonb;
begin
  if not private.is_admin() then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  with c as (
    select j.*, co.name company_name,
           exists (select 1 from public.orders o where o.job_id = j.id) has_order,
           exists (select 1 from public.job_rooms jr where jr.job_id = j.id) has_rooms
    from public.jobs j join public.companies co on co.id = j.company_id
    where (v_q is null or j.job_number ilike '%' || v_q || '%' or co.name ilike '%' || v_q || '%'
           or j.job_address ilike '%' || v_q || '%')
  ), f as (
    select * from c where case v_f
      when 'open'    then not has_order and coalesce(status, '') not in ('Completed', 'Unsuccessful')
      when 'setup'   then not has_order and coalesce(status, '') not in ('Completed', 'Unsuccessful')
                          and activated_at is null
      when 'active'  then activated_at is not null and not has_order
      when 'ordered' then has_order
      else true end
  ), pg as (
    select * from f order by created_at desc, id offset (v_page - 1) * v_per limit v_per
  )
  select jsonb_build_object(
    'total', (select count(*) from f), 'page', v_page, 'per_page', v_per,
    'data', coalesce((select jsonb_agg(jsonb_build_object(
        'guid', pg.id, 'job_number', pg.job_number, 'job_address', pg.job_address, 'status', pg.status,
        'budget', pg.budget, 'service_mate_uuid', pg.service_mate_uuid, 'created_at', pg.created_at,
        'activated_at', pg.activated_at,
        'company', jsonb_build_object('guid', pg.company_id, 'name', pg.company_name),
        'rooms', private.job_rooms_json(pg.id),
        'users', private.job_users_json(pg.id),
        'orders', (select count(*) from public.orders o where o.job_id = pg.id))
      order by pg.created_at desc, pg.id) from pg), '[]'))
  into v_res;
  return v_res;
end;
$$;

-- Used by the admin-users edge function (service role) when activating.
create or replace function public.claim_mark_activated(p_job uuid)
returns void language sql security definer set search_path = ''
as $$
  update public.jobs set activated_at = coalesce(activated_at, now()) where id = p_job;
  update public.job_contacts set invited_at = now() where job_id = p_job;
$$;
revoke execute on function public.claim_mark_activated(uuid) from public, anon, authenticated;
grant execute on function public.claim_mark_activated(uuid) to service_role;

-- Find an existing login by email (service role only; used when activating).
create or replace function public.auth_user_id_by_email(p_email text)
returns uuid language sql stable security definer set search_path = ''
as $$ select id from auth.users where lower(email) = lower(btrim(p_email)) limit 1 $$;
revoke execute on function public.auth_user_id_by_email(text) from public, anon, authenticated;
grant execute on function public.auth_user_id_by_email(text) to service_role;
