-- Open / needs set-up claims exclude jobs ServiceM8 marks Completed or Unsuccessful.
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
                          and (not has_rooms or budget is null)
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
        'company', jsonb_build_object('guid', pg.company_id, 'name', pg.company_name),
        'rooms', private.job_rooms_json(pg.id),
        'orders', (select count(*) from public.orders o where o.job_id = pg.id))
      order by pg.created_at desc, pg.id) from pg), '[]'))
  into v_res;
  return v_res;
end;
$$;
