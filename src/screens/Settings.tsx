import { useRef } from 'react';
import { RECITERS, toArabicDigits } from '../lib/quran';
import { getState, replaceState, resetAll, Settings as S, updateSettings, useStore } from '../lib/store';

export function Settings() {
  const s = useStore((st) => st.settings);
  const file = useRef<HTMLInputElement>(null);

  const exportData = () => {
    const blob = new Blob([JSON.stringify(getState())], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `mateen-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const importData = async (f: File) => {
    try {
      const data = JSON.parse(await f.text());
      if (data?.version !== 1 || typeof data.progress !== 'object') throw new Error();
      if (confirm('سيتم استبدال بياناتك الحالية بالنسخة الاحتياطية. متابعة؟')) replaceState(data);
    } catch {
      alert('الملف غير صالح.');
    }
  };

  const set = <K extends keyof S>(k: K, v: S[K]) => updateSettings({ [k]: v } as Partial<S>);

  return (
    <div className="screen">
      <header className="page-head">
        <h1>الإعدادات</h1>
      </header>

      <section className="settings">
        <label className="row">
          <span>
            عدد الآيات الجديدة يوميًا لكل سورة
            <small>تُعرض بعد إنهاء المراجعات المستحقة.</small>
          </span>
          <select value={s.newPerDay} onChange={(e) => set('newPerDay', Number(e.target.value))}>
            {[0, 1, 2, 3, 5, 7, 10, 15, 20].map((n) => (
              <option key={n} value={n}>
                {toArabicDigits(n)}
              </option>
            ))}
          </select>
        </label>

        <label className="row">
          <span>القارئ</span>
          <select value={s.reciter} onChange={(e) => set('reciter', e.target.value)}>
            {RECITERS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>

        <label className="row">
          <span>
            تشغيل التلاوة تلقائيًا
            <small>عند عرض آية جديدة وبعد إنهاء اختبار كل آية.</small>
          </span>
          <input type="checkbox" checked={s.autoPlay} onChange={(e) => set('autoPlay', e.target.checked)} />
        </label>

        <label className="row">
          <span>
            عرض نهاية الآية السابقة
            <small>يساعدك على ربط الآيات بالمعنى كما تُتلى.</small>
          </span>
          <input type="checkbox" checked={s.showContext} onChange={(e) => set('showContext', e.target.checked)} />
        </label>

        <label className="row">
          <span>
            إظهار طول الكلمة المخفية
            <small>الفراغ بقدر طول الكلمة، فلا تتحرك الكلمات أثناء التمرير. أطفئه لتحدٍّ أصعب.</small>
          </span>
          <input type="checkbox" checked={s.hintLength} onChange={(e) => set('hintLength', e.target.checked)} />
        </label>

        <label className="row">
          <span>حجم خط المصحف</span>
          <input
            type="range"
            min={0.8}
            max={1.6}
            step={0.1}
            value={s.fontScale}
            onChange={(e) => set('fontScale', Number(e.target.value))}
          />
        </label>

        <label className="row">
          <span>المظهر</span>
          <select value={s.theme} onChange={(e) => set('theme', e.target.value as S['theme'])}>
            <option value="auto">حسب الجهاز</option>
            <option value="light">فاتح</option>
            <option value="dark">داكن</option>
          </select>
        </label>
      </section>

      <h3>البيانات</h3>
      <p className="muted small">يُحفظ تقدمك على هذا الجهاز فقط. صدّر نسخة احتياطية لنقلها إلى جهاز آخر.</p>
      <div className="controls wrap">
        <button className="btn" onClick={exportData}>
          تصدير نسخة احتياطية
        </button>
        <button className="btn" onClick={() => file.current?.click()}>
          استيراد
        </button>
        <input
          ref={file}
          type="file"
          accept="application/json"
          hidden
          onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])}
        />
        <button
          className="btn ghost danger-text"
          onClick={() => confirm('حذف جميع البيانات نهائيًا؟') && resetAll()}
        >
          حذف كل البيانات
        </button>
      </div>

      <h3>كيف يعمل التطبيق؟</h3>
      <ul className="about">
        <li>
          <b>تذكّر ثم اكشف:</b> بدل تكرار القراءة، تحاول تذكّر كل كلمة قبل كشفها، فيتنبّه ذهنك وتتمكّن الآيات من
          الذاكرة البعيدة.
        </li>
        <li>
          <b>جدولة ذكية:</b> يعرف التطبيق مستوى حفظك لكل كلمة، فيعيد عليك الآيات الضعيفة كثيرًا ويباعد بين الآيات
          المتقنة.
        </li>
        <li>
          <b>بلا قرائن بصرية:</b> لا صفحات ولا أسطر؛ تُعرض الآية وحدها حتى يعتمد حفظك على المعنى وترابط الآيات.
        </li>
        <li>
          <b>دقة الكلمة:</b> يكشف لك المواضع الدقيقة للخطأ مثل «عليك/إليك» و«أتيناهم/آتيناهم».
        </li>
      </ul>
      <p className="muted small">
        نص المصحف: الرسم العثماني من مشروع تنزيل (tanzil.net) دون تعديل. التلاوات من everyayah.com.
      </p>
    </div>
  );
}
