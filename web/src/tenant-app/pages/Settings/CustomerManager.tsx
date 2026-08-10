import { useState } from 'react'
import { formatAmountInput, parseAmount } from '../../../shared/format'
import { useDataStore } from '../../state/useDataStore'

// إضافة/حذف عملاء — منقولة من stAddAmil/stDelAmil/stRenderAmilList (index.html:4114-4392)
export default function CustomerManager({ confirmPin }: { confirmPin: (label: string) => Promise<boolean> }) {
  const customers = useDataStore((s) => s.customers)
  const addCustomer = useDataStore((s) => s.addCustomer)
  const deleteCustomer = useDataStore((s) => s.deleteCustomer)

  const nextId = customers.length > 0 ? Math.max(...customers.map((c) => c.id)) + 1 : 1
  const [name, setName] = useState('')
  const [dLStr, setDLStr] = useState('0')
  const [dAStr, setDAStr] = useState('0')
  const [dinLStr, setDinLStr] = useState('0')
  const [dinAStr, setDinAStr] = useState('0')

  async function add() {
    const n = name.trim()
    if (!n) return
    const ok = await addCustomer(n, parseAmount(dLStr), parseAmount(dAStr), parseAmount(dinLStr), parseAmount(dinAStr))
    if (ok) {
      setName('')
      setDLStr('0')
      setDAStr('0')
      setDinLStr('0')
      setDinAStr('0')
    }
  }

  async function del(id: number, custName: string) {
    const pinOk = await confirmPin(`🗑 حذف العميل: ${custName}`)
    if (!pinOk) return
    const c = customers.find((x) => x.id === id)
    const hasBalance = c && (c.dL || c.dA || c.dinL || c.dinA)
    const msg = hasBalance ? `تحذير: العميل "${custName}" عنده أرصدة. هل تريد حذفه؟` : `حذف العميل "${custName}"؟`
    if (!confirm(msg)) return
    await deleteCustomer(id)
  }

  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 14, marginBottom: 14 }}>
      <div style={{ color: 'var(--accent)', fontSize: 13, fontWeight: 900, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>👥 إضافة عميل جديد</div>

      <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: 8, marginBottom: 8 }}>
        <div>
          <div style={{ color: 'var(--text-dim)', fontSize: 11, fontWeight: 700, marginBottom: 4, textAlign: 'center' }}>رقم</div>
          <input
            type="text"
            readOnly
            value={nextId}
            style={{ width: '100%', background: 'var(--bg3)', border: '1.5px solid var(--border)', borderRadius: 7, padding: '8px 4px', fontFamily: "'Cairo',sans-serif", fontSize: 12, fontWeight: 700, color: 'var(--text-dim)', textAlign: 'center', direction: 'ltr' }}
          />
        </div>
        <div>
          <div style={{ color: 'var(--text-dim)', fontSize: 11, fontWeight: 700, marginBottom: 4, textAlign: 'right' }}>اسم العميل</div>
          <input
            type="text"
            placeholder="أدخل اسم العميل"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ width: '100%', background: '#071e38', border: '1.5px solid var(--border2)', borderRadius: 7, padding: '8px 12px', fontFamily: "'Cairo',sans-serif", fontSize: 13, color: 'var(--text)', direction: 'rtl' }}
          />
        </div>
      </div>

      <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: 10, marginBottom: 8 }}>
        <div style={{ color: 'var(--text2)', fontSize: 11, fontWeight: 700, marginBottom: 10, textAlign: 'right' }}>الرصيد الافتتاحي (اختياري)</div>

        <div style={{ marginBottom: 8 }}>
          <div style={{ color: 'var(--gold)', fontSize: 10, fontWeight: 900, marginBottom: 5, textAlign: 'center', letterSpacing: 1 }}>── دولار $ ──</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <AmountField label="له (يدين لنا) $" color="var(--accent)" borderColor="rgba(74,222,128,.3)" value={dLStr} onChange={setDLStr} />
            <AmountField label="له علينا (ندين له) $" color="var(--red)" borderColor="rgba(248,113,113,.3)" value={dAStr} onChange={setDAStr} />
          </div>
        </div>

        <div>
          <div style={{ color: 'var(--accent)', fontSize: 10, fontWeight: 900, marginBottom: 5, textAlign: 'center', letterSpacing: 1 }}>── دينار IQD ──</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <AmountField label="له (يدين لنا) IQD" color="var(--accent)" borderColor="rgba(74,222,128,.3)" value={dinLStr} onChange={setDinLStr} small />
            <AmountField label="له علينا (ندين له) IQD" color="var(--red)" borderColor="rgba(248,113,113,.3)" value={dinAStr} onChange={setDinAStr} small />
          </div>
        </div>
      </div>

      <button
        onClick={() => void add()}
        style={{ width: '100%', padding: 10, borderRadius: 8, fontFamily: "'Cairo',sans-serif", fontSize: 13, fontWeight: 900, background: '#2a5aa0', border: 'none', color: 'white', cursor: 'pointer', marginBottom: 10 }}
      >
        ➕ إضافة العميل
      </button>

      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 700, marginBottom: 6, textAlign: 'right' }}>العملاء الحاليين ({customers.length})</div>
      <div style={{ maxHeight: 200, overflowY: 'auto' }}>
        {!customers.length && <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: 12, fontSize: 12 }}>لا يوجد عملاء</div>}
        {customers.map((c) => (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', marginBottom: 4, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7 }}>
            <button
              onClick={() => void del(c.id, c.name)}
              style={{ background: 'rgba(200,50,50,0.3)', border: '1px solid #cc4444', borderRadius: 5, color: '#ffaaaa', fontSize: 11, fontWeight: 700, padding: '3px 8px', cursor: 'pointer', fontFamily: "'Cairo',sans-serif" }}
            >
              حذف
            </button>
            <div style={{ flex: 1, textAlign: 'right', marginRight: 8 }}>
              <span style={{ color: 'white', fontSize: 13, fontWeight: 700 }}>{c.name}</span>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginRight: 6 }}>#{c.id}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AmountField({ label, color, borderColor, value, onChange, small }: { label: string; color: string; borderColor: string; value: string; onChange: (v: string) => void; small?: boolean }) {
  return (
    <div>
      <div style={{ color, fontSize: 10, fontWeight: 700, marginBottom: 3, textAlign: 'center' }}>{label}</div>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(formatAmountInput(e.target.value))}
        style={{ width: '100%', background: 'var(--bg2)', border: `1.5px solid ${borderColor}`, borderRadius: 6, padding: 8, fontFamily: "'Cairo',sans-serif", fontSize: small ? 13 : 14, fontWeight: 900, color, textAlign: 'center', direction: 'ltr' }}
      />
    </div>
  )
}
