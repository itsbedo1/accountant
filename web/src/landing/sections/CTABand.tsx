import { waLink } from '../whatsapp'

export default function CTABand() {
  return (
    <div className="cta-band">
      <div className="wrap">
        <h2>خلّي كل حركة بمحلك إلها صاحب</h2>
        <p>جرّب حساباتي هسه — تجهيز حسابك ياخذ نفس اليوم.</p>
        <a className="btn-stamp" href={waLink('مرحباً، أريد أجرب نظام حساباتي')} target="_blank" rel="noopener">
          تواصل واتساب الآن ←
        </a>
      </div>
    </div>
  )
}
