import { WA_NUMBER } from '../whatsapp'

export default function Footer() {
  return (
    <footer>
      <div className="wrap footer-row">
        <div className="brand">حساباتي</div>
        <div>واتساب: {WA_NUMBER}+</div>
        <div>© 2026 حساباتي — نظام محاسبة وصيرفة للأعمال النقدية</div>
      </div>
    </footer>
  )
}
