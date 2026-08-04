-- صلاحيات متعددة المستخدمين: مالك (owner) + موظف إدخال بس (employee)
-- ==========================================================================
-- الوضع الحالي: كل حساب دخول = شركة واحدة (company_id = auth.uid()). هذا الملف
-- يضيف مفهوم "موظف" يسجّل دخول بحسابه الخاص بس يشتغل على بيانات شركة المالك.
--
-- الموظف يقدر: يضيف حركات صندوق وصيرفة جديدة، ويشوف (قراءة فقط) كشف رصيد
-- الصندوق وأرصدة العملاء والصيرفة.
-- الموظف ما يقدر: يعدّل/يحذف حركة موجودة، يضيف/يحذف عميل، يفتح الإعدادات أو
-- الخلاصة أو سجل التدقيق، أو يغيّر بيانات الشركة الأساسية.

-- ── جدول أعضاء الشركة ──────────────────────────────────────────────────
create table if not exists public.company_members (
  id          bigint generated always as identity primary key,
  company_id  uuid not null,
  user_id     uuid not null unique references auth.users(id) on delete cascade,
  role        text not null check (role in ('owner','employee')),
  email       text,
  created_at  timestamptz not null default now()
);

create index if not exists company_members_company_idx on public.company_members(company_id);

alter table public.company_members enable row level security;

-- المالك بس يشوف قائمة موظفيه (الإضافة/الحذف تصير عبر edge function بصلاحية
-- service_role، فما نحتاج سياسات INSERT/UPDATE/DELETE من العميل هنا)
create policy "company_members_select_owner"
  on public.company_members for select
  using (company_id = auth.uid());

-- ── دوال مساعدة (SECURITY DEFINER يتجاوز RLS بداخله فقط، يمنع مشكلة recursion) ──
-- company_id الفعلي للمستخدم الحالي: لو موظف مسجّل بجدول company_members يرجع
-- شركة صاحب العمل، وإلا (كل الحسابات الحالية = مالكين) يرجع نفس uid كالسابق
create or replace function public.my_company_id()
returns uuid
language sql security definer stable
set search_path = public
as $$
  select coalesce(
    (select company_id from public.company_members where user_id = auth.uid() limit 1),
    auth.uid()
  );
$$;

create or replace function public.my_role()
returns text
language sql security definer stable
set search_path = public
as $$
  select coalesce(
    (select role from public.company_members where user_id = auth.uid() limit 1),
    'owner'
  );
$$;

grant execute on function public.my_company_id() to authenticated;
grant execute on function public.my_role()       to authenticated;

-- تستخدمها الواجهة عند الدخول لتعرف دور المستخدم الحالي وتظبط القائمة عليه
create or replace function public.whoami()
returns table(company_id uuid, role text)
language sql security definer stable
set search_path = public
as $$
  select public.my_company_id(), public.my_role();
$$;

grant execute on function public.whoami() to authenticated;

-- ── قيمة company_id الافتراضية: كانت auth.uid()، الحين لازم تحسب عبر
-- my_company_id() حتى تصير حركة يضيفها موظف تسجَّل بشركة صاحب العمل مو بشركته وهمية ──
alter table public.settings      alter column company_id set default public.my_company_id();
alter table public.customers     alter column company_id set default public.my_company_id();
alter table public.moves         alter column company_id set default public.my_company_id();
alter table public.sayarfa_moves alter column company_id set default public.my_company_id();
alter table public.audit_log     alter column company_id set default public.my_company_id();

-- ── استبدال السياسات القديمة (سياسة واحدة FOR ALL لكل جدول) بسياسات مفصّلة بالدور ──

-- settings: المالك والموظف يشوفون ويحدّثون (نفس صف الإعدادات يتحدّث برصيد
-- القاصة بعد كل حركة)؛ trigger تحت يمنع الموظف من تغيير بيانات الشركة نفسها
drop policy if exists "user_own_settings" on public.settings;
create policy "settings_select" on public.settings for select
  using (company_id = public.my_company_id());
create policy "settings_update" on public.settings for update
  using (company_id = public.my_company_id())
  with check (company_id = public.my_company_id());

