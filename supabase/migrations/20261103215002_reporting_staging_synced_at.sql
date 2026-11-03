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
