-- Product filters: normalised attributes (Colour, Finish, Material, Style, Range…)
-- extracted from each supplier's own data, so every item in a room can offer the
-- filters that make sense for its products.

create table public.product_attrs (
  product_id uuid not null references public.products(id) on delete cascade,
  key        text not null,
  value      text not null,
  primary key (product_id, key, value)
);
create index product_attrs_key_value_idx on public.product_attrs (key, value);

alter table public.product_attrs enable row level security;
create policy "product_attrs: active users read" on public.product_attrs
  for select to authenticated using ((select private.is_active_user()));
create policy "product_attrs: admins write" on public.product_attrs
  for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

-- Parse JSON text, returning {} for anything malformed (supplier data is messy)
create or replace function private.try_jsonb(t text)
returns jsonb language plpgsql immutable set search_path = ''
as $$
begin
  if t is null or t !~ '^\s*\{' then return '{}'; end if;
  return t::jsonb;
exception when others then
  return '{}';
end;
$$;

-- Supplier attribute name -> common filter name (null = not used as a filter)
create or replace function private.attr_key(k text)
returns text language sql immutable set search_path = ''
as $$
  select case
    when x in ('colour', 'color', 'colour description', 'colour family', 'attr_colour') then 'Colour'
    when x in ('finish', 'attr_finish', 'surface finish') then 'Finish'
    when x in ('material', 'door material', 'window material', 'cabinet material', 'core material') then 'Material'
    when x in ('style', 'door style', 'cabinet style', 'attr_style', 'design') then 'Style'
    when x in ('range', 'product range', 'kitchen range', 'collection', 'range description') then 'Range'
    when x in ('type', 'product type', 'attr_type') then 'Type'
    when x in ('brand name', 'brand') then 'Brand'
    when x in ('width', 'width (mm)') then 'Width'
    when x in ('height', 'height (mm)') then 'Height'
    when x in ('depth', 'depth (mm)', 'projection (mm)') then 'Depth'
    when x in ('length', 'length (mm)') then 'Length'
    when x in ('thickness', 'thickness (mm)') then 'Thickness'
    when x in ('glazing type') then 'Glazing'
    when x in ('fire rating', 'fire resistance minutes') then 'Fire rating'
    when x in ('shape') then 'Shape'
    when x in ('mounting') then 'Mounting'
    when x in ('opening direction') then 'Opening'
    when x in ('number of doors') then 'Doors'
    when x in ('energy efficiency rating') then 'Energy rating'
    when x in ('interior or exterior use', 'location', 'suitable application') then 'Use'
    when x in ('pattern') then 'Pattern'
    else null
  end
  from (select lower(btrim(coalesce(k, ''))) x) s
$$;

-- Colour words -> a simple colour family
create or replace function private.colour_family(v text)
returns text language sql immutable set search_path = ''
as $$
  select case
    when x = '' then null
    when x ~ 'white|porcelain|snow|alabaster' then 'White'
    when x ~ 'cream|ivory|magnolia|vanilla|linen|ecru' then 'Cream'
    when x ~ 'grey|gray|graphite|anthracite|slate|stone|dove|charcoal|pebble|concrete|cement|dusk' then 'Grey'
    when x ~ 'black|ebony|jet' then 'Black'
    when x ~ 'blue|navy|marine|denim|teal' then 'Blue'
    when x ~ 'green|sage|reed|olive|seafoam|mint|lime' then 'Green'
    when x ~ 'oak|walnut|wood|timber|pine|ash|beech|cherry|teak|maple|birch' then 'Wood effect'
    when x ~ 'beige|sand|taupe|cashmere|neutral|mushroom|biscuit|latte|natural' then 'Beige / neutral'
    when x ~ 'brown|bronze|coffee|chocolate|mocha' then 'Brown'
    when x ~ 'red|burgundy|terracotta|rose|pink|coral' then 'Red / pink'
    when x ~ 'yellow|mustard|ochre|gold|brass' then 'Yellow / gold'
    when x ~ 'orange|copper|rust' then 'Orange / copper'
    when x ~ 'violet|purple|lilac|plum|lavender' then 'Purple'
    when x ~ 'chrome|silver|stainless|steel|nickel|aluminium|satin' then 'Chrome / metal'
    when x ~ 'clear|frosted|glass|mirror' then 'Clear / glass'
    else null
  end
  from (select lower(coalesce(v, '')) x) s
$$;

-- Tidy a value: trim, collapse spaces, sensible case, normalise mm sizes
create or replace function private.attr_value(k text, v text)
returns text language sql immutable set search_path = ''
as $$
  select case
    when t = '' or t in ('-', 'n/a', 'na', 'none', 'null') then null
    when k in ('Width', 'Height', 'Depth', 'Length', 'Thickness')
      then case when t ~ '^\d+(\.\d+)?\s*(mm)?$' then regexp_replace(t, '\s*(mm)?$', '') || ' mm' else t end
    when t = upper(t) or t = lower(t) then initcap(t)
    else t
  end
  from (select btrim(regexp_replace(coalesce(v, ''), '\s+', ' ', 'g')) t) s