create or replace function public.employee_settings_guard()
returns trigger language plpgsql as $$
begin
  if public.my_role() = 'employee' then
    if new.comp_name             is distinct from old.comp_name
    or new.start_date            is distinct from old.start_date
    or new.default_rate          is distinct from old.default_rate
    or new.init_bal_d            is distinct from old.init_bal_d
    or new.init_bal_din          is distinct from old.init_bal_din
    or new.telegram_bot_token    is distinct from old.telegram_bot_token
    or new.telegram_bot_username is distinct from old.telegram_bot_username
    or new.company_id            is distinct from old.company_id
    then
      raise exception 'الموظف ما يقدر يعدّل إعدادات الشركة';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_employee_settings_guard on public.settings;
create trigger trg_employee_settings_guard
  before update on public.settings
  for each row execute function public.employee_settings_guard();

-- customers: المالك بس يضيف/يحذف عميل. المالك والموظف يشوفون ويحدّثون
-- الأرصدة (كل حركة تحدّث رصيد العميل)؛ trigger يمنع الموظف من تغيير اسم
-- العميل أو ربطه بتليجرام أو أرصدته الافتتاحية
drop policy if exists "user_own_customers" on public.customers;
create policy "customers_select" on public.customers for select
  using (company_id = public.my_company_id());
create policy "customers_insert" on public.customers for insert
  with check (company_id = public.my_company_id() and public.my_role() = 'owner');
create policy "customers_update" on public.customers for update
  using (company_id = public.my_company_id())
  with check (company_id = public.my_company_id());
create policy "customers_delete" on public.customers for delete
  using (company_id = public.my_company_id() and public.my_role() = 'owner');

create or replace function public.employee_customers_guard()
returns trigger language plpgsql as $$
begin
  if public.my_role() = 'employee' then
    if new.name             is distinct from old.name
    or new.company_id       is distinct from old.company_id
    or new.telegram_chat_id is distinct from old.telegram_chat_id
    or new.init_d_a         is distinct from old.init_d_a
    or new.init_d_l         is distinct from old.init_d_l
    or new.init_din_a       is distinct from old.init_din_a
    or new.init_din_l       is distinct from old.init_din_l
    then
      raise exception 'الموظف ما يقدر يعدّل بيانات العميل، فقط أرصدته عبر الحركات';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_employee_customers_guard on public.customers;
create trigger trg_employee_customers_guard
  before update on public.customers
  for each row execute function public.employee_customers_guard();

-- moves (حركات الصندوق): المالك والموظف يضيفون ويشوفون. التعديل والحذف
-- للمالك بس — هذا هو جوهر "موظف إدخال بس"
drop policy if exists "user_own_moves" on public.moves;
create policy "moves_select" on public.moves for select
  using (company_id = public.my_company_id());
create policy "moves_insert" on public.moves for insert
  with check (company_id = public.my_company_id());
create policy "moves_update" on public.moves for update
  using (company_id = public.my_company_id() and public.my_role() = 'owner')
  with check (company_id = public.my_company_id() and public.my_role() = 'owner');
create policy "moves_delete" on public.moves for delete
  using (company_id = public.my_company_id() and public.my_role() = 'owner');

-- sayarfa_moves (حركات الصيرفة): نفس مبدأ moves — إضافة وقراءة للجميع،
-- تعديل وحذف للمالك بس (حتى لو ما فيه واجهة تعديل حالياً، نقفلها لأمان مستقبلي)
drop policy if exists "user_own_sayarfa_moves" on public.sayarfa_moves;
create policy "sayarfa_moves_select" on public.sayarfa_moves for select
  using (company_id = public.my_company_id());
create policy "sayarfa_moves_insert" on public.sayarfa_moves for insert
  with check (company_id = public.my_company_id());
create policy "sayarfa_moves_update" on public.sayarfa_moves for update
  using (company_id = public.my_company_id() and public.my_role() = 'owner')
  with check (company_id = public.my_company_id() and public.my_role() = 'owner');
create policy "sayarfa_moves_delete" on public.sayarfa_moves for delete
  using (company_id = public.my_company_id() and public.my_role() = 'owner');

-- audit_log: المالك بس يشوفه ويسجّل عليه (الموظف أصلاً ما يقدر يعدّل/يحذف
-- حركة فيسجَّل شي بالسجل بسبب حركته)
drop policy if exists "audit_log_select_own_company" on public.audit_log;
drop policy if exists "audit_log_insert_own_company" on public.audit_log;
create policy "audit_log_select_owner" on public.audit_log for select
  using (company_id = public.my_company_id() and public.my_role() = 'owner');
create policy "audit_log_insert_owner" on public.audit_log for insert
  with check (company_id = public.my_company_id() and public.my_role() = 'owner');
