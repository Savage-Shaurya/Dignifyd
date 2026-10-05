// Canvas-2D fallback for the hero globe, used when WebGL is unavailable or software-only.
// Same framing, spin, drag and colours as the WebGL engine, with fewer dots.

type City = { name: string; lat: number; lng: number; isHQ?: boolean; accent?: boolean };
type Opts = {
  container: HTMLElement;
  canvas: HTMLCanvasElement;
  isLand: (lat: number, lng: number) => boolean;
  cities: City[];
  arcPairs: [string, string][];
  facing?: { lat: number; lng: number } | null;
  onFirstFrame?: () => void;
};

const INK = "245,245,245";
const ACCENT = "238,26,67";
const D2R = Math.PI / 180;

const vec = (lat: number, lng: number): [number, number, number] => {
  const la = lat * D2R;
  const lo = lng * D2R;
  return [Math.cos(la) * Math.cos(lo), Math.sin(la), -Math.cos(la) * Math.sin(lo)];
};

export function createGlobe2D({ container, canvas, isLand, cities, arcPairs, facing, onFirstFrame }: Opts) {
  const ctx = canvas.getContext("2d")!;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mobile = window.matchMedia("(max-width: 767px)").matches;
  const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  // Land dots on a Fibonacci sphere.
  const N = mobile ? 9000 : 16000;
  const golden = Math.PI * (3 - Math.sqrt(5));
  const pts: number[] = [];
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const th = golden * i;
    const x = Math.cos(th) * r;
    const z = Math.sin(th) * r;
    const lat = Math.asin(y) / D2R;
    const lng = Math.atan2(-z, x) / D2R;
    if (isLand(lat, lng)) pts.push(x, y, z);
  }
  const land = Float32Array.from(pts);

  const byName = Object.fromEntries(cities.map((c) => [c.name, c]));
  const hubs = cities.map((c) => ({ v: vec(c.lat, c.lng), accent: !!c.accent }));
  const arcs = arcPairs
    .filter(([a, b]) => byName[a] && byName[b])
    .map(([a, b]) => {
      const A = vec(byName[a].lat, byName[a].lng);
      const B = vec(byName[b].lat, byName[b].lng);
      const ang = Math.acos(Math.min(1, Math.max(-1, A[0] * B[0] + A[1] * B[1] + A[2] * B[2])));
      const n = Math.max(24, Math.round(48 * ang));
      const line: number[] = [];
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const wa = Math.sin((1 - t) * ang) / Math.sin(ang);
        const wb = Math.sin(t * ang) / Math.sin(ang);
        const lift = 1 + 0.3 * Math.sin(Math.PI * t);
        line.push((A[0] * wa + B[0] * wb) * lift, (A[1] * wa + B[1] * wb) * lift, (A[2] * wa + B[2] * wb) * lift);
      }
      return { line, offset: Math.random(), freq: 1 / (18 + 12 * Math.random()) };
    });

  let W = 1;
  let H = 1;
  let R = 1;
  let cx = 0;
  let cy = 0;
  let dpr = 1;
  const resize = () => {
    W = container.clientWidth;
    H = container.clientHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, W * dpr);
    canvas.height = Math.max(1, H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    R = Math.min(512, 0.66 * Math.min(W, H)) / 2;
    cx = W / 2;
    cy = Math.max(0.38 * H, R + 120);
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(container);

  const f = facing ?? cities.find((c) => c.accent) ?? cities[0];
  const F = vec(f.lat, "lng" in f ? f.lng : 0);
  let rotY = -Math.atan2(F[0], F[2]);
  let rotX = 0;
  let spin = reduced ? 0 : 0.055;
  const AUTO = spin;
  let dragging = false;
  let lx = 0;
  let ly = 0;
  let targetY = 0;
  let targetX = 0;
  let vel = 0;
  let lastMoveT = 0;

  const project = (x: number, y: number, z: number, cyr: number, syr: number, cxr: number, sxr: number) => {
    const X = cyr * x + syr * z;
    const Z1 = -syr * x + cyr * z;
    const Y = cxr * y - sxr * Z1;
    const Z = sxr * y + cxr * Z1;
    return [cx + X * R, cy - Y * R, Z] as const;
  };

  const sprite = document.createElement("canvas");
  sprite.width = sprite.height = 16;
  {
    const g = sprite.getContext("2d")!;
    const gr = g.createRadialGradient(8, 8, 0, 8, 8, 8);
    gr.addColorStop(0, `rgba(${INK},1)`);
    gr.addColorStop(0.35, `rgba(${INK},1)`);
    gr.addColorStop(1, `rgba(${INK},0)`);
    g.fillStyle = gr;
    g.fillRect(0, 0, 16, 16);
  }

  let t = 0;
  let intro = reduced ? 1 : 0;
  let enabled = false;
  let visible = true;
  let running = false;
  let raf = 0;
  let last = performance.now();
  let first = false;
  let frameEMA = 1 / 60;
  let stride = 1; // adaptive: skip every other land dot when frames run slow

  const frame = (now: number) => {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    t += dt;
    frameEMA += (dt - frameEMA) * 0.05;
    if (frameEMA > 1 / 48) stride = 2;
    else if (frameEMA < 1 / 90) stride = 1;
    intro = Math.min(1, intro + dt / 1.6);
    const e = 1 - Math.pow(2, -10 * intro);
    if (dragging) {
      const k = 1 - Math.exp(-26 * dt);
      rotY += (targetY - rotY) * k;
      rotX += (targetX - rotX) * k;
    } else {
      spin += (AUTO - spin) * (1 - Math.exp(-1.2 * dt));
      rotY += spin * dt;
      rotX += (0 - rotX) * (1 - Math.exp(-0.9 * dt));
    }
    const cyr = Math.cos(rotY);
    const syr = Math.sin(rotY);
    const cxr = Math.cos(rotX);
    const sxr = Math.sin(rotX);
    ctx.clearRect(0, 0, W, H);
    ctx.globalAlpha = 1;

    // Rim glow.
    const rim = ctx.createRadialGradient(cx, cy, R * 0.86, cx, cy, R * 1.06);
    rim.addColorStop(0, `rgba(${INK},0)`);
    rim.addColorStop(0.82, `rgba(${INK},${0.14 * e})`);
    rim.addColorStop(1, `rgba(${INK},0)`);
    ctx.fillStyle = rim;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 1.06, 0, Math.PI * 2);
    ctx.fill();

    // Land.
    const s = (mobile ? 2.2 : 2.6) * (0.9 + 0.1 * e);
    for (let i = 0; i < land.length; i += 3 * stride) {
      const [px, py, z] = project(land[i], land[i + 1], land[i + 2], cyr, syr, cxr, sxr);
      const front = (z + 1) / 2;
      ctx.globalAlpha = (0.12 + 0.88 * front * front) * e;
      const d = s * (0.7 + 0.3 * front);
      ctx.drawImage(sprite, px - d / 2, py - d / 2, d, d);
    }

    // Arcs: per-segment depth fade (behind the globe = faint), plus a glowing comet beam.
    ctx.lineCap = "round";
    for (const a of arcs) {
      const n = a.line.length / 3;
      const P: number[] = [];
      const Z: number[] = [];
      for (let i = 0; i < n; i++) {
        const [px, py, z] = project(a.line[i * 3], a.line[i * 3 + 1], a.line[i * 3 + 2], cyr, syr, cxr, sxr);
        P.push(px, py);
        Z.push(z);
      }
      ctx.lineWidth = 1;
      ctx.strokeStyle = `rgb(${INK})`;
      for (let i = 0; i < n - 1; i++) {
        const front = (Z[i] + Z[i + 1]) / 2;
        ctx.globalAlpha = (front > -0.15 ? 0.1 + 0.2 * Math.min(1, front + 0.15) : 0.035) * e;
        ctx.beginPath();
        ctx.moveTo(P[i * 2], P[i * 2 + 1]);
        ctx.lineTo(P[i * 2 + 2], P[i * 2 + 3]);
        ctx.stroke();
      }
      const cyc = (t * a.freq + a.offset) % 1;
      if (cyc < 0.2 && !reduced) {
        const tr = cyc / 0.2;
        const head = (tr * tr * (3 - 2 * tr)) * (n - 1);
        const hi = Math.floor(head);
        const TAIL = 12;
        ctx.lineWidth = 1.6;
        for (let k = Math.max(0, hi - TAIL); k < hi && k < n - 1; k++) {
          const w = 1 - (hi - k) / TAIL;
          ctx.globalAlpha = 0.75 * w * w * e;
          ctx.beginPath();
          ctx.moveTo(P[k * 2], P[k * 2 + 1]);
          ctx.lineTo(P[k * 2 + 2], P[k * 2 + 3]);
          ctx.stroke();
        }
        const f = head - hi;
        const j = Math.min(n - 1, hi + 1);
        const hx = P[hi * 2] + (P[j * 2] - P[hi * 2]) * f;
        const hy = P[hi * 2 + 1] + (P[j * 2 + 1] - P[hi * 2 + 1]) * f;
        ctx.globalAlpha = e;
        ctx.drawImage(sprite, hx - 4, hy - 4, 8, 8);
      }
    }

    // Centres.
    for (const h of hubs) {
      const [px, py, z] = project(h.v[0], h.v[1], h.v[2], cyr, syr, cxr, sxr);
      const front = (z + 1) / 2;
      const pulse = h.accent && !reduced ? 1 + 0.3 * Math.sin(t * 2.2) : 1;
      ctx.globalAlpha = (0.2 + 0.8 * front) * e;
      ctx.fillStyle = h.accent ? `rgb(${ACCENT})` : `rgb(${INK})`;
      ctx.beginPath();
      ctx.arc(px, py, (h.accent ? 4 : 3) * pulse, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (!first) {
      first = true;
      onFirstFrame?.();
    }
    raf = requestAnimationFrame(frame);
  };

  const sync = () => {
    const want = enabled && visible && !document.hidden;
    if (want && !running) {
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    } else if (!want && running) {
      running = false;
      cancelAnimationFrame(raf);
    }
  };
  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    sync();
  });
  io.observe(container);
  document.addEventListener("visibilitychange", sync);

  const down = (e: PointerEvent) => {
    if (e.pointerType === "touch") return;
    dragging = true;
    spin = 0;
    vel = 0;
    targetY = rotY;
    targetX = rotX;
    lastMoveT = e.timeStamp;
    lx = e.clientX;
    ly = e.clientY;
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = "grabbing";
  };
  const move = (e: PointerEvent) => {
    if (!dragging) return;
    const samples = e.getCoalescedEvents?.() ?? [];
    for (const ev of samples.length ? samples : [e]) {
      const dx = ev.clientX - lx;
      const dy = ev.clientY - ly;
      lx = ev.clientX;
      ly = ev.clientY;
      const step = 0.0045 * dx;
      targetY += step;
      const dtm = Math.max(4, ev.timeStamp - lastMoveT);
      lastMoveT = ev.timeStamp;
      vel += ((step / dtm) * 1000 - vel) * (1 - Math.exp(-dtm / 60));
      targetX = Math.max(-0.55, Math.min(0.55, targetX + 0.0035 * dy));
    }
  };
  const up = () => {
    if (dragging) {
      const idle = performance.now() - lastMoveT;
      spin = Math.max(-2.2, Math.min(2.2, vel * Math.exp(-Math.max(0, idle - 40) / 90)));
    }
    dragging = false;
    canvas.style.cursor = fine ? "grab" : "";
  };
  canvas.style.touchAction = "pan-y";
  if (fine) canvas.style.cursor = "grab";
  canvas.addEventListener("pointerdown", down);
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointercancel", up);

  return {
    setEnabled(v: boolean) {
      enabled = v;
      sync();
    },
    setVisitor() {},
    dispose() {
      cancelAnimationFrame(raf);
      running = false;
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", sync);
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
    },
  };
}
