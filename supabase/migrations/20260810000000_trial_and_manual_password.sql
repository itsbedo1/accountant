-- فترة تجريبية + موعد استحقاق صريح + إيقاف تلقائي عند تجاوزه (بدون كرون —
-- يتحقق مباشرة بالدالة نفسها، فما فيه تأخير انتظار جدولة)

alter table public.settings alter column last_payment_at drop not null;

alter table public.settings add column if not exists next_due_at timestamptz;
update public.settings set next_due_at = coalesce(last_payment_at, now()) + interval '3 months'
  where next_due_at is null;
alter table public.settings alter column next_due_at set not null;
alter table public.settings alter column next_due_at set default (now() + interval '3 months');

alter table public.settings add column if not exists plan text not null default 'paid';
do $$ begin
  alter table public.settings add constraint settings_plan_check check (plan in ('trial','paid'));
exception when duplicate_object then null;
end $$;

-- الشركة تُعتبر موقوفة إذا المالك علّقها يدوياً، أو إذا تجاوز موعد
-- استحقاقها (تجريبي منتهي أو اشتراك ما انجدد) — بدون فرق بالتنفيذ
create or replace function public.is_company_suspended()
returns boolean
language sql security definer stable
set search_path = public
as $$
  select coalesce(
    (select suspended or (next_due_at < now()) from public.settings where company_id = public.my_company_id() limit 1),
    false
  );
$$;
