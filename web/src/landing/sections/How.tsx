const STEPS = [
  { num: 1, title: 'تواصل وياك على واتساب', text: 'ترسلنا اسم محلك ونوع شغلك، وتخبرنا شكد موظف تحتاج يدخل معك.' },
  { num: 2, title: 'نجهزلك حسابك بنفس اليوم', text: 'ننشئلك حساب مستقل، ونعطيك بيانات دخولك أنت وأي موظف تحدده.' },
  { num: 3, title: 'تبدأ تسجل فوراً', text: 'تفتح البرنامج من موبايلك وتبدأ تسجل حركاتك — بدون تدريب معقد ولا انتظار.' },
]

export default function How() {
  return (
    <section id="how">
      <div className="wrap">
        <div className="section-head">
          <div className="eyebrow">تبدأ بنفس اليوم</div>
          <h2>ثلاث خطوات وتصير جاهز</h2>
        </div>
        <div className="steps">
          {STEPS.map((s) => (
            <div className="step" key={s.num}>
              <div className="num">{s.num}</div>
              <h4>{s.title}</h4>
              <p>{s.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
