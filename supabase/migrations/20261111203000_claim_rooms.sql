-- Claim set-up: the rooms being done on each claim (job), plus admin RPCs to
-- list claims and set their budget and rooms. Rooms are many-to-many with a
-- quantity (e.g. 2 bedrooms) and an optional note per room.

create table public.job_rooms (
  job_id     uuid not null references public.jobs(id) on delete cascade,
  room_id    uuid not null references public.rooms(id) on delete restrict,
  quantity   smallint not null default 1 check (quantity between 1 and 20),
  notes      text,
  created_at timestamptz not null default now(),
  primary key (job_id, room_id)
);
create index job_rooms_room_idx on public.job_rooms (room_id);

alter table public.job_rooms enable row level security;

create policy "job_rooms: own company or admin read" on public.job_rooms
  for select to authenticated using (
    (select private.is_admin())
    or exists (select 1 from public.jobs j where j.id = job_id and j.company_id = (select private.my_company_id()))
  );
create policy "job_rooms: admins write" on public.job_rooms
  for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

create or replace function private.job_rooms_json(p_job uuid)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('slug', r.slug, 'name', r.name,
                                               'quantity', jr.quantity, 'notes', jr.notes)
                            order by r.sort), '[]')
  from public.job_rooms jr join public.rooms r on r.id = jr.room_id
  where jr.job_id = p_job
$$;

-- Portal: jobs now carry their rooms.
create or replace function public.api_me()
returns jsonb
language sql stable set search_path = ''
as $$
  select private.legacy(to_jsonb(c)) || jsonb_build_object('company',
    (select private.legacy(to_jsonb(co)) || jsonb_build_object(
        'price_bands', (select private.legacy(to_jsonb(pb)) from public.price_bands pb where pb.id = co.price_band_id),
        'contacts', coalesce((select jsonb_agg(private.legacy(to_jsonb(cc)) order by cc.name)
                              from public.contacts cc where cc.company_id = co.id), '[]'),
        'basket',   (select private.legacy(to_jsonb(b)) from public.baskets b where b.company_id = co.id),
        'jobs', coalesce((select jsonb_agg(private.legacy(to_jsonb(j)) || jsonb_build_object(
                    'rooms', private.job_rooms_json(j.id),
                    'orders', coalesce((select jsonb_agg(private.legacy(to_jsonb(o)) order by o.created_at)
                                        from public.orders o where o.job_id = j.id), '[]'))
                  order by j.created_at desc)
                  from public.jobs j where j.company_id = co.id), '[]'))
     from public.companies co where co.id = c.company_id))
  from public.contacts c
  where c.user_id = auth.uid()
  limit 1
$$;

-- Admin: paged claims list.
--   p_filter: 'open' (no order yet, default), 'setup' (open + no rooms or budget),
--             'ordered', 'all'
create or replace function public.api_claims_page(
  p_search text default null, p_filter text default 'open',
  p_page integer default 1, p_per_page integer default 20
) returns jsonb
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_page  integer := greatest(coalesce(p_page, 1), 1);
  v_per   integer := least(greatest(coalesce(p_per_page, 20), 1), 100);
  v_q     text := nullif(btrim(coalesce(p_search, '')), '');
  v_f     text := coalesce(nullif(p_filter, ''), 'open');
  v_total integer;
  v_data  jsonb;
begin
  if not private.is_admin() then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  create temporary table _claims on commit drop as
  select j.*, co.name company_name,
         exists (select 1 from public.orders o where o.job_id = j.id) has_order,
         exists (select 1 from public.job_rooms jr where jr.job_id = j.id) has_rooms
  from public.jobs j join public.companies co on co.id = j.company_id
  where (v_q is null or j.job_number ilike '%' || v_q || '%' or co.name ilike '%' || v_q || '%'
         or j.job_address ilike '%' || v_q || '%');

  delete from _claims where case v_f
    when 'open'    then has_order
    when 'setup'   then has_order or (has_rooms and budget is not null)
    when 'ordered' then not has_order
    else false end;

  select count(*) into v_total from _claims;

  select coalesce(jsonb_agg(x.j order by x.created_at desc, x.id), '[]') into v_data
  from (
    select c.created_at, c.id, jsonb_build_object(
      'guid', c.id, 'job_number', c.job_number, 'job_address', c.job_address, 'status', c.status,
      'budget', c.budget, 'service_mate_uuid', c.service_mate_uuid, 'created_at', c.created_at,
      'company', jsonb_build_object('guid', c.company_id, 'name', c.company_name),
      'rooms', private.job_rooms_json(c.id),
      'orders', (select count(*) from public.orders o where o.job_id = c.id)) j
    from _claims c
    order by c.created_at desc, c.id
    offset (v_page - 1) * v_per limit v_per
  ) x;

  return jsonb_build_object('total', v_total, 'page', v_page, 'per_page', v_per, 'data', v_data);
end;
$$;
revoke execute on function public.api_claims_page(text, text, integer, integer) from public, anon;
grant execute on function public.api_claims_page(text, text, integer, integer) to authenticated;

-- Admin: set a claim's budget and rooms in one go.
--   p_rooms: [{ "slug": "bedroom", "quantity": 2, "notes": "..." }, ...]
create or replace function public.api_set_claim(p_job uuid, p_budget integer, p_rooms jsonb)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'Forbidden' using errcode = '42501';
  end if;
  if not exists (select 1 from public.jobs where id = p_job) then
    raise exception 'Claim not found' using errcode = 'P0002';
  end if;
  if p_budget is not null and p_budget < 0 then
    raise exception 'Budget cannot be negative' using errcode = '22023';
  end if;

  update public.jobs set budget = p_budget where id = p_job;

  delete from public.job_rooms where job_id = p_job;
  insert into public.job_rooms (job_id, room_id, quantity, notes)
  select p_job, r.id,
         greatest(1, least(20, coalesce((x->>'quantity')::smallint, 1))),
         nullif(btrim(x->>'notes'), '')
  from jsonb_array_elements(coalesce(p_rooms, '[]')) x
  join public.rooms r on r.slug = x->>'slug';

  return jsonb_build_object('guid', p_job,
    'budget', (select budget from public.jobs where id = p_job),
    'rooms', private.job_rooms_json(p_job));
end;
$$;
revoke execute on function public.api_set_claim(uuid, integer, jsonb) from public, anon;
grant execute on function public.api_set_claim(uuid, integer, jsonb) to authenticated;
