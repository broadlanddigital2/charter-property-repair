-- App configuration (non-user-facing) + scheduled ServiceM8 syncs.
-- Internal secrets are generated in-database so they never leave Postgres.

create table private.app_config (
  key    text primary key,
  value  text not null
);
revoke all on private.app_config from public, anon, authenticated;

insert into private.app_config (key, value) values
  ('CRON_SECRET',            encode(extensions.gen_random_bytes(32), 'hex')),
  ('REPORTING_API_KEY',      encode(extensions.gen_random_bytes(32), 'hex')),
  ('PORTAL_URL',             'https://insurance-staging.broadlanddigital.co.uk'),
  ('ADMIN_URL',              'https://insurance-admin-staging.broadlanddigital.co.uk'),
  ('SERVICEM8_NOTES_ENABLED','false'),   -- keep false on staging so test orders don't post to live jobs
  ('FUNCTIONS_URL',          'https://gnnabvwdlpsxmdgvthpi.supabase.co/functions/v1')
on conflict (key) do nothing;

create or replace function public.app_config_get(p_key text)
returns text
language sql stable security definer set search_path = ''
as $$ select value from private.app_config where key = p_key $$;
revoke execute on function public.app_config_get(text) from public, anon, authenticated;
grant execute on function public.app_config_get(text) to service_role;

-- ---------------------------------------------------------------------------
-- Schedules
-- ---------------------------------------------------------------------------
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

create or replace function private.invoke_servicem8_sync(p_mode text)
returns bigint
language sql security definer set search_path = ''
as $$
  select net.http_post(
    url     := (select value from private.app_config where key = 'FUNCTIONS_URL') || '/servicem8-sync',
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'x-cron-secret', (select value from private.app_config where key = 'CRON_SECRET')),
    body    := jsonb_build_object('mode', p_mode),
    timeout_milliseconds := 150000
  )
$$;
revoke execute on function private.invoke_servicem8_sync(text) from public, authenticated;

-- Customers/contacts/jobs every hour at :17; reporting nightly at 02:43 UTC.
select cron.schedule('servicem8-customers', '17 * * * *',  $$select private.invoke_servicem8_sync('customers')$$);
select cron.schedule('servicem8-reporting', '43 2 * * *',  $$select private.invoke_servicem8_sync('reporting')$$);