$$;

-- All filter attributes for a set of products (null = all)
create or replace function private.refresh_product_attrs(p_ids uuid[] default null)
returns integer
language plpgsql security definer set search_path = ''
as $$
declare v_n integer;
begin
  delete from public.product_attrs where p_ids is null or product_id = any(p_ids);

  with src as (
    select p.id, p.name, p.manufacturer, p.miscellaneous m, s.name supplier, c.name cat, par.name parent
    from public.products p
    join public.suppliers s on s.id = p.supplier_id
    left join public.categories c on c.id = p.category_id
    left join public.categories par on par.id = c.parent_id
    where p_ids is null or p.id = any(p_ids)
  ), raw as (
    -- JSON objects stored as text (Howdens specifications / measurements)
    select src.id, kv.key k, kv.value v from src,
      lateral jsonb_each_text(private.try_jsonb(src.m->>'specifications')) kv
    union all
    select src.id, kv.key, kv.value from src,
      lateral jsonb_each_text(private.try_jsonb(src.m->>'measurements')) kv
    union all
    -- "Key: value | Key: value" text (Travis Perkins, Eastbrooke)
    select src.id, btrim(split_part(part, ':', 1)), btrim(substr(part, strpos(part, ':') + 1)) from src,
      lateral unnest(string_to_array(
        coalesce(src.m->>'technicalSpecifications',
                 case when (src.m->>'specifications') !~ '^\s*\{' then src.m->>'specifications' end), ' | ')) part
    where part like '%:%'
    union all
    -- flat keys (Benchmarx attr_*, Chartered Properties)
    select src.id, kv.key, kv.value from src,
      lateral jsonb_each_text(case when jsonb_typeof(src.m) = 'object' then src.m else '{}' end) kv
    where kv.key in ('attr_colour', 'attr_finish', 'attr_style', 'attr_type', 'material', 'finish')
    union all
    select src.id, 'Brand', src.manufacturer from src where nullif(btrim(src.manufacturer), '') is not null
    union all
    -- Chartered Properties wall/floor ticks
    select src.id, 'Use', 'Wall' from src where src.m->>'wall' = '✓'
    union all
    select src.id, 'Use', 'Floor' from src where src.m->>'floor' = '✓'
    union all
    -- Dulux colour groups are categories (Colours > Blue)
    select src.id, 'Colour', src.cat from src where lower(coalesce(src.parent, '')) = 'colours'
    union all
    -- tile sizes in the name, e.g. "(33cm x 33cm)"
    select src.id, 'Size', (regexp_match(src.name, '(\d+(?:\.\d+)?\s?cm\s?x\s?\d+(?:\.\d+)?\s?cm)', 'i'))[1]
    from src where src.name ~* '\d+(\.\d+)?\s?cm\s?x\s?\d+'
    union all
    -- finish words in the name when the supplier gives none
    select src.id, 'Finish', initcap((regexp_match(lower(src.name), '\m(matt|gloss|satin|polished|textured|lappato|eggshell|silk)\M'))[1])
    from src where lower(src.name) ~ '\m(matt|gloss|satin|polished|textured|lappato|eggshell|silk)\M'
  ), keyed as (
    select id, coalesce(private.attr_key(k), case when k in ('Brand', 'Use', 'Colour', 'Size', 'Finish') then k end) key, v
    from raw
  ), vals as (
    select id, key,
           case when key = 'Colour' then coalesce(private.colour_family(v), private.attr_value(key, v))
                else private.attr_value(key, v) end value
    from keyed where key is not null
    union all
    -- colour family from the name when no colour attribute exists
    select src.id, 'Colour', private.colour_family(src.name) from src
    where private.colour_family(src.name) is not null
      and not exists (select 1 from keyed k2 where k2.id = src.id and k2.key = 'Colour')
  )
  insert into public.product_attrs (product_id, key, value)
  select distinct id, key, left(value, 80) from vals
  where value is not null and length(value) <= 80
  on conflict do nothing;

  get diagnostics v_n = row_count;
  return v_n;
end;
$$;
revoke execute on function private.refresh_product_attrs(uuid[]) from public, anon, authenticated;

create or replace function private.products_attrs_trg()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  perform private.refresh_product_attrs(array(select id from new_rows));
  return null;
end;
$$;
create trigger products_attrs_ins after insert on public.products
  referencing new table as new_rows for each statement execute function private.products_attrs_trg();
create trigger products_attrs_upd after update on public.products
  referencing new table as new_rows for each statement execute function private.products_attrs_trg();

select private.refresh_product_attrs(null);

