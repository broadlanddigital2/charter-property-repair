-- Room items: what a room needs (Kitchen -> Kitchen units, Worktops, Sinks, Taps…).
-- Each product in a room belongs to one item. The item comes from the room rule
-- that tagged it (room_rules.item_name, editable in Admin > Rooms) or, when the
-- rule has none, from a sensible grouping of the product's category.
-- Claim users pick products per claim / room / item, with quantities.

alter table public.room_rules add column item_name text;
alter table public.product_rooms add column item text;
create index product_rooms_room_item_idx on public.product_rooms (room_id, item);

-- Default grouping of a category into a room item.
create or replace function private.default_item(p_cat text, p_parent text, p_room text)
returns text language sql immutable set search_path = ''
as $$
  select case
    when c ~ 'worktop' then 'Worktops'
    when c ~ 'paint|emulsion|varnish|dye' or p in ('colours', 'emulsion') then 'Paint'
    when c ~ 'sink' then 'Sinks'
    when c ~ 'tap' then 'Taps'
    when c ~ 'oven|hob|cooker|dishwasher|refrigerat|wine cooler|laundry|warming|appliance|disposal|softener|plinth heater' then 'Appliances'
    when c ~ 'handle' and p ~ 'kitchen' then 'Kitchen handles'
    when c ~ 'flat pack|cabinet storage|drawer acc|^kitchens$|cupboard' then
      case when p_room in ('kitchen', 'utility') then 'Kitchen units' else 'Storage' end
    when c ~ 'splashback' then 'Splashbacks'
    when c ~ 'pendant|lighting' then 'Lighting'
    when c ~ 'waste bin' then 'Bins'
    when c ~ 'roof' or p ~ 'roofing' or c ~ 'fascia|soffit|chimney|corrugated' then 'Roofing'
    when c ~ 'tile' then 'Tiles'
    when c ~ 'floor|underlay|scotia|beading|spc' then 'Flooring'
    when c ~ 'skirting|architrave' then 'Skirting & architrave'
    when c ~ 'window board' then 'Window boards'
    when c ~ 'wardrobe' then 'Wardrobe doors'
    when p ~ 'internal doors' then 'Internal doors'
    when p ~ 'external doors' or c ~ 'garage door|aluminium door' then 'External doors'
    when p ~ 'ironmongery' or c ~ 'lock|latch|knob|hook|door acc' then 'Door handles & locks'
    when c ~ 'basin' then 'Basins'
    when c ~ 'shower tray|enclosure' then 'Shower enclosures & trays'
    when c ~ 'shower' then 'Showers'
    when c ~ 'bath' and c !~ 'bathroom' then 'Baths'
    when c ~ 'toilet|bidet|sanitary' then 'Toilets & sanitary'
    when c ~ 'mirror|vanity|cabinet|accessor|curtain' then 'Bathroom furniture & accessories'
    when c ~ 'towel rail|heating|radiator|hanger' then 'Heating'
    when c ~ 'wall panel|wet room' or p ~ 'wall panels' then 'Wall panels'
    when c ~ 'extractor' then 'Ventilation'
    when p ~ 'guttering' then 'Guttering'
    when p ~ 'fencing' then 'Fencing'
    when p ~ 'slabs|landscaping' then 'Paving & landscaping'
    when p ~ 'sheds' then 'Sheds & cabins'
    when p ~ 'bricks' then 'Bricks'
    when c ~ 'cladding' then 'Cladding'
    when c ~ 'window' then 'Windows'
    when c ~ 'manhole' then 'Drainage'
    when c ~ 'fire' then 'Fires'
    when c ~ 'door' then 'Doors'
    else initcap(coalesce(p_cat, 'Other'))
  end
  from (select lower(coalesce(p_cat, '')) c, lower(coalesce(p_parent, '')) p) x
$$;

