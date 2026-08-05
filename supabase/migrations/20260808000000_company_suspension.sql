-- تعليق/تفعيل اشتراك شركة (المالك النظامي بس يقدر يسويها، عبر edge function
-- بصلاحية service_role). الشركة الموقوفة تقدر تسجّل دخول وتشوف بياناتها
-- القديمة بس ما تقدر تضيف أو تعدّل أو تحذف أي شي جديد لين تنفعّل مره ثانية.

alter table public.settings add column if not exists suspended boolean not null default false;

create or replace function public.is_company_suspended()
returns boolean
language sql security definer stable
set search_path = public
as $$
  select coalesce(
    (select suspended from public.settings where company_id = public.my_company_id() limit 1),
    false
  );
$$;

grant execute on function public.is_company_suspended() to authenticated;

-- settings: التحديث (حفظ الإعدادات، تحديث رصيد القاصة بعد كل حركة) يتوقف
-- إذا الشركة موقوفة
drop policy if exists "settings_update" on public.settings;
create policy "settings_update" on public.settings for update
  using (company_id = public.my_company_id())
  with check (company_id = public.my_company_id() and not public.is_company_suspended());

-- moves: إضافة/تعديل/حذف حركة صندوق تتوقف إذا الشركة موقوفة
drop policy if exists "moves_insert" on public.moves;
create policy "moves_insert" on public.moves for insert
  with check (company_id = public.my_company_id() and not public.is_company_suspended());
drop policy if exists "moves_update" on public.moves;
create policy "moves_update" on public.moves for update
  using (company_id = public.my_company_id() and public.my_role() = 'owner')
  with check (company_id = public.my_company_id() and public.my_role() = 'owner' and not public.is_company_suspended());
drop policy if exists "moves_delete" on public.moves;
create policy "moves_delete" on public.moves for delete
  using (company_id = public.my_company_id() and public.my_role() = 'owner' and not public.is_company_suspended());

-- sayarfa_moves: نفس المبدأ
drop policy if exists "sayarfa_moves_insert" on public.sayarfa_moves;
create policy "sayarfa_moves_insert" on public.sayarfa_moves for insert
  with check (company_id = public.my_company_id() and not public.is_company_suspended());
drop policy if exists "sayarfa_moves_update" on public.sayarfa_moves;
create policy "sayarfa_moves_update" on public.sayarfa_moves for update
  using (company_id = public.my_company_id() and public.my_role() = 'owner')
  with check (company_id = public.my_company_id() and public.my_role() = 'owner' and not public.is_company_suspended());
drop policy if exists "sayarfa_moves_delete" on public.sayarfa_moves;
create policy "sayarfa_moves_delete" on public.sayarfa_moves for delete
  using (company_id = public.my_company_id() and public.my_role() = 'owner' and not public.is_company_suspended());

-- customers: نفس المبدأ
drop policy if exists "customers_insert" on public.customers;
create policy "customers_insert" on public.customers for insert
  with check (company_id = public.my_company_id() and public.my_role() = 'owner' and not public.is_company_suspended());
drop policy if exists "customers_update" on public.customers;
create policy "customers_update" on public.customers for update
  using (company_id = public.my_company_id())
  with check (company_id = public.my_company_id() and not public.is_company_suspended());
drop policy if exists "customers_delete" on public.customers;
create policy "customers_delete" on public.customers for delete
  using (company_id = public.my_company_id() and public.my_role() = 'owner' and not public.is_company_suspended());
