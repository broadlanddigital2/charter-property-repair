-- Paged / searchable product list for the admin Products screen.
-- (The legacy screen loaded the whole catalogue — 33k products times out.)
create index if not exists products_sku_trgm_idx on public.products using gin (sku extensions.gin_trgm_ops);

create or replace function public.api_products_page(
  p_search text default null, p_page integer default 1, p_per_page integer default 10
) returns jsonb
language plpgsql stable set search_path = ''
as $$
declare
  v_page  integer := greatest(coalesce(p_page, 1), 1);
  v_per   integer := least(greatest(coalesce(p_per_page, 10), 1), 100);
  v_q     text := nullif(btrim(coalesce(p_search, '')), '');
  v_band  integer := private.my_company_band();
  v_total integer;
  v_data  jsonb;
begin
  select count(*) into v_total
  from public.products p
  where v_q is null or p.name ilike '%' || v_q || '%' or p.sku ilike '%' || v_q || '%';

  select coalesce(jsonb_agg(private.product_json(x, v_band) order by x.name, x.id), '[]') into v_data
  from (
    select p.* from public.products p
    where v_q is null or p.name ilike '%' || v_q || '%' or p.sku ilike '%' || v_q || '%'
    order by p.name, p.id
    offset (v_page - 1) * v_per limit v_per
  ) x;

  return jsonb_build_object('total', v_total, 'page', v_page, 'per_page', v_per, 'data', v_data);
end;
$$;

revoke execute on function public.api_products_page(text, integer, integer) from public, anon;
grant execute on function public.api_products_page(text, integer, integer) to authenticated;
