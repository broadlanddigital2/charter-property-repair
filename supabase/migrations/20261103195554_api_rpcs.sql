-- Read RPCs returning the same JSON shapes the legacy Laravel API returned,
-- so the existing Next.js screens work unchanged. All are SECURITY INVOKER:
-- row-level security applies to the caller.

-- add legacy `guid` alongside `id`, booleans as 0/1 like Laravel/MySQL
create or replace function private.legacy(j jsonb)
returns jsonb
language sql immutable set search_path = ''
as $$
  select j
    || jsonb_build_object('guid', j->'id')
    || (select coalesce(jsonb_object_agg(k, case when (j->>k)::boolean then 1 else 0 end), '{}'::jsonb)
        from unnest(array['active','is_primary_contact','price_has_vat','is_individual']) k
        where jsonb_typeof(j->k) = 'boolean')
$$;
grant execute on function private.legacy(jsonb) to authenticated;

create or replace function private.product_json(p public.products, p_company_band integer)
returns jsonb
language sql stable set search_path = ''
as $$
  select private.legacy(to_jsonb(p))
    || jsonb_build_object(
         'in_budget', case when public.is_in_budget(pb.band, p_company_band) then 1 else 0 end,
         'supplier',  (select private.legacy(to_jsonb(s)) from public.suppliers s where s.id = p.supplier_id),
         'category',  (select private.legacy(to_jsonb(c)) from public.categories c where c.id = p.category_id),
         'price_band', case when pb.id is null then null else private.legacy(to_jsonb(pb)) end)
  from (select 1) _
  left join public.price_bands pb on pb.id = p.price_band_id
$$;
grant execute on function private.product_json(public.products, integer) to authenticated;

-- GET /api/user
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
                    'orders', coalesce((select jsonb_agg(private.legacy(to_jsonb(o)) order by o.created_at)
                                        from public.orders o where o.job_id = j.id), '[]'))
                  order by j.created_at desc)
                  from public.jobs j where j.company_id = co.id), '[]'))
     from public.companies co where co.id = c.company_id))
  from public.contacts c
  where c.user_id = auth.uid()
  limit 1
$$;

-- GET /api/product/{guid}
create or replace function public.api_product(p_id uuid)
returns jsonb
language sql stable set search_path = ''
as $$
  select private.product_json(p, private.my_company_band()) from public.products p where p.id = p_id
$$;

-- GET /api/product (all) — optionally restricted to a set of ids
create or replace function public.api_products(p_ids uuid[] default null)
returns jsonb
language sql stable set search_path = ''
as $$
  select coalesce(jsonb_agg(private.product_json(p, private.my_company_band()) order by p.name), '[]')
  from public.products p
  where p_ids is null or p.id = any(p_ids)
$$;

-- GET /api/product/by-category/{guid}?page&per_page&with_children  (Laravel paginator shape)
create or replace function public.api_products_by_category(
  p_category_id uuid, p_with_children boolean default false, p_page integer default 1, p_per_page integer default 20
) returns jsonb
language plpgsql stable set search_path = ''
as $$
declare
  v_band   integer := private.my_company_band();
  v_page   integer := greatest(coalesce(p_page, 1), 1);
  v_per    integer := least(greatest(coalesce(p_per_page, 20), 1), 200);
  v_total  integer;
  v_data   jsonb;
  v_last   integer;
  v_path   text := '/product/by-category/' || p_category_id;
  v_ids    uuid[];
