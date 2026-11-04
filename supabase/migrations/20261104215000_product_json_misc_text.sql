-- Legacy API returned products.miscellaneous as a JSON *string* (MySQL json
-- column via Laravel) and both frontends JSON.parse() it. Keep that shape.
create or replace function private.product_json(p public.products, p_company_band integer)
returns jsonb
language sql stable set search_path = ''
as $$
  select private.legacy(to_jsonb(p))
    || jsonb_build_object(
         'miscellaneous', case when p.miscellaneous is null then null else p.miscellaneous::text end,
         'in_budget', case when public.is_in_budget(pb.band, p_company_band) then 1 else 0 end,
         'supplier',  (select private.legacy(to_jsonb(s)) from public.suppliers s where s.id = p.supplier_id),
         'category',  (select private.legacy(to_jsonb(c)) from public.categories c where c.id = p.category_id),
         'price_band', case when pb.id is null then null else private.legacy(to_jsonb(pb)) end)
  from (select 1) _
  left join public.price_bands pb on pb.id = p.price_band_id
$$;
