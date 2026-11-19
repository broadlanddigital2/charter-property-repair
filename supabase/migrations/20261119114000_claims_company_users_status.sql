-- Company users on claims: include inactive ones too, with their status,
-- so the admin can see who can and can't sign in.
create or replace function private.company_users_json(p_company uuid)
returns jsonb language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'guid', c.id, 'name', c.name, 'email', c.email, 'type', c.type,
           'active', case when c.active then 1 else 0 end)
         order by c.active desc, c.name), '[]')
  from public.contacts c
  where c.company_id = p_company and coalesce(c.type, '') <> 'CLAIMANT'
$$;
