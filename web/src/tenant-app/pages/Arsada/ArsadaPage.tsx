import { useMemo, useState } from 'react'
import { fmt } from '../../../shared/format'
import { toast } from '../../../shared/useToast'
import { useDataStore } from '../../state/useDataStore'
import { useSmartPrint, SmartPrintOverlay } from '../../components/SmartPrint'
import { getFreshChatId, sendTgMessage, fmtBalanceLine } from '../../api/telegram'
import { sbFetch } from '../../../shared/sbFetch'
import type { Customer } from '../../../shared/types'

function byNameAr(a: Customer, b: Customer) {
  return a.name.localeCompare(b.name, 'ar')
}

// منقولة من pageArsada (index.html:1182) — arRender/arFilter/arDetail/
// copyTelegramLink/unlinkTelegram/sendBalanceReminder (كانت بالسطر 3042-3141)
export default function ArsadaPage({ goPage, openKashfAmil }: { goPage: (id: string) => void; openKashfAmil: (customerId: number) => void }) {
  const customers = useDataStore((s) => s.customers)
  const settings = useDataStore((s) => s.settings)
  const [q, setQ] = useState('')
  const smartPrint = useSmartPrint()

  const filtered = useMemo(() => {
    const query = q.trim()
    return (query ? customers.filter((c) => c.name.includes(query)) : [...customers]).sort(byNameAr)
  }, [customers, q])

  const totals = useMemo(() => {
    let tDL = 0,
      tDA = 0,
      tDinL = 0,
      tDinA = 0
    for (const c of filtered) {
      tDL += c.dL
      tDA += c.dA
      tDinL += c.dinL
      tDinA += c.dinA
    }
    return { tDL, tDA, tDinL, tDinA }
  }, [filtered])

  async function unlinkTelegram(c: Customer) {
    // تحديث تفاؤلي محلي فوري — نفس سلوك unlinkTelegram القديم (index.html:3110)
    useDataStore.setState((s) => {
      const cust = s.customers.find((x) => x.id === c.id)
      if (cust) cust.tgChatId = null
    })
    try {
      await sbFetch(`customers?id=eq.${c.id}`, 'PATCH', { telegram_chat_id: null })
      toast(`✅ تم فك ربط تليجرام عن ${c.name} — انسخ الرابط وأرسله للعميل الصحيح`)
    } catch (e) {
      console.error('unlinkTelegram:', e)
      toast('❌ فشل فك الربط: ' + (e as Error).message)
    }
  }

  function copyTelegramLink(c: Customer) {
    if (!settings.tgBotUser) {
      toast('⚠️ لازم تربط بوت تليجرام من الإعدادات أولاً')
      return
    }
    if (c.tgChatId) {
      if (confirm(`${c.name} مربوط بتليجرام مسبقاً.\nهل تريد فك الربط الحالي حتى ترسل رابط جديد للعميل الصحيح؟`)) {
        void unlinkTelegram(c)
      }
      return
    }
    const link = `https://t.me/${settings.tgBotUser}?start=${c.id}`
    void navigator.clipboard.writeText(link)
    toast('📋 انسخ الرابط وأرسله لـ ' + c.name)
  }

  async function sendBalanceReminder(c: Customer) {
    if (!settings.tgBotToken) {
      toast('⚠️ ماكو بوت تليجرام مربوط بالإعدادات')
      return
    }
    const chatId = await getFreshChatId(c)
    if (!chatId) {
      toast('⚠️ العميل ماكو رابط حسابه بتليجرام بعد — انسخله رابط الربط أولاً')
      return
    }
    const curD = c.dL - c.dA
    const curDin = c.dinL - c.dinA
    const text = `🔔 تذكير برصيدك الحالي لدى ${settings.compName || 'المنير'}:\n${fmtBalanceLine(curD, curDin)}`
    toast('⏳ جاري إرسال التذكير...')
    try {
      await sendTgMessage(settings.tgBotToken, chatId, text)
      toast(`✅ تم إرسال تذكير الرصيد لـ ${c.name}`)
    } catch (e) {
      console.error('sendBalanceReminder:', e)
      toast('❌ فشل إرسال التذكير: ' + (e as Error).message)
    }
  }

  const netDin = totals.tDinL - totals.tDinA
  const netD = totals.tDL - totals.tDA

  return (
    <div id="pageArsada" className="page active">
      <div className="ar-header">
        <div className="ar-title">أرصدة العملاء</div>
        <input className="ar-search" type="text" placeholder="🔍 بحث..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="ar-legend">
        <span className="din">دينار: له / عليه</span>
        <span className="dol">دولار: له / عليه</span>
      </div>

      <div className="ar-tbody">
        {filtered.map((c) => {
          const star = c.dL > 50000 || c.dinL > 10000000 ? '⭐' : ''
          const tgIcon = c.tgChatId ? '✅' : '📨'
          return (
            <div key={c.id} className="ar-card" onClick={() => openKashfAmil(c.id)}>
              <div className="ar-card-top">
                <span className="ar-card-name">{c.name}</span>
                <span
                  className="ar-card-star"
                  onClick={(e) => {
                    e.stopPropagation()
                    copyTelegramLink(c)
                  }}
                  title={c.tgChatId ? 'مربوط بتليجرام' : 'انسخ رابط ربط تليجرام'}
                >
                  {tgIcon}
                </span>
                <span
                  className="ar-card-star"
                  onClick={(e) => {
                    e.stopPropagation()
                    void sendBalanceReminder(c)
                  }}
                  title="إرسال تذكير برصيده الحالي"
                >
                  🔔
                </span>
                <span className="ar-card-star">{star}</span>
              </div>
              <div className="ar-card-grid">
                <div className="ar-card-amt">
                  <span className="l">دينار له</span>
                  <span className={`v ${c.dinL ? 'hv' : 'zero'}`}>{fmt(c.dinL)}</span>
                </div>
                <div className="ar-card-amt">
                  <span className="l">دينار عليه</span>
                  <span className={`v ${c.dinA ? 'hv' : 'zero'}`}>{fmt(c.dinA)}</span>
                </div>
                <div className="ar-card-amt">
                  <span className="l">دولار له</span>
                  <span className={`v ${c.dL ? 'hv' : 'zero'}`}>{fmt(c.dL)}</span>
                </div>
                <div className="ar-card-amt">
                  <span className="l">دولار عليه</span>
                  <span className={`v ${c.dA ? 'hv' : 'zero'}`}>{fmt(c.dA)}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="ar-totals">
        <div className="ar-tgrid">
          <div className="ar-tlabel">المجموع</div>
          <div className="ar-tbox">{fmt(totals.tDinL)}</div>
          <div className="ar-tbox">{fmt(totals.tDinA)}</div>
          <div className="ar-tbox">{fmt(totals.tDL)}</div>
          <div className="ar-tbox">{fmt(totals.tDA)}</div>
        </div>
        <div className="ar-tgrid">
          <div className="ar-tlabel">الصافي</div>
          <div className="ar-nbox" style={{ flex: 2 }}>
            {fmt(Math.abs(netDin))}
            {netDin < 0 ? ' (لنا)' : ' (عليه)'}
          </div>
          <div className="ar-nbox" style={{ flex: 2 }}>
            {fmt(Math.abs(netD))}
            {netD < 0 ? ' (لنا)' : ' (عليه)'}
          </div>
        </div>
      </div>
      <div className="ar-toolbar">
        <button className="ar-tbtn" onClick={() => smartPrint.trigger('أرصدة العملاء')}>
          🖨️ طباعة
        </button>
        <button className="ar-tbtn" onClick={() => goPage('pageMain')}>
          🏠 الرئيسية
        </button>
      </div>

      <SmartPrintOverlay {...smartPrint} />
    </div>
  )
}
