-- Performance: evaluate "who am I" once per query (initplan), not once per row.
-- The per-row private.can_see_job() made a full scan of jobs take ~4s.

drop policy if exists "jobs: visible claims" on public.jobs;
create policy "jobs: visible claims" on public.jobs
  for select to authenticated
  using (
    (select private.is_admin())
    or (not (select private.is_claimant()) and company_id = (select private.my_company_id()))
    or ((select private.is_claimant())
        and id in (select jc.job_id from public.job_contacts jc where jc.contact_id = (select private.my_contact_id())))
  );

-- children follow the jobs policy through a subquery on jobs
drop policy if exists "job_rooms: visible claims" on public.job_rooms;
create policy "job_rooms: visible claims" on public.job_rooms
  for select to authenticated
  using ((select private.is_admin()) or job_id in (select j.id from public.jobs j));

drop policy if exists "orders: visible claims" on public.orders;
create policy "orders: visible claims" on public.orders
  for select to authenticated
  using ((select private.is_admin()) or job_id in (select j.id from public.jobs j));

drop policy if exists "order_lines: visible claims" on public.order_lines;
create policy "order_lines: visible claims" on public.order_lines
  for select to authenticated
  using ((select private.is_admin()) or order_id in (select o.id from public.orders o));

drop policy if exists "baskets: own read" on public.baskets;
drop policy if exists "baskets: own create" on public.baskets;
create policy "baskets: own read" on public.baskets
  for select to authenticated
  using (
    (select private.is_admin())
    or (not (select private.is_claimant()) and contact_id is null and company_id = (select private.my_company_id()))
    or ((select private.is_claimant()) and contact_id = (select private.my_contact_id()))
  );
create policy "baskets: own create" on public.baskets
  for insert to authenticated
  with check (
    (select private.is_admin())
    or (not (select private.is_claimant()) and contact_id is null and company_id = (select private.my_company_id()))
    or ((select private.is_claimant()) and contact_id = (select private.my_contact_id()))
  );

drop policy if exists "basket_lines: own basket read" on public.basket_lines;
drop policy if exists "basket_lines: own basket add" on public.basket_lines;
drop policy if exists "basket_lines: own basket remove" on public.basket_lines;
create policy "basket_lines: own basket read" on public.basket_lines
  for select to authenticated using (basket_id in (select b.id from public.baskets b));
create policy "basket_lines: own basket add" on public.basket_lines
  for insert to authenticated with check (basket_id in (select b.id from public.baskets b));
create policy "basket_lines: own basket remove" on public.basket_lines
  for delete to authenticated using (basket_id in (select b.id from public.baskets b));

-- api_me: rely on the jobs policy instead of calling can_see_job per row
create or replace function public.api_me()
returns jsonb
language sql stable set search_path = ''
as $$
  select private.legacy(to_jsonb(c)) || jsonb_build_object('company',
    (select private.legacy(to_jsonb(co)) || jsonb_build_object(
        'price_bands', (select private.legacy(to_jsonb(pb)) from public.price_bands pb where pb.id = co.price_band_id),
        'contacts', coalesce((select jsonb_agg(private.legacy(to_jsonb(cc)) order by cc.name)
                              from public.contacts cc where cc.company_id = co.id), '[]'),
        'basket',   (select private.legacy(to_jsonb(b)) from public.baskets b
                     where b.company_id = co.id order by (b.contact_id is null) limit 1),
        'jobs', coalesce((select jsonb_agg(private.legacy(to_jsonb(j)) || jsonb_build_object(
                    'rooms', private.job_rooms_json(j.id),
                    'orders', coalesce((select jsonb_agg(private.legacy(to_jsonb(o)) order by o.created_at)
                                        from public.orders o where o.job_id = j.id), '[]'))
                  order by j.created_at desc)
                  from public.jobs j
                  where j.company_id = co.id
                     or j.id in (select jc.job_id from public.job_contacts jc where jc.contact_id = c.id)), '[]'))
     from public.companies co where co.id = c.company_id))
  from public.contacts c
  where c.user_id = auth.uid()
  limit 1
$$;
