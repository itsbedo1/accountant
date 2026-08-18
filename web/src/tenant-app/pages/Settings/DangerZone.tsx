import { useDataStore } from '../../state/useDataStore'

// منطقة الخطر — منقولة من stResetMoves/stResetAll (index.html:4468-4529)
export default function DangerZone({ confirmPin }: { confirmPin: (label: string) => Promise<boolean> }) {
  const resetMoves = useDataStore((s) => s.resetMoves)
  const resetAll = useDataStore((s) => s.resetAll)

  async function doResetMoves() {
    const pinOk = await confirmPin('⚠️ مسح جميع الحركات')
    if (!pinOk) return
    if (!confirm('هل تريد مسح جميع حركات الصندوق والصيرفة؟\nستبقى أرصدة العملاء كما هي.')) return
    await resetMoves()
  }

  async function doResetAll() {
    const pinOk = await confirmPin('⚠️⚠️ إعادة ضبط المصنع الكاملة')
    if (!pinOk) return
    if (!confirm('⚠️ تحذير: سيتم مسح كل البيانات (العملاء، الحركات، الأرصدة).\nهل أنت متأكد؟')) return
    if (!confirm('تأكيد أخير: هذا الإجراء لا يمكن التراجع عنه!')) return
    await resetAll()
  }

  return (
    <div style={{ background: 'rgba(251,113,133,.06)', border: '1px solid rgba(251,113,133,.2)', borderRadius: 12, padding: 14, marginBottom: 14 }}>
      <div style={{ color: 'var(--red)', fontSize: 13, fontWeight: 900, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>⚠️ منطقة الخطر</div>
      <button
        onClick={() => void doResetMoves()}
        style={{ width: '100%', padding: 10, borderRadius: 8, fontFamily: "'Cairo',sans-serif", fontSize: 13, fontWeight: 700, background: 'rgba(251,113,133,0.3)', border: '1.5px solid var(--red)', color: 'var(--red2)', cursor: 'pointer', marginBottom: 8 }}
      >
        🗑 مسح جميع حركات الصندوق
      </button>
      <button
        onClick={() => void doResetAll()}
        style={{ width: '100%', padding: 10, borderRadius: 8, fontFamily: "'Cairo',sans-serif", fontSize: 13, fontWeight: 700, background: 'rgba(251,113,133,0.5)', border: '1.5px solid var(--red)', color: 'white', cursor: 'pointer' }}
      >
        ⚠️ إعادة ضبط المصنع (مسح كل شيء)
      </button>
    </div>
  )
}