-- Rule engine: also record each product's item per room.
create or replace function private.apply_room_rules(p_ids uuid[] default null)
returns integer
language plpgsql security definer set search_path = ''
as $$
declare v_n integer;
begin
  delete from public.product_rooms pr
  using public.products p
  where p.id = pr.product_id and not p.rooms_manual
    and (p_ids is null or p.id = any(p_ids));

  with cand as (
    select p.id pid, r.rooms, r.item_name, c.name cat, par.name parent,
           row_number() over (
             partition by p.id
             order by r.priority desc,
                      case when r.category is null then 0
                           when lower(r.category) = lower(c.name) then 2 else 1 end desc,
                      (r.name_pattern is not null) desc, r.created_at, r.id) rn
    from public.products p
    join public.suppliers s  on s.id = p.supplier_id
    join public.categories c on c.id = p.category_id
    left join public.categories par on par.id = c.parent_id
    join public.room_rules r
      on r.active and lower(r.supplier) = lower(s.name)
     and (r.category is null or lower(r.category) in (lower(c.name), lower(coalesce(par.name, ''))))
     and (r.name_pattern is null or (p.name || ' ' || coalesce(p.description, '')) ~* r.name_pattern)
    where not p.rooms_manual and (p_ids is null or p.id = any(p_ids))
  )
  insert into public.product_rooms (product_id, room_id, item)
  select cand.pid, rm.id, coalesce(nullif(btrim(cand.item_name), ''), private.default_item(cand.cat, cand.parent, rm.slug))
  from cand join public.rooms rm on rm.slug = any(cand.rooms)
  where cand.rn = 1
  on conflict do nothing;

  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

-- manual room overrides get the default item for their category
create or replace function private.fill_product_room_item()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.item is null then
    select private.default_item(c.name, par.name, rm.slug) into new.item
    from public.products p
    join public.categories c on c.id = p.category_id
    left join public.categories par on par.id = c.parent_id
    join public.rooms rm on rm.id = new.room_id
    where p.id = new.product_id;
  end if;
  return new;
end;
$$;
create trigger product_rooms_fill_item before insert on public.product_rooms
  for each row execute function private.fill_product_room_item();

alter table public.room_rules disable trigger room_rules_changed;
-- Named items for rules where the category alone is ambiguous.
update public.room_rules set item_name = 'Kitchen doors'
  where supplier = 'Howdens' and category = 'Doors' and name_pattern is null;
update public.room_rules set item_name = 'Internal doors'
  where supplier = 'Howdens' and category = 'Doors' and name_pattern like '^howdens .*(door%';
update public.room_rules set item_name = 'External doors'
  where supplier = 'Howdens' and category = 'Doors' and name_pattern like '%external%';
update public.room_rules set item_name = 'Worktops'
  where supplier = 'Howdens' and category = 'Joinery' and name_pattern like 'worktop%';
update public.room_rules set item_name = 'Skirting & architrave'
  where supplier = 'Howdens' and category = 'Joinery' and name_pattern like 'skirting%';
update public.room_rules set item_name = 'Kitchen panels & mouldings'
  where supplier = 'Howdens' and category = 'Joinery' and name_pattern is null;
update public.room_rules set item_name = 'Kitchen units'
  where supplier = 'Benchmarx' and category = 'Kitchens';
update public.room_rules set item_name = 'Wardrobe doors'
  where supplier = 'Howdens' and category = 'Doors' and name_pattern = 'wardrobe';
update public.room_rules set item_name = 'Tiles'
  where supplier in ('Topps Tiles', 'Chartered Properties');

alter table public.room_rules enable trigger room_rules_changed;

select private.apply_room_rules(null);
update public.product_rooms pr set item = private.default_item(c.name, par.name, rm.slug)
from public.products p join public.categories c on c.id = p.category_id
left join public.categories par on par.id = c.parent_id, public.rooms rm
where pr.item is null and p.id = pr.product_id and rm.id = pr.room_id;

-- ---------------------------------------------------------------------------
-- Selections: basket lines per claim / room / item, with quantity
-- ---------------------------------------------------------------------------
alter table public.basket_lines
  add column job_id   uuid references public.jobs(id) on delete cascade,
  add column room_id  uuid references public.rooms(id) on delete set null,
  add column item     text,
  add column quantity integer not null default 1 check (quantity between 1 and 999);
create unique index basket_lines_selection_uq on public.basket_lines
  (basket_id, job_id, room_id, item, product_id) where job_id is not null;
create index basket_lines_job_idx on public.basket_lines (job_id);

create policy "basket_lines: own basket update" on public.basket_lines
  for update to authenticated
  using (basket_id in (select b.id from public.baskets b))
  with check (basket_id in (select b.id from public.baskets b));

alter table public.order_lines
  add column quantity integer not null default 1,
  add column room_id  uuid references public.rooms(id) on delete set null,
  add column item     text;

