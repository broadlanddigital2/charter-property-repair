-- Page-by-page reporting sync: rows are written to staging tables as each
-- ServiceM8 page is processed, then published in one transaction, so the
-- edge function never holds the whole dataset in memory and readers never
-- see a half-finished refresh.

create table reporting.sm8_jobs_staging   (like reporting.sm8_jobs including all);
create table reporting.sm8_queues_staging (like reporting.sm8_queues including all);
grant all on reporting.sm8_jobs_staging, reporting.sm8_queues_staging to service_role;

create or replace function public.sm8_stage(p_kind text, p_rows jsonb, p_reset boolean default false)
returns integer
language plpgsql security definer set search_path = ''
as $$
declare n int;
begin
  if p_kind = 'jobs' then
    if p_reset then truncate reporting.sm8_jobs_staging; end if;
    insert into reporting.sm8_jobs_staging
    select * from jsonb_populate_recordset(null::reporting.sm8_jobs_staging, p_rows)
    on conflict (uuid) do nothing;
  elsif p_kind = 'queues' then
    if p_reset then truncate reporting.sm8_queues_staging; end if;
    insert into reporting.sm8_queues_staging
    select * from jsonb_populate_recordset(null::reporting.sm8_queues_staging, p_rows)
    on conflict (uuid) do nothing;
  else
    raise exception 'unknown kind %', p_kind;
  end if;
  get diagnostics n = row_count;
  return n;
end;
$$;

create or replace function public.sm8_publish()
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v_jobs int; v_queues int;
begin
  delete from reporting.sm8_jobs where true;
  insert into reporting.sm8_jobs select * from reporting.sm8_jobs_staging;
  get diagnostics v_jobs = row_count;
  delete from reporting.sm8_queues where true;
  insert into reporting.sm8_queues select * from reporting.sm8_queues_staging;
  get diagnostics v_queues = row_count;
  truncate reporting.sm8_jobs_staging, reporting.sm8_queues_staging;
  return jsonb_build_object('jobs', v_jobs, 'queues', v_queues);
end;
$$;

revoke execute on function public.sm8_stage(text, jsonb, boolean), public.sm8_publish() from public, anon, authenticated;
grant execute on function public.sm8_stage(text, jsonb, boolean), public.sm8_publish() to service_role;

-- jsonb_populate_recordset yields NULL (not the column default) for keys the
-- payload omits, so let staging accept NULL synced_at and stamp it on publish.
alter table reporting.sm8_jobs_staging   alter column synced_at drop not null;
alter table reporting.sm8_queues_staging alter column synced_at drop not null;

create or replace function public.sm8_publish()
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v_jobs int; v_queues int;
begin
  update reporting.sm8_jobs_staging   set synced_at = now() where synced_at is null;
  update reporting.sm8_queues_staging set synced_at = now() where synced_at is null;
  delete from reporting.sm8_jobs where true;
  insert into reporting.sm8_jobs select * from reporting.sm8_jobs_staging;
  get diagnostics v_jobs = row_count;
  delete from reporting.sm8_queues where true;
  insert into reporting.sm8_queues select * from reporting.sm8_queues_staging;
  get diagnostics v_queues = row_count;
  truncate reporting.sm8_jobs_staging, reporting.sm8_queues_staging;
  return jsonb_build_object('jobs', v_jobs, 'queues', v_queues);
end;
$$;
