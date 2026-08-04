-- سجل تدقيق (audit log): يسجّل تلقائياً كل تعديل أو حذف على حركات الصندوق (moves)
-- من كود الواجهة في index.html (دالة dbLogAudit).
-- عمداً بدون سياسات UPDATE/DELETE — السجل نفسه غير قابل للتعديل أو الحذف
-- من أي طرف (ولا حتى صاحب الشركة) بعد إدراجه، وهذا هو الهدف من audit log.

create table if not exists public.audit_log (
  id                bigint generated always as identity primary key,
  company_id        uuid not null default auth.uid(),
  table_name        text not null,
  record_id         bigint,
  action            text not null check (action in ('update', 'delete')),
  old_data          jsonb,
  new_data          jsonb,
  changed_by        uuid not null default auth.uid(),
  changed_by_email  text,
  created_at        timestamptz not null default now()
);

create index if not exists audit_log_company_created_idx
  on public.audit_log (company_id, created_at desc);

alter table public.audit_log enable row level security;

-- كل شركة تشوف سجلات نفسها فقط (نفس نمط RLS المستخدم بباقي الجداول: company_id = auth.uid())
create policy "audit_log_select_own_company"
  on public.audit_log for select
  using (company_id = auth.uid());

-- الإدراج مسموح فقط بسجل لنفس الشركة — يمنع تلاعب بسجلات شركات أخرى
create policy "audit_log_insert_own_company"
  on public.audit_log for insert
  with check (company_id = auth.uid());