-- Budget now counts quantities and only this claim's lines (plus legacy unassigned lines).
create or replace function public.basket_budget(p_basket_id uuid, p_job_id uuid)
returns jsonb
language plpgsql stable set search_path = ''
as $$
declare
  v_budget        integer;
  v_company_band  integer;
  v_in            bigint := 0;
  v_out           bigint := 0;
  v_to_pay        bigint;
begin
  select j.budget, pb.band into v_budget, v_company_band
  from public.jobs j
  join public.companies co on co.id = j.company_id
  left join public.price_bands pb on pb.id = co.price_band_id
  where j.id = p_job_id;
  if not found then
    return null;
  end if;

  select coalesce(sum(ol.price * ol.quantity) filter (where ol.in_budget), 0),
         coalesce(sum(ol.price * ol.quantity) filter (where not coalesce(ol.in_budget, false)), 0)
    into v_in, v_out
  from public.order_lines ol
  join public.orders o on o.id = ol.order_id
  where o.job_id = p_job_id;

  select v_in  + coalesce(sum(p.price * bl.quantity) filter (where public.is_in_budget(pb.band, v_company_band)), 0),
         v_out + coalesce(sum(p.price * bl.quantity) filter (where not public.is_in_budget(pb.band, v_company_band)), 0)
    into v_in, v_out
  from public.basket_lines bl
  join public.products p on p.id = bl.product_id
  left join public.price_bands pb on pb.id = p.price_band_id
  where bl.basket_id = p_basket_id and (bl.job_id = p_job_id or bl.job_id is null);

  if coalesce(v_budget, 0) < v_in then
    v_to_pay := v_in - coalesce(v_budget, 0) + v_out;
  else
    v_to_pay := v_out;
  end if;

  return jsonb_build_object(
    'budget', v_budget,
    'total_in_budget', v_in,
    'total_out_of_budget', v_out,
    'total_remaning_budget', coalesce(v_budget, 0) - v_in,
    'customer_to_pay', v_to_pay
  );
end;
$$;

