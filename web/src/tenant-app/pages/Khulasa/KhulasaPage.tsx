import { useMemo, useState } from 'react'
import { useDataStore } from '../../state/useDataStore'
import { useSmartPrint, SmartPrintOverlay } from '../../components/SmartPrint'

function todayShort() {
  const now = new Date()
  const d = String(now.getDate()).padStart(2, '0')
  const m = String(now.getMonth() + 1).padStart(2, '0')
  return `الخلاصة ليوم ${d}/${m}/${now.getFullYear()}`
}

function fmtC(n: number): string {
  const s = Math.round(Math.abs(n)).toLocaleString()
  return n < 0 ? `-${s}` : s
}

// منقولة من pageKhulasa (index.html:1398) — khOpen/khRender (كانت بالسطر 3998-4082)
export default function KhulasaPage({ goPage }: { goPage: (id: string) => void }) {
  const customers = useDataStore((s) => s.customers)
  const moves = useDataStore((s) => s.moves)
  const initBalD = useDataStore((s) => s.initBalD)
  const initBalDin = useDataStore((s) => s.initBalDin)
  const [rate, setRate] = useState(1480)
  const smartPrint = useSmartPrint()

  const calc = useMemo(() => {
    const r = rate || 1480

    // 1. صافي ديون العملاء — نفس الأرصدة الحيّة المستخدمة بصفحة أرصدة العملاء
    let custNetD = 0,
      custNetDin = 0
    for (const c of customers) {
      custNetD += c.dL - c.dA
      custNetDin += c.dinL - c.dinA
    }

    // 2. صافي ديون الشركات
    let compNetD = 0,
      compNetDin = 0
    for (const m of moves) {
      if (m.hesab !== 'ذمم الشركات') continue
      if (m.noa === 'صرف') {
        compNetD += m.mabD
        compNetDin += m.mabDin
      } else {
        compNetD -= m.mabD
        compNetDin -= m.mabDin
      }
    }

    // 3. الصندوق الفعلي
    const sandD = initBalD
    const sandDin = initBalDin

    // 4. المجموع — رأس المال = الصندوق + ديون الشركات (أصل لنا) − صافي ديون العملاء
    const totD = sandD + compNetD - custNetD
    const totDin = sandDin + compNetDin - custNetDin

    // 5. الصافي
    const netDin = totDin + Math.round(totD * r)
    const netD = totD + totDin / r

    return { custNetD, custNetDin, compNetD, compNetDin, sandD, sandDin, totD, totDin, netDin, netD: parseFloat(netD.toFixed(0)) }
  }, [customers, moves, initBalD, initBalDin, rate])

  return (
    <div id="pageKhulasa" className="page active">
      <div className="kh-header">
        <div className="kh-date">{todayShort()}</div>
        <div className="kh-title">الخلاصة</div>
        <div className="kh-rate-wrap">
          <span className="kh-rate-lbl">سعر الصرف</span>
          <input type="number" className="kh-rate-input" value={rate} min={1} step={1} onChange={(e) => setRate(Number(e.target.value) || 0)} />
        </div>
      </div>

      <div className="kh-page">
        <div className="kh-cols">
          <div className="kh-col-lbl">دينار</div>
          <div className="kh-col-lbl">دولار</div>
          <div></div>
        </div>
        <hr className="kh-hr" />

        {/* صافي ديون العملاء — تلوين معكوس: أحمر لما يكون علينا (n>=0)، عادي لما يكون لنا (n<0) */}
        <div className="kh-row">
          <div className={`kh-val${calc.custNetDin >= 0 ? ' neg' : ''}`}>
            {Math.round(Math.abs(calc.custNetDin)).toLocaleString()}
            {calc.custNetDin < 0 ? ' (لنا)' : ' (عليه)'}
          </div>
          <div className={`kh-val dolar${calc.custNetD >= 0 ? ' neg' : ''}`}>
            {Math.round(Math.abs(calc.custNetD)).toLocaleString()}
            {calc.custNetD < 0 ? ' (لنا)' : ' (عليه)'}
          </div>
          <div className="kh-lbl">صافي ديون العملاء</div>
        </div>

        <div className="kh-row">
          <div className={`kh-val${calc.compNetDin < 0 ? ' neg' : ''}`}>{fmtC(calc.compNetDin)}</div>
          <div className={`kh-val dolar${calc.compNetD < 0 ? ' neg' : ''}`}>{fmtC(calc.compNetD)}</div>
          <div className="kh-lbl">صافي ديون الشركات</div>
        </div>

        <div className="kh-row">
          <div className={`kh-val${calc.sandDin < 0 ? ' neg' : ''}`}>{fmtC(calc.sandDin)}</div>
          <div className={`kh-val dolar${calc.sandD < 0 ? ' neg' : ''}`}>{fmtC(calc.sandD)}</div>
          <div className="kh-lbl">الصندوق الفعلي</div>
        </div>
        <hr className="kh-hr" />

        <div className="kh-row total">
          <div className={`kh-val${calc.totDin < 0 ? ' neg' : ''}`}>{fmtC(calc.totDin)}</div>
          <div className={`kh-val dolar${calc.totD < 0 ? ' neg' : ''}`}>{fmtC(calc.totD)}</div>
          <div className="kh-lbl">المجموع</div>
        </div>

        <div className="kh-net-grid">
          <div className={`kh-net-card${calc.netDin < 0 ? ' neg' : ''}`}>{fmtC(calc.netDin)}</div>
          <div className="kh-net-lbl">الصافي بالدينار</div>
        </div>

        <div className="kh-net-grid" style={{ marginBottom: 16 }}>
          <div className={`kh-net-card dolar${calc.netD < 0 ? ' neg' : ''}`}>{fmtC(calc.netD)}</div>
          <div className="kh-net-lbl">الصافي بالدولار</div>
        </div>

        <div className="kh-note">
          <div>
            📌 <b>طريقة الحساب:</b>
          </div>
          <div>الصافي = الصندوق + ديون الشركات − ديون العملاء</div>
          <div style={{ marginTop: 3 }}>الصافي بالدولار = الصافي بالدينار ÷ سعر الصرف</div>
        </div>
      </div>

      <div className="kh-toolbar">
        <button className="kh-tbtn primary" onClick={() => {}}>
          🔄 تحديث
        </button>
        <button className="kh-tbtn ghost" onClick={() => smartPrint.trigger('الخلاصة')}>
          🖨️
        </button>
        <button className="kh-tbtn ghost" onClick={() => goPage('pageMain')}>
          🏠
        </button>
      </div>

      <SmartPrintOverlay {...smartPrint} />
    </div>
  )
}