-- ---------------------------------------------------------------------------
-- Filters for one item of a room: the attributes most of its products have.
-- ---------------------------------------------------------------------------
create or replace function public.api_item_filters(p_job uuid, p_room text, p_item text)
returns jsonb
language plpgsql stable set search_path = ''
as $$
declare
  v_room  uuid;
  v_total integer;
begin
  if not exists (select 1 from public.jobs where id = p_job) then
    raise exception 'Claim not found' using errcode = 'P0002';
  end if;
  select id into v_room from public.rooms where slug = p_room;
  select count(*) into v_total from public.product_rooms where room_id = v_room and item = p_item;
  if coalesce(v_total, 0) = 0 then return '[]'; end if;

  return coalesce((
    with a as (
      select pa.key, pa.value, count(*) n
      from public.product_rooms pr join public.product_attrs pa on pa.product_id = pr.product_id
      where pr.room_id = v_room and pr.item = p_item
      group by pa.key, pa.value
    ), k as (
      select key, count(*) distinct_values, sum(n) covered
      from a group by key
      having count(*) between 2 and 200
         and sum(n) >= greatest(3, v_total * 0.2)   -- most products have it
    )
    select jsonb_agg(jsonb_build_object(
             'key', k.key,
             'values', (select jsonb_agg(jsonb_build_object('value', a.value, 'count', a.n)
                                         order by a.n desc, a.value)
                        from (select * from a where a.key = k.key order by n desc, value limit 30) a))
           order by array_position(array['Colour','Finish','Style','Material','Range','Type','Size','Width','Height',
                                         'Depth','Length','Thickness','Use','Shape','Glazing','Opening','Doors',
                                         'Fire rating','Energy rating','Mounting','Pattern','Brand'], k.key) nulls last)
    from k
    where k.key in (select key from k order by
                      array_position(array['Colour','Finish','Style','Material','Range','Type','Size','Width','Height',
                                           'Depth','Length','Thickness','Use','Shape','Glazing','Opening','Doors',
                                           'Fire rating','Energy rating','Mounting','Pattern','Brand'], key) nulls last
                    limit 6)
  ), '[]');
end;
$$;

-- Item products, now filterable: p_filters = {"Colour": ["White","Grey"], "Finish": ["Matt"]}
-- (OR within a filter, AND across filters)
drop function if exists public.api_item_products(uuid, text, text, text, integer, integer);
create or replace function public.api_item_products(
  p_job uuid, p_room text, p_item text,
  p_search text default null, p_page integer default 1, p_per_page integer default 24,
  p_filters jsonb default null
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
  v_f      jsonb := case when jsonb_typeof(p_filters) = 'object' then p_filters else '{}' end;
  v_total  integer;
  v_data   jsonb;
  v_ids    uuid[];
begin
  if not exists (select 1 from public.jobs where id = p_job) then
    raise exception 'Claim not found' using errcode = 'P0002';
  end if;
  select id into v_room from public.rooms where slug = p_room;
  select pb.band into v_band from public.jobs j join public.companies co on co.id = j.company_id
    left join public.price_bands pb on pb.id = co.price_band_id where j.id = p_job;

  select coalesce(array_agg(p.id), '{}') into v_ids
  from public.product_rooms pr join public.products p on p.id = pr.product_id
  where pr.room_id = v_room and pr.item = p_item
    and (v_q is null or p.name ilike '%' || v_q || '%' or p.sku ilike '%' || v_q || '%')
    and not exists (
      select 1 from jsonb_each(v_f) f
      where jsonb_typeof(f.value) = 'array' and jsonb_array_length(f.value) > 0
        and not exists (select 1 from public.product_attrs pa
                        where pa.product_id = p.id and pa.key = f.key
                          and pa.value in (select jsonb_array_elements_text(f.value))));

  v_total := cardinality(v_ids);

  select coalesce(jsonb_agg(private.product_json(x.prod, v_band) || jsonb_build_object(
           'selected_quantity', coalesce((select bl.quantity from public.basket_lines bl
                                          where bl.basket_id = v_basket and bl.job_id = p_job and bl.room_id = v_room
                                            and bl.item = p_item and bl.product_id = (x.prod).id), 0))
         order by x.in_b desc, (x.prod).price nulls last, (x.prod).name), '[]')
    into v_data
  from (
    select p as prod, public.is_in_budget(pb.band, v_band) in_b
    from public.products p
    left join public.price_bands pb on pb.id = p.price_band_id
    where p.id = any(v_ids)
    order by public.is_in_budget(pb.band, v_band) desc, p.price nulls last, p.name
    offset (v_page - 1) * v_per limit v_per
  ) x;

  return jsonb_build_object('total', v_total, 'page', v_page, 'per_page', v_per, 'data', v_data);
end;
$$;

revoke execute on function public.api_item_filters(uuid, text, text),
  public.api_item_products(uuid, text, text, text, integer, integer, jsonb) from public, anon;
grant execute on function public.api_item_filters(uuid, text, text),
  public.api_item_products(uuid, text, text, text, integer, integer, jsonb) to authenticated;