-- Orders take this claim's lines (and legacy unassigned lines) with quantities.
create or replace function private.create_order_from_basket(
  p_contact_id uuid, p_job_id uuid, p_note_uuid uuid
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_company_id  uuid;
  v_claimant    boolean;
  v_band        integer;
  v_basket_id   uuid;
  v_order_id    uuid;
begin
  select c.company_id, upper(coalesce(c.type, '')) = 'CLAIMANT' into v_company_id, v_claimant
  from public.contacts c where c.id = p_contact_id and c.active;
  if v_company_id is null then
    raise exception 'Contact not found or inactive';
  end if;

  if v_claimant then
    if not exists (select 1 from public.job_contacts jc where jc.job_id = p_job_id and jc.contact_id = p_contact_id) then
      raise exception 'This claim is not linked to you';
    end if;
  elsif not exists (select 1 from public.jobs j where j.id = p_job_id and j.company_id = v_company_id) then
    raise exception 'Job does not belong to this company';
  end if;

  v_basket_id := private.order_basket_id(p_contact_id);
  if v_basket_id is null or not exists (
       select 1 from public.basket_lines
       where basket_id = v_basket_id and (job_id = p_job_id or job_id is null)) then
    raise exception 'Basket is empty';
  end if;

  select pb.band into v_band
  from public.jobs j join public.companies co on co.id = j.company_id
  join public.price_bands pb on pb.id = co.price_band_id
  where j.id = p_job_id;

  insert into public.orders (job_id, service_mate_note_uuid, placed_by)
  values (p_job_id, p_note_uuid, p_contact_id)
  returning id into v_order_id;

  insert into public.order_lines (order_id, product_id, sku, name, price, price_band, in_budget, quantity, room_id, item)
  select v_order_id, p.id, p.sku, p.name, p.price, pb.band, public.is_in_budget(pb.band, v_band),
         bl.quantity, bl.room_id, bl.item
  from public.basket_lines bl
  join public.products p on p.id = bl.product_id
  left join public.price_bands pb on pb.id = p.price_band_id
  where bl.basket_id = v_basket_id and (bl.job_id = p_job_id or bl.job_id is null);

  delete from public.basket_lines where basket_id = v_basket_id and (job_id = p_job_id or job_id is null);
  return v_order_id;
end;
$$;

-- Lines for the ServiceM8 note (service role; used by place-order).
create or replace function public.order_note_lines(p_contact_id uuid, p_job_id uuid)
returns table (quantity integer, name text, description text, sku text, room text, item text)
language sql stable security definer set search_path = ''
as $$
  select bl.quantity, p.name, p.description, p.sku, r.name, bl.item
  from public.basket_lines bl
  join public.products p on p.id = bl.product_id
  left join public.rooms r on r.id = bl.room_id
  where bl.basket_id = private.order_basket_id(p_contact_id)
    and (bl.job_id = p_job_id or bl.job_id is null)
  order by r.sort nulls last, bl.item, p.name
$$;
revoke execute on function public.order_note_lines(uuid, uuid) from public, anon, authenticated;
grant execute on function public.order_note_lines(uuid, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Portal RPCs (security invoker: RLS decides what the caller may see)
-- ---------------------------------------------------------------------------
create or replace function private.my_basket()
returns uuid language sql stable security definer set search_path = ''
as $$
  select b.id from public.baskets b
  where (private.is_claimant() and b.contact_id = private.my_contact_id())
     or (not private.is_claimant() and b.contact_id is null and b.company_id = private.my_company_id())
  limit 1
$$;
grant execute on function private.my_basket() to authenticated;

-- Claim overview: rooms on the claim, their items and progress, plus budget.
create or replace function public.api_claim_view(p_job uuid)
returns jsonb
language plpgsql stable set search_path = ''
as $$
declare
  v_job    public.jobs;
  v_basket uuid := private.my_basket();
begin
  select * into v_job from public.jobs where id = p_job;   -- RLS: only visible claims
  if v_job.id is null then
    raise exception 'Claim not found' using errcode = 'P0002';
  end if;

  return jsonb_build_object(
    'guid', v_job.id, 'job_number', v_job.job_number, 'job_address', v_job.job_address,
    'status', v_job.status, 'budget', v_job.budget,
    'ordered', exists (select 1 from public.orders o where o.job_id = v_job.id),
    'budget_summary', case when v_basket is null then public.basket_budget(null, v_job.id)
                           else public.basket_budget(v_basket, v_job.id) end,
    'rooms', coalesce((
      select jsonb_agg(jsonb_build_object(
        'slug', r.slug, 'name', r.name, 'quantity', jr.quantity, 'notes', jr.notes,
        'items', coalesce((
          select jsonb_agg(jsonb_build_object(
                   'item', i.item, 'products', i.n,
                   'selected', coalesce((select sum(bl.quantity) from public.basket_lines bl
                                         where bl.basket_id = v_basket and bl.job_id = v_job.id
                                           and bl.room_id = r.id and bl.item = i.item), 0))
                 order by i.item)
          from (select pr.item, count(*) n from public.product_rooms pr
                where pr.room_id = r.id group by pr.item) i), '[]'),
        'selected_lines', (select count(*) from public.basket_lines bl
                           where bl.basket_id = v_basket and bl.job_id = v_job.id and bl.room_id = r.id))
        order by r.sort)
      from public.job_rooms jr join public.rooms r on r.id = jr.room_id
      where jr.job_id = v_job.id), '[]'));
end;
$$;

-- Products for one item of one room, with what's already selected on this claim.
create or replace function public.api_item_products(
  p_job uuid, p_room text, p_item text,
  p_search text default null, p_page integer default 1, p_per_page integer default 24
) returns jsonb
language plpgsql stable set search_path = ''
as $$
declare
  v_room   uuid;
  v_band   integer;
  v_basket uuid := private.my_basket();
  v_q      text := nullif(btrim(coalesce(p_search, '')), '');
  v_page   integer := greatest(coalesce(p_page, 1), 1);
  v_per    integer := least(greatest(coalesce(p_per_page, 24), 1), 60);
  v_total  integer;
  v_data   jsonb;
begin
  if not exists (select 1 from public.jobs where id = p_job) then
    raise exception 'Claim not found' using errcode = 'P0002';
  end if;
  select id into v_room from public.rooms where slug = p_room;
  select pb.band into v_band from public.jobs j join public.companies co on co.id = j.company_id
    left join public.price_bands pb on pb.id = co.price_band_id where j.id = p_job;

  select count(*) into v_total
  from public.product_rooms pr join public.products p on p.id = pr.product_id
  where pr.room_id = v_room and pr.item = p_item
    and (v_q is null or p.name ilike '%' || v_q || '%' or p.sku ilike '%' || v_q || '%');

  select coalesce(jsonb_agg(private.product_json(x.prod, v_band) || jsonb_build_object(
           'selected_quantity', coalesce((select bl.quantity from public.basket_lines bl
                                          where bl.basket_id = v_basket and bl.job_id = p_job and bl.room_id = v_room
                                            and bl.item = p_item and bl.product_id = (x.prod).id), 0))
         order by x.in_b desc, (x.prod).price nulls last, (x.prod).name), '[]')
    into v_data
  from (
    select p as prod, public.is_in_budget(pb.band, v_band) in_b
    from public.product_rooms pr
    join public.products p on p.id = pr.product_id
    left join public.price_bands pb on pb.id = p.price_band_id
    where pr.room_id = v_room and pr.item = p_item
      and (v_q is null or p.name ilike '%' || v_q || '%' or p.sku ilike '%' || v_q || '%')
    order by public.is_in_budget(pb.band, v_band) desc, p.price nulls last, p.name
    offset (v_page - 1) * v_per limit v_per
  ) x;

  return jsonb_build_object('total', v_total, 'page', v_page, 'per_page', v_per, 'data', v_data);
end;
$$;

-- Add / change / remove a selection. quantity 0 removes it.
create or replace function public.api_set_selection(
  p_job uuid, p_room text, p_item text, p_product uuid, p_quantity integer
) returns jsonb
language plpgsql volatile set search_path = ''
as $$
declare
  v_room   uuid;
  v_basket uuid := private.my_basket();
  v_qty    integer := greatest(0, least(coalesce(p_quantity, 0), 999));
begin
  if not exists (select 1 from public.jobs where id = p_job) then
    raise exception 'Claim not found' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.orders where job_id = p_job) then
    raise exception 'This claim has already been ordered' using errcode = '22023';
  end if;
  select id into v_room from public.rooms where slug = p_room;
  if v_room is null or not exists (select 1 from public.job_rooms where job_id = p_job and room_id = v_room) then
    raise exception 'That room is not part of this claim' using errcode = '22023';
  end if;
  if not exists (select 1 from public.product_rooms where product_id = p_product and room_id = v_room and item = p_item) then
    raise exception 'That product is not available for this item' using errcode = '22023';
  end if;

  if v_basket is null then
    insert into public.baskets (company_id)
    select company_id from public.contacts where user_id = auth.uid() and active limit 1
    returning id into v_basket;   -- claimants get a personal basket via trigger
  end if;

  if v_qty = 0 then
    delete from public.basket_lines
    where basket_id = v_basket and job_id = p_job and room_id = v_room and item = p_item and product_id = p_product;
  else
    insert into public.basket_lines (basket_id, product_id, job_id, room_id, item, quantity)
    values (v_basket, p_product, p_job, v_room, p_item, v_qty)
    on conflict (basket_id, job_id, room_id, item, product_id) where job_id is not null
    do update set quantity = excluded.quantity, updated_at = now();
  end if;

  return jsonb_build_object('basket', v_basket, 'quantity', v_qty,
                            'budget_summary', public.basket_budget(v_basket, p_job));
end;
$$;

-- Everything selected on a claim (review page), grouped client-side.
create or replace function public.api_claim_selection(p_job uuid)
returns jsonb
language sql stable set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'room', r.slug, 'room_name', r.name, 'item', bl.item, 'quantity', bl.quantity,
           'product', private.product_json(p, (select pb.band from public.jobs j join public.companies co on co.id = j.company_id
                                                left join public.price_bands pb on pb.id = co.price_band_id where j.id = p_job)))
         order by r.sort, bl.item, p.name), '[]')
  from public.basket_lines bl
  join public.products p on p.id = bl.product_id
  join public.rooms r on r.id = bl.room_id
  where bl.basket_id = private.my_basket() and bl.job_id = p_job
    and exists (select 1 from public.jobs where id = p_job)
$$;

revoke execute on function public.api_claim_view(uuid), public.api_item_products(uuid, text, text, text, integer, integer),
  public.api_set_selection(uuid, text, text, uuid, integer), public.api_claim_selection(uuid) from public, anon;
grant execute on function public.api_claim_view(uuid), public.api_item_products(uuid, text, text, text, integer, integer),
  public.api_set_selection(uuid, text, text, uuid, integer), public.api_claim_selection(uuid) to authenticated;
