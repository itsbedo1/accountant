import { waLink } from '../whatsapp'

const FEATURES = [
  'صندوق + صيرفة بلا حدود',
  'عدد عملاء بلا حدود',
  'سجل تدقيق كامل لكل حركة',
  'حسابات موظفين بصلاحيات محكمة',
  'إشعارات تليجرام تلقائية للعملاء',
  'كشوفات حساب قابلة للطباعة',
  'دعم فني مباشر على واتساب',
]

export default function Pricing() {
  return (
    <section id="pricing" style={{ background: 'var(--bg-sunken)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
      <div className="wrap">
        <div className="section-head" style={{ marginInline: 'auto', textAlign: 'center' }}>
          <div className="eyebrow" style={{ justifyContent: 'center' }}>
            الاشتراك
          </div>
          <h2>سعر واحد واضح، بدون تعقيد</h2>
        </div>
        <div className="pricing-wrap">
          <div className="price-card">
            <div className="price-head">
              <div className="eyebrow">اشتراك حساباتي</div>
              <div className="price-amount">
                75,000<sup>د.ع</sup>
              </div>
              <div className="price-period">كل 3 أشهر — لكل محل</div>
            </div>
            <div className="price-list">
              {FEATURES.map((f) => (
                <div key={f}>{f}</div>
              ))}
            </div>
            <div className="price-foot">
              <a className="btn-stamp" href={waLink('مرحباً، أريد أشترك بنظام حساباتي')} target="_blank" rel="noopener">
                اشترك عبر واتساب
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
