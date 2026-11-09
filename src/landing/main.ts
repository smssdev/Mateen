import '@fontsource/amiri-quran/400.css';
import '@fontsource/reem-kufi/600.css';
import '@fontsource/reem-kufi/700.css';
import '@fontsource/ibm-plex-sans-arabic/400.css';
import '@fontsource/ibm-plex-sans-arabic/500.css';
import '@fontsource/ibm-plex-sans-arabic/700.css';
import './landing.css';

const base = import.meta.env.BASE_URL;
const digits = (n: number) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d]);
const getJSON = <T>(p: string): Promise<T> => fetch(`${base}${p}`).then((r) => r.json());
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

interface SurahText {
  ayahs: string[][];
  sim?: Record<number, [number, number, number, number, number][]>;
}

// ---------- live demo: Al-Fatiha, word by word ----------
async function demo() {
  const card = $<HTMLButtonElement>('demo-card');
  const top = $('demo-top');
  const ref = $('demo-ref');
  const hint = $('demo-hint');
  const meaningBtn = $<HTMLButtonElement>('demo-meaning');
  const wrongBtn = $<HTMLButtonElement>('demo-wrong');
  const [fatiha, tafsir] = await Promise.all([getJSON<SurahText>('quran/1.json'), getJSON<string[]>('tafsir/1.json')]);

  let ayah = 0;
  let word = 0; // next hidden word
  let lastWrong = false;

  const render = () => {
    ref.textContent = `الفاتحة ﴿${digits(ayah + 1)}﴾`;
    const words = fatiha.ayahs[ayah];
    const done = word >= words.length;
    card.classList.toggle('next', done);
    card.innerHTML = done
      ? `<b>${ayah + 1 < fatiha.ayahs.length ? `الآية ${digits(ayah + 2)}` : 'من البداية'}</b><small>اضغط للمتابعة</small>`
      : '<span class="q">؟</span><small>تذكّر الكلمة ثم اضغط لكشفها</small>';
    wrongBtn.disabled = word === 0;
  };

  const showTop = (w: string) => {
    lastWrong = false;
    top.innerHTML = `<span class="w">${w}</span><span class="ok" aria-hidden="true">✓</span>`;
    top.classList.remove('wrong');
    top.classList.remove('pop');
    void top.offsetWidth; // restart the animation
    top.classList.add('pop');
  };

  card.addEventListener('click', () => {
    const words = fatiha.ayahs[ayah];
    hint.hidden = true;
    meaningBtn.classList.remove('on');
    if (word >= words.length) {
      ayah = (ayah + 1) % fatiha.ayahs.length;
      word = 0;
      top.innerHTML = '<span class="faded">…</span>';
    } else {
      showTop(words[word]);
      word++;
    }
    render();
  });

  wrongBtn.addEventListener('click', () => {
    lastWrong = !lastWrong;
    top.classList.toggle('wrong', lastWrong);
    const mark = top.querySelector('.ok');
    if (mark) mark.textContent = lastWrong ? '✕' : '✓';
  });

  meaningBtn.addEventListener('click', () => {
    hint.hidden = !hint.hidden;
    meaningBtn.classList.toggle('on', !hint.hidden);
    hint.innerHTML = `<b>المعنى:</b> ${tafsir[ayah]}`;
  });

  render();
}

// ---------- mutashabihat example: al-Baqarah 48 vs 123 ----------
async function fork() {
  const baqara = await getJSON<SurahText>('quran/2.json');
  const a = 47;
  const b = 122;
  const match = baqara.sim?.[a]?.find(([s, x]) => s === 2 && x === b);
  const [, , st1, st2, len] = match ?? [2, b, 0, 0, 0];
  const paint = (words: string[], start: number) =>
    words
      .map((w, i) =>
        i >= start && i < start + len
          ? `<span class="same">${w}</span>`
          : i === start + len
            ? `<span class="split">${w}</span>`
            : `<span>${w}</span>`,
      )
      .join(' ');
  $('fork-a').innerHTML = paint(baqara.ayahs[a], st1);
  $('fork-b').innerHTML = paint(baqara.ayahs[b], st2);
}

// ---------- the ayah quote (Sad 29), straight from the mushaf text ----------
async function quote() {
  const sad = await getJSON<SurahText>('quran/38.json');
  $('quote').textContent = `﴿${sad.ayahs[28].join(' ')}﴾`;
}

// ---------- reveal sections on scroll ----------
function reveal() {
  const els = document.querySelectorAll<HTMLElement>('.section h2, .pillar, .steps li, .grid article, .dl-card, .card');
  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      }),
    { rootMargin: '0px 0px -10% 0px' },
  );
  els.forEach((el) => {
    el.classList.add('will-reveal');
    io.observe(el);
  });
}

demo().catch(() => undefined);
fork().catch(() => undefined);
quote().catch(() => undefined);
reveal();
