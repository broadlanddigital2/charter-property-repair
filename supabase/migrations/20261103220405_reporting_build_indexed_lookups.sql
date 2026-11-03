-- Build lookups via the raw_named primary key instead of an unindexed CTE
-- (first nightly build took >2 min; now seconds).
create or replace function public.sm8_build_reporting()
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v jsonb;
begin
  truncate reporting.sm8_jobs_staging, reporting.sm8_queues_staging;

  with mat as (
    select job_uuid,
           sum(case when coalesce(price, 0) > 0 then price * coalesce(nullif(quantity, '')::numeric, 1) else 0 end)
             filter (where quantity is distinct from '-1.0000' and coalesce(name, '') not like '%quote%' and active = '1') as total_price,
           sum(case when coalesce(price, 0) > 0 then 0 else coalesce(cost, 0) * coalesce(nullif(quantity, '')::numeric, 1) end)
             filter (where quantity is distinct from '-1.0000' and coalesce(name, '') not like '%quote%' and active = '1') as total_cost
    from reporting.raw_jobmaterial
    group by job_uuid
  ),
  inv as (  -- last material mentioning "Invoice No" wins (as in the legacy loop)
    select distinct on (job_uuid) job_uuid,
           nullif(case when position(E'\n' in btrim(split_part(name, 'Invoice No', 2))) > 0
                       then split_part(btrim(split_part(name, 'Invoice No', 2)), E'\n', 1)
                       else split_part(btrim(split_part(name, 'Invoice No', 2)), ' ', 1) end, '') as invoice_no
    from reporting.raw_jobmaterial
    where name like '%Invoice No%'
    order by job_uuid, seq desc
  ),
  contact as (
    select distinct on (job_uuid) job_uuid, first, last
    from reporting.raw_jobcontact
    order by job_uuid, seq
  )
  insert into reporting.sm8_jobs_staging
  select (jsonb_populate_record(null::reporting.sm8_jobs_staging,
           j.row || jsonb_build_object(
             'uuid', j.uuid,
             'company', nco.name,
             'job_category', nca.name,
             'completion_actioned_by_staff_member', nst.name,
             'contact_first', c.first,
             'contact_last', c.last,
             'invoice_no', i.invoice_no,
             'total_price', round(coalesce(m.total_price, 0), 2),
             'total_cost', round(coalesce(m.total_cost, 0), 2),
             'badges', (select nullif(string_agg(n.name, ',' order by ord), '')
                        from unnest(j.badge_uuids) with ordinality b(u, ord)
                        join reporting.raw_named n on n.resource = 'badge'
                             and n.uuid = case when b.u ~* '^[0-9a-f-]{36}$' then b.u::uuid end),
             'synced_at', now()
           ))).*
  from reporting.raw_job j
  left join mat m on m.job_uuid = j.uuid
  left join inv i on i.job_uuid = j.uuid
  left join contact c on c.job_uuid = j.uuid
  left join reporting.raw_named nco on nco.resource = 'company'  and nco.uuid = j.company_uuid
  left join reporting.raw_named nca on nca.resource = 'category' and nca.uuid = j.category_uuid
  left join reporting.raw_named nst on nst.resource = 'staff'    and nst.uuid = j.completion_actioned_by_uuid;

  insert into reporting.sm8_queues_staging
  select (jsonb_populate_record(null::reporting.sm8_queues_staging,
           q.row || jsonb_build_object(
             'uuid', q.uuid,
             'subscribed_staff', (select nullif(string_agg(coalesce(n.name, case when length(s) = 36 then null else s end), ', ' order by ord), '')
                                  from unnest(q.subscribed) with ordinality x(s, ord)
                                  left join reporting.raw_named n on n.resource = 'staff'
                                       and n.uuid = case when x.s ~* '^[0-9a-f-]{36}$' then x.s::uuid end),
             'synced_at', now()
           ))).*
  from reporting.raw_queue q;

  v := public.sm8_publish()
       || jsonb_build_object('materials', (select count(*) from reporting.raw_jobmaterial),
                             'contacts', (select count(*) from reporting.raw_jobcontact));
  perform public.sm8_raw_reset();
  return v;
end;
$$;
