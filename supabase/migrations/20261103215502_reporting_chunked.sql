-- Chunked reporting sync.
-- Edge functions have ~2s of CPU per invocation, so the reporting sync can't
-- process all of ServiceM8 in one call. Instead each invocation fetches a few
-- pages, stores the minimal fields in raw_* tables, saves its position in
-- sync_state and re-invokes itself. When every resource is loaded,
-- sm8_build_reporting() does the transform in SQL (port of the legacy Python
-- import_pricing_data.py / import_queue_data.py) and publishes atomically.

create table reporting.raw_named (
  resource text not null,
  uuid     uuid not null,
  name     text,
  primary key (resource, uuid)
);
create table reporting.raw_jobcontact (
  seq      bigint generated always as identity primary key,
  job_uuid uuid,
  first    text,
  last     text
);
create index on reporting.raw_jobcontact (job_uuid, seq);
create table reporting.raw_jobmaterial (
  seq      bigint generated always as identity primary key,
  job_uuid uuid,
  price    numeric,
  cost     numeric,
  quantity text,
  name     text,
  active   text
);
create index on reporting.raw_jobmaterial (job_uuid, seq);
create table reporting.raw_job (
  uuid                         uuid primary key,
  company_uuid                 uuid,
  category_uuid                uuid,
  completion_actioned_by_uuid  uuid,
  badge_uuids                  text[],
  row                          jsonb not null   -- already-cleaned report columns
);
create table reporting.raw_queue (
  uuid        uuid primary key,
  subscribed  text[],
  row         jsonb not null
);
create table reporting.sync_state (
  id          int primary key default 1 check (id = 1),
  run_id      bigint,
  step        int not null default 0,
  cursor      text not null default '-1',
  pages       int not null default 0,
  in_progress boolean not null default false,
  started_at  timestamptz,
  updated_at  timestamptz
);
insert into reporting.sync_state (id) values (1);
grant all on all tables in schema reporting to service_role;

-- ---------------------------------------------------------------------------
create or replace function public.sm8_state(p_patch jsonb default null)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare s reporting.sync_state;
begin
  if p_patch is not null then
    update reporting.sync_state set
      run_id      = coalesce((p_patch->>'run_id')::bigint, run_id),
      step        = coalesce((p_patch->>'step')::int, step),
      cursor      = coalesce(p_patch->>'cursor', cursor),
      pages       = coalesce((p_patch->>'pages')::int, pages),
      in_progress = coalesce((p_patch->>'in_progress')::boolean, in_progress),
      started_at  = case when p_patch ? 'started_at' then (p_patch->>'started_at')::timestamptz else started_at end,
      updated_at  = now()
    where id = 1;
  end if;
  select * into s from reporting.sync_state where id = 1;
  return to_jsonb(s);
end;
$$;

create or replace function public.sm8_raw_reset()
returns void
language sql security definer set search_path = ''
as $$
  truncate reporting.raw_named, reporting.raw_jobcontact, reporting.raw_jobmaterial,
           reporting.raw_job, reporting.raw_queue,
           reporting.sm8_jobs_staging, reporting.sm8_queues_staging;
$$;

create or replace function public.sm8_raw_insert(p_resource text, p_rows jsonb)
returns integer
language plpgsql security definer set search_path = ''
as $$
declare n int;
begin
  if p_resource in ('company', 'category', 'badge', 'staff') then
    insert into reporting.raw_named (resource, uuid, name)
    select p_resource, r.uuid, r.name from jsonb_to_recordset(p_rows) as r(uuid uuid, name text)
    on conflict do nothing;
  elsif p_resource = 'jobcontact' then
    insert into reporting.raw_jobcontact (job_uuid, first, last)
    select r.job_uuid, r.first, r.last from jsonb_to_recordset(p_rows) as r(job_uuid uuid, first text, last text);
  elsif p_resource = 'jobmaterial' then
    insert into reporting.raw_jobmaterial (job_uuid, price, cost, quantity, name, active)
    select r.job_uuid, r.price, r.cost, r.quantity, r.name, r.active
    from jsonb_to_recordset(p_rows) as r(job_uuid uuid, price numeric, cost numeric, quantity text, name text, active text);
  elsif p_resource = 'job' then
    insert into reporting.raw_job (uuid, company_uuid, category_uuid, completion_actioned_by_uuid, badge_uuids, row)
    select r.uuid, r.company_uuid, r.category_uuid, r.completion_actioned_by_uuid, r.badge_uuids, r.row
    from jsonb_to_recordset(p_rows) as r(uuid uuid, company_uuid uuid, category_uuid uuid,
                                          completion_actioned_by_uuid uuid, badge_uuids text[], row jsonb)
    on conflict (uuid) do nothing;
  elsif p_resource = 'queue' then
    insert into reporting.raw_queue (uuid, subscribed, row)
    select r.uuid, r.subscribed, r.row from jsonb_to_recordset(p_rows) as r(uuid uuid, subscribed text[], row jsonb)
    on conflict (uuid) do nothing;
  else
    raise exception 'unknown resource %', p_resource;
  end if;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Build the report from raw_* and publish it.
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

-- Fire the next chunk (called by the edge function at the end of a chunk)
create or replace function private.invoke_servicem8_sync_body(p_body jsonb)
returns bigint
language sql security definer set search_path = ''
as $$
  select net.http_post(
    url     := (select value from private.app_config where key = 'FUNCTIONS_URL') || '/servicem8-sync',
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'x-cron-secret', (select value from private.app_config where key = 'CRON_SECRET')),
    body    := p_body,
    timeout_milliseconds := 150000
  )
$$;
revoke execute on function private.invoke_servicem8_sync_body(jsonb) from public, authenticated;

create or replace function public.sm8_continue()
returns bigint
language sql security definer set search_path = ''
as $$ select private.invoke_servicem8_sync_body('{"mode":"reporting","continue":true}'::jsonb) $$;

-- The final build can take longer than the API's 8s statement timeout, so the
-- edge function hands it to a one-off pg_cron job, which records the result.
create or replace function private.sm8_build_and_finish()
returns void
language plpgsql security definer set search_path = ''
as $$
declare v jsonb; v_run bigint; v_hb text;
begin
  perform cron.unschedule('servicem8-reporting-build');
  select run_id into v_run from reporting.sync_state where id = 1;
  begin
    v := public.sm8_build_reporting();
    update public.sync_runs set finished_at = now(), ok = true, stats = v where id = v_run;
    select value into v_hb from private.app_config where key = 'BETTERSTACK_HEARTBEAT_URL';
    if v_hb is not null then perform net.http_get(v_hb); end if;
  exception when others then
    update public.sync_runs set finished_at = now(), ok = false, error = 'build: ' || sqlerrm where id = v_run;
  end;
  update reporting.sync_state set in_progress = false, updated_at = now() where id = 1;
end;
$$;

create or replace function public.sm8_schedule_build()
returns void
language sql security definer set search_path = ''
as $$
  select cron.schedule('servicem8-reporting-build', '5 seconds', 'select private.sm8_build_and_finish()');
$$;

revoke execute on function private.sm8_build_and_finish() from public, authenticated;
revoke execute on function public.sm8_state(jsonb), public.sm8_raw_reset(), public.sm8_raw_insert(text, jsonb),
  public.sm8_build_reporting(), public.sm8_continue(), public.sm8_schedule_build() from public, anon, authenticated;
grant execute on function public.sm8_state(jsonb), public.sm8_raw_reset(), public.sm8_raw_insert(text, jsonb),
  public.sm8_build_reporting(), public.sm8_continue(), public.sm8_schedule_build() to service_role;
