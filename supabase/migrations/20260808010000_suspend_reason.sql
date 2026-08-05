-- سبب تعليق الاشتراك — يبين للشركة الموقوفة ليش صار الإيقاف بالضبط
alter table public.settings add column if not exists suspend_reason text;
