-- Admin Categories screen: list the products inside a category (including its
-- sub-categories) and show product counts per category.

drop function if exists public.api_products_page(text, integer, integer, text);
create or replace function public.api_products_page(
  p_search text default null, p_page integer default 1, p_per_page integer default 10,
  p_room text default null, p_category uuid default null
) returns jsonb
language plpgsql stable set search_path = ''
as $$
declare
  v_page  integer := greatest(coalesce(p_page, 1), 1);
  v_per   integer := least(greatest(coalesce(p_per_page, 10), 1), 100);
  v_q     text := nullif(btrim(coalesce(p_search, '')), '');
  v_room  text := nullif(btrim(coalesce(p_room, '')), '');
  v_cats  uuid[];
  v_band  integer := private.my_company_band();
  v_total integer;
  v_data  jsonb;
begin
  if p_category is not null then
    with recursive t as (
      select id from public.categories where id = p_category
      union all
      select c.id from public.categories c join t on c.parent_id = t.id
    ) select array_agg(id) into v_cats from t;
  end if;

  select count(*) into v_total
  from public.products p
  where (v_q is null or p.name ilike '%' || v_q || '%' or p.sku ilike '%' || v_q || '%')
    and (v_cats is null or p.category_id = any(v_cats))
    and (v_room is null
         or (v_room = 'none' and not exists (select 1 from public.product_rooms pr where pr.product_id = p.id))
         or exists (select 1 from public.product_rooms pr join public.rooms r on r.id = pr.room_id
                    where pr.product_id = p.id and r.slug = v_room));

  select coalesce(jsonb_agg(private.product_json(x, v_band) order by x.name, x.id), '[]') into v_data
  from (
    select p.* from public.products p
    where (v_q is null or p.name ilike '%' || v_q || '%' or p.sku ilike '%' || v_q || '%')
      and (v_cats is null or p.category_id = any(v_cats))
      and (v_room is null
           or (v_room = 'none' and not exists (select 1 from public.product_rooms pr where pr.product_id = p.id))
           or exists (select 1 from public.product_rooms pr join public.rooms r on r.id = pr.room_id
                      where pr.product_id = p.id and r.slug = v_room))
    order by p.name, p.id
    offset (v_page - 1) * v_per limit v_per
  ) x;

  return jsonb_build_object('total', v_total, 'page', v_page, 'per_page', v_per, 'data', v_data);
end;
$$;
revoke execute on function public.api_products_page(text, integer, integer, text, uuid) from public, anon;
grant execute on function public.api_products_page(text, integer, integer, text, uuid) to authenticated;

-- { "<category guid>": { "own": n, "total": n incl. sub-categories, "suppliers": [...] } }
create or replace function public.api_category_counts()
returns jsonb
language sql stable set search_path = ''
as $$
  with own as (
    select category_id, count(*) n from public.products group by category_id
  ), sup as (
    select p.category_id, jsonb_agg(distinct s.name) names
    from public.products p join public.suppliers s on s.id = p.supplier_id group by p.category_id
  )
  select coalesce(jsonb_object_agg(c.id, jsonb_build_object(
           'own', coalesce(o.n, 0),
           'total', coalesce(o.n, 0) + coalesce((select sum(o2.n) from public.categories ch
                                                 join own o2 on o2.category_id = ch.id
                                                 where ch.parent_id = c.id), 0),
           'suppliers', coalesce(sp.names, '[]'))), '{}')
  from public.categories c
  left join own o on o.category_id = c.id
  left join sup sp on sp.category_id = c.id
$$;
revoke execute on function public.api_category_counts() from public, anon;
grant execute on function public.api_category_counts() to authenticated;
