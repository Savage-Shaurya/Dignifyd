import { K, circlePath } from "@/lib/gsap";

// Block-letter glyphs (30 wide, y 25..75) the tracker nodes morph into.
// All use even-odd fill so counters punch through.

export const ringDot = (cx: number, r = 9) => `${circlePath(cx, 50, r)} ${circlePath(cx, 50, 0.4)}`;

export function wobbleDot(cx: number) {
  const [t, rr, b, l] = [0, 1, 2, 3].map(() => 9 * (1 + (Math.random() - 0.5) * 0.7));
  const cy = 50;
  return `M ${cx - l} ${cy} C ${cx - l} ${cy - K * t}, ${cx - K * l} ${cy - t}, ${cx} ${cy - t} C ${cx + K * rr} ${cy - t}, ${cx + rr} ${cy - K * t}, ${cx + rr} ${cy} C ${cx + rr} ${cy + K * b}, ${cx + K * rr} ${cy + b}, ${cx} ${cy + b} C ${cx - K * l} ${cy + b}, ${cx - l} ${cy + K * b}, ${cx - l} ${cy} Z ${circlePath(cx, 50, 0.4)}`;
}

function glyphD(cx: number) {
  const x = cx - 15;
  const g = cx + 15;
  const f = x + 8;
  const v = K * (g - f);
  const outer = `M ${x} 75 L ${x} 25 L ${f} 25 C ${f + v} 25, ${g} ${50 - v}, ${g} 50 C ${g} ${50 + v}, ${f + v} 75, ${f} 75 L ${x} 75 Z`;
  const y1 = 35;
  const y2 = 65;
  const j = g - 10;
  const rr = Math.min((y2 - y1) / 2, j - f);
  const k = K * rr;
  const M = j - rr;
  const inner = `M ${f} ${y1} L ${M} ${y1} C ${M + k} ${y1}, ${j} ${50 - k}, ${j} 50 C ${j} ${50 + k}, ${M + k} ${y2}, ${M} ${y2} L ${f} ${y2} Z`;
  return `${outer} ${inner}`;
}

function glyphH(cx: number) {
  const a = cx - 15;
  const d = cx + 15;
  return `M ${a} 25 L ${a + 8} 25 L ${a + 8} 45 L ${d - 8} 45 L ${d - 8} 25 L ${d} 25 L ${d} 75 L ${d - 8} 75 L ${d - 8} 55 L ${a + 8} 55 L ${a + 8} 75 L ${a} 75 Z ${circlePath(cx, 50, 0.4)}`;
}

function glyphB(cx: number) {
  const a = cx - 15;
  const outer = `M ${a} 25 L ${a + 15} 25 A 12 12.5 0 0 1 ${a + 15} 50 A 13.5 12.5 0 0 1 ${a + 15} 75 L ${a} 75 Z`;
  const top = `M ${a + 8} 33 L ${a + 15} 33 A 4.5 4.5 0 0 1 ${a + 15} 42 L ${a + 8} 42 Z`;
  const bot = `M ${a + 8} 58 L ${a + 15} 58 A 4.5 4.5 0 0 1 ${a + 15} 67 L ${a + 8} 67 Z`;
  return `${outer} ${top} ${bot}`;
}

function glyphR(cx: number) {
  const a = cx - 15;
  const outer = `M ${a} 75 L ${a} 25 L ${a + 14} 25 A 13.6 13.6 0 0 1 ${a + 20} 51 L ${a + 30} 75 L ${a + 21} 75 L ${a + 12} 53 L ${a + 8} 53 L ${a + 8} 75 Z`;
  const hole = `M ${a + 8} 33 L ${a + 14} 33 A 5.5 5.5 0 0 1 ${a + 14} 44 L ${a + 8} 44 Z`;
  return `${outer} ${hole}`;
}

function glyphG(cx: number) {
  return `M ${cx + 11.5} 33.9 A 15 25 0 1 0 ${cx + 15} 50 L ${cx + 1} 50 L ${cx + 1} 57 L ${cx + 6.4} 57 A 7 17 0 1 1 ${cx + 5.4} 39.1 Z ${circlePath(cx, 50, 0.4)}`;
}

function glyphE(cx: number) {
  const c = cx - 15;
  const d = cx + 15;
  const u = c + 8;
  const m = d - 3;
  return `M ${c} 25 L ${d} 25 L ${d} 35 L ${u} 35 L ${u} 45 L ${m} 45 L ${m} 55 L ${u} 55 L ${u} 65 L ${d} 65 L ${d} 75 L ${c} 75 Z ${circlePath(cx, 50, 0.4)}`;
}

const MAP: Record<string, (cx: number) => string> = { D: glyphD, H: glyphH, B: glyphB, R: glyphR, G: glyphG, E: glyphE };

export const glyph = (letter: string, cx: number) => (MAP[letter] ?? glyphD)(cx);
