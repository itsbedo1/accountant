-- سجل التدقيق كان يسجّل بس التعديل والحذف — هذا الملف يوسّعه ليسجّل "إضافة"
-- (create) برضو، حتى يبين المالك منو (مالك أو موظف) أضاف كل حركة جديدة.
-- نفس صف audit_log الحالي كافي (فيه changed_by / changed_by_email أصلاً)،
-- بس نحتاج نسمح بقيمة action الجديدة ونسمح للموظف يسجّل "create" لحركاته هو.

alter table public.audit_log drop constraint if exists audit_log_action_check;
alter table public.audit_log add constraint audit_log_action_check
  check (action in ('create', 'update', 'delete'));

-- الموظف يقدر يسجّل "create" بس (نفس صلاحيته الحقيقية بجدول moves/sayarfa_moves) —
-- التعديل والحذف يبقون تسجيل المالك بس، مطابق لصلاحياته الفعلية بالجداول نفسها
drop policy if exists "audit_log_insert_owner" on public.audit_log;
create policy "audit_log_insert" on public.audit_log for insert
  with check (
    company_id = public.my_company_id()
    and (public.my_role() = 'owner' or action = 'create')
  );
