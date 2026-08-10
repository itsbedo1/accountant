import { WA_NUMBER } from '../whatsapp'

export default function WhatsAppFab() {
  return (
    <a className="wa-fab" href={`https://wa.me/${WA_NUMBER}`} target="_blank" rel="noopener" aria-label="تواصل واتساب">
      ☎
    </a>
  )
}
