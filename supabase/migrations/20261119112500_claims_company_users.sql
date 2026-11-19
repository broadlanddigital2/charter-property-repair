-- Claims list: also return the claim company's active (non-claimant) users.
-- They can see every claim of their company in the portal, so the admin shouldn't
-- show "None" for a claim that has no claim users of its own.

create or replace function private.company_users_json(p_company uuid)
returns jsonb language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('guid', c.id, 'name', c.name, 'email', c.email, 'type', c.type)
         order by c.name), '[]')
  from public.contacts c
  where c.company_id = p_company and c.active and coalesce(c.type, '') <> 'CLAIMANT'
$$;

revoke all on function private.company_users_json(uuid) from public, anon, authenticated;

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
        'company_users', private.company_users_json(pg.company_id),
        'orders', (select count(*) from public.orders o where o.job_id = pg.id))
      order by pg.created_at desc, pg.id) from pg), '[]'))
  into v_res;
  return v_res;
end;
$$;
