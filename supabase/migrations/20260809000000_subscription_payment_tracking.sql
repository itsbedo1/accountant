-- تتبّع دفعات الاشتراك (كل 3 أشهر) — يستخدمها الداشبورد المنفصل لإدارة الشركات
alter table public.settings add column if not exists last_payment_at timestamptz not null default now();
