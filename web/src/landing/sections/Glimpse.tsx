export default function Glimpse() {
  return (
    <section id="glimpse">
      <div className="wrap">
        <div className="section-head" style={{ marginInline: 'auto', textAlign: 'center' }}>
          <div className="eyebrow" style={{ justifyContent: 'center' }}>
            شوف قبل ما تجرب
          </div>
          <h2>لمحة بسيطة عن النظام</h2>
          <p style={{ marginInline: 'auto' }}>هيچ شكل الشاشات اللي رح تشتغل بيها يومياً — بسيطة وواضحة بالعربي.</p>
        </div>
        <div className="glimpse-grid">
          <div className="gl-item">
            <div className="gl-frame">
              <div className="gl-screen">
                <div className="gs-toggle">
                  <div className="gs-qabd">⬇️ قبض</div>
                  <div className="gs-sarf">⬆️ صرف</div>
                </div>
                <div className="gs-field">العميل: عبدالله خميس</div>
                <div className="gs-field" style={{ color: '#f0b93a', fontWeight: 800, fontSize: 13 }}>
                  1,806,000 د.ع
                </div>
              </div>
            </div>
            <h5>تسجيل حركة</h5>
            <span>قبض أو صرف بثواني</span>
          </div>

          <div className="gl-item">
            <div className="gl-frame">
              <div className="gl-screen">
                <div className="gs-card">
                  <b>كي كارد رافدين</b>
                  <div className="gs-mini">
                    <span>دينار له</span>
                    <b>50,673,000</b>
                  </div>
                </div>
                <div className="gs-card">
                  <b>زياد الكبيسي</b>
                  <div className="gs-mini">
                    <span>دينار عليه</span>
                    <b>300,000</b>
                  </div>
                </div>
              </div>
            </div>
            <h5>أرصدة العملاء</h5>
            <span>رصيد كل عميل بلمحة</span>
          </div>

          <div className="gl-item">
            <div className="gl-frame">
              <div className="gl-screen">
                <div className="gs-bubble">
                  🔔 تم صرف 1,806,000 د.ع الى حسابك.
                  <br />
                  رصيدك الحالي: 1,753,413 (لك)
                </div>
              </div>
            </div>
            <h5>إشعار تليجرام تلقائي</h5>
            <span>عميلك يعرف فوراً</span>
          </div>

          <div className="gl-item">
            <div className="gl-frame">
              <div className="gl-screen">
                <div className="gs-mini" style={{ marginBottom: 8 }}>
                  <span>قبض — شحن ماستر</span>
                  <b>6,268,000</b>
                </div>
                <div className="gs-mini" style={{ marginBottom: 10 }}>
                  <span>صرف — عمولات</span>
                  <b>485,000</b>
                </div>
                <div className="gs-total">
                  <span>الرصيد الحالي</span>
                  <b>731,869,162</b>
                </div>
              </div>
            </div>
            <h5>كشف الصندوق</h5>
            <span>رصيدك لحظة بلحظة</span>
          </div>
        </div>
      </div>
    </section>
  )
}