begin
  v_ids := case when p_with_children
                then array(select public.category_descendant_ids(p_category_id))
                else array[p_category_id] end;

  select count(*) into v_total
  from public.products p
  where p.category_id = any(v_ids) and coalesce(p.image, '') <> '';

  -- legacy: page by default order, then sort the page by in_budget ascending
  select coalesce(jsonb_agg(x.j order by (x.j->>'in_budget')::int, x.ord), '[]') into v_data
  from (
    select private.product_json(p, v_band) j, row_number() over (order by p.legacy_id nulls last, p.created_at, p.id) ord
    from public.products p
    where p.category_id = any(v_ids) and coalesce(p.image, '') <> ''
    order by p.legacy_id nulls last, p.created_at, p.id
    offset (v_page - 1) * v_per limit v_per
  ) x;

  v_last := greatest(ceil(v_total::numeric / v_per)::int, 1);
  return jsonb_build_object(
    'current_page', v_page,
    'data', v_data,
    'from', case when v_total = 0 then null else (v_page - 1) * v_per + 1 end,
    'to', case when v_total = 0 then null else least(v_page * v_per, v_total) end,
    'last_page', v_last,
    'per_page', v_per,
    'total', v_total,
    'path', v_path,
    'next_page_url', case when v_page < v_last then v_path || '?page=' || (v_page + 1) end,
    'prev_page_url', case when v_page > 1 then v_path || '?page=' || (v_page - 1) end
  );
end;
$$;

-- GET /api/basket/{guid}?job_guid=
create or replace function public.api_basket(p_basket_id uuid, p_job_id uuid default null)
returns jsonb
language sql stable set search_path = ''
as $$
  select jsonb_build_object(
    'status', 'OK',
    'basket', private.legacy(to_jsonb(b)) || jsonb_build_object('basket_lines',
       coalesce((select jsonb_agg(private.legacy(to_jsonb(bl)) || jsonb_build_object(
                   'product', private.product_json(p, private.my_company_band()))
                 order by bl.created_at)
                 from public.basket_lines bl join public.products p on p.id = bl.product_id
                 where bl.basket_id = b.id), '[]')),
    'budget', case when p_job_id is null then null else public.basket_budget(b.id, p_job_id) end)
  from public.baskets b where b.id = p_basket_id
$$;

-- GET /api/order/{guid}
create or replace function public.api_order(p_order_id uuid)
returns jsonb
language sql stable set search_path = ''
as $$
  select private.legacy(to_jsonb(o)) || jsonb_build_object(
    'job', (select private.legacy(to_jsonb(j)) from public.jobs j where j.id = o.job_id),
    'order_lines', coalesce((
      select jsonb_agg(private.legacy(to_jsonb(ol)) || jsonb_build_object('product',
               coalesce(
                 (select private.product_json(p, private.my_company_band()) from public.products p where p.id = ol.product_id),
                 jsonb_build_object('guid', null, 'sku', ol.sku, 'name', ol.name, 'price', ol.price,
                                    'in_budget', case when ol.in_budget then 1 else 0 end, 'image', null)))
             order by ol.created_at)
      from public.order_lines ol where ol.order_id = o.id), '[]'))
  from public.orders o where o.id = p_order_id
$$;

-- GET /api/company (admin) with contacts + price band
create or replace function public.api_companies()
returns jsonb
language sql stable set search_path = ''
as $$
  select coalesce(jsonb_agg(private.legacy(to_jsonb(co)) || jsonb_build_object(
    'price_bands', (select private.legacy(to_jsonb(pb)) from public.price_bands pb where pb.id = co.price_band_id),
    'contacts', coalesce((select jsonb_agg(private.legacy(to_jsonb(c)) order by c.name)
                          from public.contacts c where c.company_id = co.id), '[]'))
    order by co.name), '[]')
  from public.companies co
$$;

revoke execute on function public.api_me(), public.api_product(uuid), public.api_products(uuid[]),
  public.api_products_by_category(uuid, boolean, integer, integer), public.api_basket(uuid, uuid),
  public.api_order(uuid), public.api_companies(), public.basket_budget(uuid, uuid),
  public.category_tree(), public.category_descendant_ids(uuid) from public, anon;
grant execute on function public.api_me(), public.api_product(uuid), public.api_products(uuid[]),
  public.api_products_by_category(uuid, boolean, integer, integer), public.api_basket(uuid, uuid),
  public.api_order(uuid), public.api_companies(), public.basket_budget(uuid, uuid),
  public.category_tree(), public.category_descendant_ids(uuid) to authenticated;
