-- Website enquiry form: every submission is logged here (backup + rate limiting),
-- then emailed to Charter by the send-enquiry edge function via SendGrid.
create table if not exists private.enquiries (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  name        text not null,
  email       text not null,
  phone       text,
  postcode    text,
  type        text,
  reference   text,
  message     text not null,
  page        text,
  ip_hash     text,
  status      text not null default 'received',   -- received | sent | failed
  error       text
);
create index if not exists enquiries_ip_recent on private.enquiries (ip_hash, created_at desc);
revoke all on private.enquiries from public, anon, authenticated;

insert into private.app_config (key, value) values
  ('ENQUIRY_TO',        'mail@charterpropertyrepairs.co.uk'),
  ('ENQUIRY_FROM',      'no-reply@charterpropertyrepairs.co.uk'),   -- must be a verified SendGrid sender
  ('ENQUIRY_FROM_NAME', 'Charter Property Repairs website')
on conflict (key) do nothing;

-- Server-only helpers (the private schema isn't exposed through the API).
create or replace function public.enquiry_log(
  p_name text, p_email text, p_phone text, p_postcode text, p_type text,
  p_reference text, p_message text, p_page text, p_ip_hash text, p_max_per_hour int default 5)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare v_id uuid;
begin
  if p_ip_hash is not null and (
    select count(*) from private.enquiries
    where ip_hash = p_ip_hash and created_at > now() - interval '1 hour') >= p_max_per_hour then
    return null;  -- rate limited
  end if;
  insert into private.enquiries (name, email, phone, postcode, type, reference, message, page, ip_hash)
  values (p_name, p_email, nullif(p_phone, ''), nullif(p_postcode, ''), p_type, nullif(p_reference, ''), p_message, nullif(p_page, ''), p_ip_hash)
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.enquiry_set_status(p_id uuid, p_status text, p_error text)
returns void
language sql security definer set search_path = ''
as $$ update private.enquiries set status = p_status, error = p_error where id = p_id $$;

revoke execute on function public.enquiry_log(text, text, text, text, text, text, text, text, text, int) from public, anon, authenticated;
revoke execute on function public.enquiry_set_status(uuid, text, text) from public, anon, authenticated;
grant execute on function public.enquiry_log(text, text, text, text, text, text, text, text, text, int) to service_role;
grant execute on function public.enquiry_set_status(uuid, text, text) to service_role;
