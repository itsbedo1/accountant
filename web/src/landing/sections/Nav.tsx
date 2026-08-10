import { waLink } from '../whatsapp'

export default function Nav() {
  return (
    <nav className="nav">
      <div className="nav-inner">
        <div className="brand">حساباتي</div>
        <a className="nav-cta" href={waLink('مرحباً، أريد أعرف أكثر عن نظام حساباتي')} target="_blank" rel="noopener">
          تواصل واتساب
        </a>
      </div>
    </nav>
  )
}
