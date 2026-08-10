import { waLink } from '../whatsapp'

export default function Hero() {
  return (
    <header className="hero">
      <div className="wrap hero-grid">
        <div>
          <div className="eyebrow">نظام محاسبة وصيرفة للأعمال النقدية</div>
          <h1>
            كل حركة بمحلك… <em>إلها اسم، وتوقيت، ومسؤول</em>
          </h1>
          <p className="lede">من قبض وصرف الصندوق، لعمليات الصيرفة، لأقساط الزبائن — حساباتي يسجّل كل شي أول بأول، ويبين وين راح كل دينار ومنو سواها.</p>
          <div className="hero-actions">
            <a className="btn-stamp" href={waLink('مرحباً، أريد أجرب نظام حساباتي')} target="_blank" rel="noopener">
              جرّب حساباتي هسه ←
            </a>
            <a className="btn-ghost" href="#pricing">
              شوف السعر
            </a>
          </div>
          <div className="hero-note">
            <span className="dot"></span> يفتح من موبايلك بضغطة وحدة، بدون تنصيب معقد
          </div>
        </div>

        <div className="receipt">
          <div className="receipt-head">
            <b>سند قبض</b>
            <span>#1279</span>
          </div>
          <div className="receipt-row">
            <span>الحساب</span>
            <b>عبدالله يوسف</b>
          </div>
          <div className="receipt-row">
            <span>النوع</span>
            <b>قبض</b>
          </div>
          <div className="receipt-row">
            <span>أضافها</span>
            <b>موظف الصندوق</b>
          </div>
          <div className="receipt-row total">
            <span>الرصيد</span>
            <b>186,782 $</b>
          </div>
        </div>
      </div>
    </header>
  )
}
