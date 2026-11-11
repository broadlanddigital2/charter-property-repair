-- Claim view: include the customer's name and price band (budget grade).
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
    'company', (select jsonb_build_object('name', co.name, 'price_band', pb.band)
                from public.companies co left join public.price_bands pb on pb.id = co.price_band_id
                where co.id = v_job.company_id),
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

