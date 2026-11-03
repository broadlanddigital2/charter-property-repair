-- Service-role-only RPCs used by the servicem8-sync and reporting-api edge
-- functions to read/write the (unexposed) reporting schema.

create or replace function public.sm8_replace_reporting(p_jobs jsonb, p_queues jsonb)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v_jobs int; v_queues int;
begin
  if p_jobs is not null then
    delete from reporting.sm8_jobs where true;
    insert into reporting.sm8_jobs
    select * from jsonb_populate_recordset(null::reporting.sm8_jobs, p_jobs);
    get diagnostics v_jobs = row_count;
  end if;
  if p_queues is not null then
    delete from reporting.sm8_queues where true;
    insert into reporting.sm8_queues
    select * from jsonb_populate_recordset(null::reporting.sm8_queues, p_queues);
    get diagnostics v_queues = row_count;
  end if;
  return jsonb_build_object('jobs', v_jobs, 'queues', v_queues);
end;
$$;

create or replace function public.sm8_reporting(p_kind text)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select case p_kind
    when 'jobs'   then (select coalesce(jsonb_agg(to_jsonb(j) order by j.job_number), '[]') from reporting.sm8_jobs j)
    when 'queues' then (select coalesce(jsonb_agg(to_jsonb(q) order by q.name), '[]') from reporting.sm8_queues q)
  end
$$;

revoke execute on function public.sm8_replace_reporting(jsonb, jsonb) from public, anon, authenticated;
revoke execute on function public.sm8_reporting(text) from public, anon, authenticated;
grant execute on function public.sm8_replace_reporting(jsonb, jsonb) to service_role;
grant execute on function public.sm8_reporting(text) to service_role;
