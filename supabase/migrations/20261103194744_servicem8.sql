-- ServiceM8 integration: sync run log + reporting tables
-- Replaces the separate FastAPI/MySQL "servicem8" service.

create schema if not exists reporting;
revoke all on schema reporting from public, anon, authenticated;
grant usage on schema reporting to service_role;

-- Flattened job report (legacy servicem8 `job` table, rebuilt nightly)
create table reporting.sm8_jobs (
  uuid                                  uuid primary key,
  job_number                            text,
  date                                  date,
  job_status                            text,
  company                               text,
  contact_first                         text,
  contact_last                          text,
  completion_actioned_by_staff_member   text,
  job_address                           text,
  invoice_date                          date,
  po_number                             text,
  description_of_work                   text,
  work_completed                        date,
  job_category                          text,
  invoice_no                            text,
  payment_method                        text,
  payment_amount                        text,
  total_invoice_amount                  text,
  total_cost                            numeric(12,2) default 0,
  total_price                           numeric(12,2) default 0,
  payment_received_date                 date,
  completion_date                       date,
  badges                                text,
  strip_out_date                        date,
  actual_start_date                     date,
  target_end_date                       date,
  actual_end_date                       date,
  drying_start_date                     date,
  drying_target_end_date                date,
  drying_actual_end_date                date,
  works_approved_date                   date,
  date_choices_and_excess_sent          date,
  date_choices_and_excess_received      date,
  start_date                            date,
  target_start_date                     date,
  synced_at                             timestamptz not null default now()
);

create table reporting.sm8_queues (
  uuid                 uuid primary key,
  name                 text,
  default_timeframe    integer,
  active               boolean,
  edit_date            date,
  subscribed_staff     text,
  requires_assignment  boolean,
  synced_at            timestamptz not null default now()
);

grant all on all tables in schema reporting to service_role;

-- Sync run log (visible to admins)
create table public.sync_runs (
  id           bigint generated always as identity primary key,
  kind         text not null,           -- 'customers' | 'reporting'
  started_at   timestamptz not null default now(),
  finished_at  timestamptz,
  ok           boolean,
  stats        jsonb,
  error        text
);
alter table public.sync_runs enable row level security;
create policy "sync_runs: admins read" on public.sync_runs
  for select to authenticated using ((select private.is_admin()));
