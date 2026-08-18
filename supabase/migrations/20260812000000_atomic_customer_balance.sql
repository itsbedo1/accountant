-- تحديث رصيد العميل ذرياً بقاعدة البيانات بدل المتصفح
-- ==========================================================================
-- المشكلة اللي يحلها هذا الملف:
-- كانت الواجهة تحسب الرصيد الجديد بالمتصفح وترسله كقيمة مطلقة
-- (PATCH customers SET d_l = 1500). كل جهاز يقرأ الرصيد لما يفتح التطبيق
-- ويكتب فوقه لما يحفظ — بدون ما يدري إن جهاز ثاني كتب بالوسط.
--
-- فلو الموظف سجّل قبض 500 لزبون (1000 ← 1500) وبنفس اللحظة سجّل المالك
-- صرف 200 لنفس الزبون من نسخته القديمة (1000 ← 800)، النتيجة المحفوظة 800
-- بينما الصح 1300 — 500 تضيع بصمت، والحركتان الاثنتان تبقيان بالسجل
-- فيتناقض السجل مع الرصيد.
--
-- الحل: الواجهة ترسل "الحركة" (نوعها ومبلغها) مو "الرصيد الناتج"، وقاعدة
-- البيانات تطبّقها بجملة UPDATE واحدة. Postgres يقفل الصف طول الجملة، فلو
-- وصلت حركتان بنفس اللحظة تنفّذ الثانية فوق نتيجة الأولى بدل ما تمسحها.
--
-- ملاحظة أمنية مقصودة: الدالة SECURITY INVOKER (الوضع الافتراضي — مو
-- DEFINER) حتى تبقى صلاحيات RLS مطبّقة عليها بالكامل: سياسة customers_update
-- (نفس الشركة + الشركة مو موقوفة) وحارس الموظف employee_customers_guard
-- كلها تشتغل جوّاها تماماً مثل ما تشتغل على أي تعديل مباشر. الدالة تعدّل
-- أعمدة الأرصدة الأربعة بس، وهي الأعمدة المسموحة للموظف أصلاً.

create or replace function public.apply_customer_movement(
  p_customer_id bigint,
  p_noa         text,
  p_mab_d       numeric,
  p_mab_din     numeric
)
returns table (d_a numeric, d_l numeric, din_a numeric, din_l numeric)
language sql
volatile
set search_path = public
as $$
  -- نفس منطق applyToCustomer بالواجهة حرفياً (balanceMath.ts:36):
  --   قبض: ينقص "عليه" أولاً، وإذا خلص الباقي يزيد "له"
  --   صرف: ينقص "له"  أولاً، وإذا خلص الباقي يزيد "عليه"
  --
  -- كل تعبيرات SET تقرأ قيم الصف *قبل* التعديل، فحساب الباقي
  -- (p_mab_d - c.d_a) يستخدم القيمة القديمة — مطابق تماماً لترتيب
  -- الخطوات بالواجهة. وشرط p_mab_d > 0 يحافظ على نفس السلوك:
  -- المبلغ صفر ما يغيّر شي إطلاقاً (ولا حتى يطبّع قيمة سالبة موجودة).
  update public.customers c
     set d_a = case
                 when p_mab_d <= 0    then c.d_a
                 when p_noa = 'قبض'   then greatest(c.d_a - p_mab_d, 0)
                 else                      c.d_a + greatest(p_mab_d - c.d_l, 0)
               end,
         d_l = case
                 when p_mab_d <= 0    then c.d_l
                 when p_noa = 'قبض'   then c.d_l + greatest(p_mab_d - c.d_a, 0)
                 else                      greatest(c.d_l - p_mab_d, 0)
               end,
         din_a = case
                 when p_mab_din <= 0  then c.din_a
                 when p_noa = 'قبض'   then greatest(c.din_a - p_mab_din, 0)
                 else                      c.din_a + greatest(p_mab_din - c.din_l, 0)
               end,
         din_l = case
                 when p_mab_din <= 0  then c.din_l
                 when p_noa = 'قبض'   then c.din_l + greatest(p_mab_din - c.din_a, 0)
                 else                      greatest(c.din_l - p_mab_din, 0)
               end
   where c.id = p_customer_id
  returning c.d_a, c.d_l, c.din_a, c.din_l;
$$;

-- ما ترجع أي صف إذا العميل غير موجود أو منعته صلاحيات RLS — الواجهة تعتبر
-- ذلك فشلاً وتنبّه المستخدم بدل ما تفترض النجاح بصمت
grant execute on function public.apply_customer_movement(bigint, text, numeric, numeric) to authenticated;
