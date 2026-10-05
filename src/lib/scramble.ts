// Character-cycling scramble used on labels, buttons and review CTAs.
const GLYPHS = [
  ..."あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをんابتثجحخدذرزسشصضطظعغفقكلمنهوي가나다라마바사아자차카타파하거너더러머버서어저처커터퍼허人大小天地中国王道德文学新水火山风云雷电星空生死爱情家光明亮金银玉龙虎凤马牛羊鸟鱼花草树木林海洋时年月日春夏秋冬东西南北心力气",
];
const isLetter = /[\p{L}\p{N}]/u;
const rnd = () => GLYPHS[(Math.random() * GLYPHS.length) | 0];

export type ScrambleOpts = { stagger?: number; cycles?: number; cycleMs?: number; delay?: number };

export function scramble(el: HTMLElement, text: string, opts: ScrambleOpts = {}) {
  const { stagger = 35, cycles = 10, cycleMs = 70, delay = 0 } = opts;
  const timers: number[] = [];
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    el.textContent = text;
    return () => {};
  }
  const chars = [...text];
  el.textContent = "";
  const spans = chars.map((ch) => {
    const s = document.createElement("span");
    s.textContent = isLetter.test(ch) ? rnd() : ch;
    el.append(s);
    return s;
  });
  let remaining = chars.filter((c) => isLetter.test(c)).length;
  const done = () => {
    if (--remaining <= 0) el.textContent = text;
  };
  chars.forEach((ch, i) => {
    if (!isLetter.test(ch)) return;
    const n = Math.max(1, cycles - 2 + Math.floor(5 * Math.random()));
    const step = Math.max(10, cycleMs - 10 + Math.floor(20 * Math.random()));
    let c = 0;
    const tick = () => {
      if (c >= n) {
        spans[i].textContent = ch;
        done();
        return;
      }
      spans[i].textContent = rnd();
      c++;
      timers.push(window.setTimeout(tick, step));
    };
    timers.push(window.setTimeout(tick, delay * 1000 + i * stagger));
  });
  return () => timers.forEach(clearTimeout);
}
