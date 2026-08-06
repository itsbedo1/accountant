-- علامة على الحركة تبين إذا فشل إرسال إشعار تليجرام للعميل — تتيح للمالك
-- يشوف قائمة بالحركات اللي ما وصل إشعارها ويعيد الإرسال بزر واحد بدل ما
-- يكتشف الفشل بالصدفة من العميل نفسه
alter table public.moves add column if not exists tg_notif_failed boolean not null default false;
