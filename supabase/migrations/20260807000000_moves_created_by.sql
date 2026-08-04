-- يبين مين سجّل كل حركة عادية (مو بس بسجل التدقيق المنفصل) — يظهر مباشرة
-- بشاشة الصندوق وكشف رصيد الصندوق، مو بس بصفحة "سجل التعديلات والحذف".

alter table public.moves         add column if not exists created_by_email text;
alter table public.sayarfa_moves add column if not exists created_by_email text;

-- تعبئة الحركات القديمة (قبل هذي الميزة) بإيميل صاحب الشركة نفسه — كلها كانت
-- تسجَّل من حساب المالك وحده قبل ما يصير فيه مفهوم "موظف"
update public.moves m
  set created_by_email = u.email
  from auth.users u
  where m.created_by_email is null and u.id = m.company_id;

update public.sayarfa_moves m
  set created_by_email = u.email
  from auth.users u
  where m.created_by_email is null and u.id = m.company_id;
