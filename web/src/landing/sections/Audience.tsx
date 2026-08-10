const CARDS = [
  {
    icon: 'ص',
    title: 'مكاتب الصيرفة',
    text: 'سجّل كل عملية بيع وشراء عملة بسعر الصرف الحقيقي وقتها، وتابع رصيد الصندوق دولار ودينار أول بأول بدون ما تحسب يدوياً.',
  },
  {
    icon: 'ر',
    title: 'منافذ صرف الرواتب',
    text: 'كل عملية صرف راتب تاخذ رقم سند وتاريخ ووقت، وتعرف بالضبط أي موظف من فريقك سلّم أي مبلغ لمن.',
  },
  {
    icon: 'ق',
    title: 'مكاتب البيع بالتقسيط والأجل',
    text: 'تابع ذمم كل زبون، الأقساط المتبقية، وتاريخ كل دفعة بكشف حساب واحد — بدون ورقة تضيع أو قسط تنسى.',
  },
]

export default function Audience() {
  return (
    <section id="audience">
      <div className="wrap">
        <div className="section-head">
          <div className="eyebrow">لمين هذا النظام</div>
          <h2>مبني لثلاث شغلات تعتمد على الثقة بالأرقام</h2>
          <p>مو برنامج محاسبة عام — حساباتي مصمم لطبيعة الشغل النقدي اليومي بهذي المحلات تحديداً.</p>
        </div>
        <div className="audience-grid">
          {CARDS.map((c) => (
            <div className="audience-card" key={c.title}>
              <div className="icon">{c.icon}</div>
              <h3>{c.title}</h3>
              <p>{c.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
