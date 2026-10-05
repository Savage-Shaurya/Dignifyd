// One-shot "coaster" particle stream: 1000 soft dots travel left → right with a
// loop-the-loop in the middle third of their path. Canvas-2D port of a point shader.

type Cfg = {
  count: number;
  size: number;
  spawnXMin: number;
  spawnXMax: number;
  exitXMin: number;
  exitXMax: number;
  spawnYRange: number;
  durMin: number;
  durMax: number;
  delayRange: number;
  wobbleAmpX: number;
  wobbleAmpY: number;
  jigAmpMin: number;
  jigAmpMax: number;
  jigFreqMin: number;
  jigFreqMax: number;
  loopRadius: number;
  loopStart: number;
  loopEnd: number;
  curveMin?: number;
  curveMax?: number;
  coaster?: boolean;
  additive?: boolean;
};

const DESKTOP: Cfg = {
  count: 1000,
  size: 1.4,
  spawnXMin: 1500,
  spawnXMax: 1900,
  exitXMin: 1500,
  exitXMax: 1900,
  spawnYRange: 40,
  durMin: 4,
  durMax: 4.8,
  delayRange: 0.9,
  wobbleAmpX: 4,
  wobbleAmpY: 4,
  jigAmpMin: 0.2,
  jigAmpMax: 0.6,
  jigFreqMin: 0.6,
  jigFreqMax: 1.8,
  loopRadius: 140,
  loopStart: 0.3,
  loopEnd: 0.7,
};

// White additive swarm used behind the enquiry steps.
const SWARM: Cfg = {
  count: 300,
  size: 1.4,
  spawnXMin: 1500,
  spawnXMax: 1900,
  exitXMin: 1500,
  exitXMax: 1900,
  spawnYRange: 220,
  durMin: 2,
  durMax: 3.2,
  delayRange: 2.6,
  wobbleAmpX: 70,
  wobbleAmpY: 55,
  jigAmpMin: 2,
  jigAmpMax: 4.5,
  jigFreqMin: 1.8,
  jigFreqMax: 3.8,
  loopRadius: 0,
  loopStart: 0,
  loopEnd: 0,
  curveMin: 30,
  curveMax: 80,
  coaster: false,
  additive: true,
};

const MOBILE: Partial<Cfg> = { size: 2, spawnYRange: 80, loopRadius: 130, wobbleAmpX: 12, wobbleAmpY: 12, jigAmpMin: 0.4, jigAmpMax: 1 };

const FOV = 75;
const CAM_Z = 500;

export function startSwarm(canvas: HTMLCanvasElement, color = "#000000", flavor: "coaster" | "swarm" = "coaster") {
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => {};
  const base = flavor === "swarm" ? SWARM : { ...DESKTOP, coaster: true };
  const K: Cfg = window.innerWidth <= 767 && flavor === "coaster" ? { ...base, ...MOBILE } : base;
  const endRange = 200;
  const P = Array.from({ length: K.count }, () => ({
    startX: -(K.spawnXMin + Math.random() * (K.spawnXMax - K.spawnXMin)),
    endX: K.exitXMin + Math.random() * (K.exitXMax - K.exitXMin),
    startY: (Math.random() - 0.5) * K.spawnYRange,
    endY: (Math.random() - 0.5) * endRange,
    delay: Math.random() * K.delayRange,
    dur: K.durMin + Math.random() * (K.durMax - K.durMin),
    wfx: 1.2 + 2.4 * Math.random(),
    wfy: 1.2 + 2.4 * Math.random(),
    wpx: Math.random() * Math.PI * 2,
    wpy: Math.random() * Math.PI * 2,
    jA: K.jigAmpMin + Math.random() * (K.jigAmpMax - K.jigAmpMin),
    jF: K.jigFreqMin + Math.random() * (K.jigFreqMax - K.jigFreqMin),
    curve: ((K.curveMin ?? 0) + Math.random() * ((K.curveMax ?? 0) - (K.curveMin ?? 0))) * (Math.random() < 0.5 ? 1 : -1),
  }));

  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const resize = () => {
    canvas.width = Math.max(1, canvas.clientWidth * dpr);
    canvas.height = Math.max(1, canvas.clientHeight * dpr);
  };
  resize();
  window.addEventListener("resize", resize);

  // Sprite reproducing the shader's 1 - smoothstep(.14, .5, d) disc.
  const sprite = document.createElement("canvas");
  sprite.width = sprite.height = 64;
  const g = sprite.getContext("2d")!;
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  for (let i = 0; i <= 16; i++) {
    const d = (i / 16) * 0.5;
    const x = Math.min(1, Math.max(0, (d - 0.14) / (0.5 - 0.14)));
    const a = 1 - x * x * (3 - 2 * x);
    grd.addColorStop(i / 16, `rgba(0,0,0,${a})`);
  }
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  g.globalCompositeOperation = "source-in";
  g.fillStyle = color;
  g.fillRect(0, 0, 64, 64);

  const t0 = performance.now();
  let raf = 0;
  const frame = (now: number) => {
    const time = (now - t0) / 1000;
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = K.additive ? "lighter" : "source-over";
    const scale = ((H / dpr) * 0.5) / Math.tan((FOV * Math.PI) / 360);
    const pxPerUnit = scale / CAM_Z;
    const size = (K.size * 3.6 * scale * dpr) / CAM_Z;
    let alive = 0;
    for (const p of P) {
      const raw = (time - p.delay) / p.dur;
      if (raw < 0 || raw >= 1) {
        if (raw < 0) alive++;
        continue;
      }
      alive++;
      const r = raw;
      const e = r < 0.15 ? r * (r / 0.15) : r > 0.85 ? 1 - (1 - r) * ((1 - r) / 0.15) : r;
      let x = p.startX + (p.endX - p.startX) * e;
      let y = p.startY + (p.endY - p.startY) * e;
      y += Math.sin(e * Math.PI) * p.curve;
      if (K.coaster && e >= K.loopStart && e <= K.loopEnd) {
        const th = ((e - K.loopStart) / (K.loopEnd - K.loopStart)) * Math.PI * 2;
        x += K.loopRadius * Math.sin(th);
        y += K.loopRadius * (1 - Math.cos(th));
      }
      const decay = Math.sin(e * Math.PI);
      x += decay * K.wobbleAmpX * Math.sin(time * p.wfx + p.wpx);
      y += decay * K.wobbleAmpY * Math.cos(time * p.wfy + p.wpy);
      x += Math.sin(time * p.jF + p.wpx) * p.jA;
      y += Math.cos(time * p.jF * 1.13 + p.wpy) * p.jA;
      const sx = W / 2 + x * pxPerUnit * dpr;
      const sy = H / 2 - y * pxPerUnit * dpr;
      if (sx < -20 || sx > W + 20) continue;
      ctx.globalAlpha = 0.88 + 0.12 * Math.sin(time * 1.3 + p.wpx * 4);
      ctx.drawImage(sprite, sx - size / 2, sy - size / 2, size, size);
    }
    if (alive > 0) raf = requestAnimationFrame(frame);
    else ctx.clearRect(0, 0, W, H);
  };
  raf = requestAnimationFrame(frame);
  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", resize);
  };
}
