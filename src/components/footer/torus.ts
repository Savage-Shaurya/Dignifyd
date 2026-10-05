// Footer "eye": 1,800 soft dots fly in from the edges and settle on a tilted, spinning torus
// with a sweeping beam. Click it and the dots burst outward, fall, bounce and pile up on the
// floor; click again and they fly back into the torus.
//
// Physics is a fixed 120 Hz step (frame-rate independent) with a sand-pile heightmap for the
// floor, so 1,800 dots stay smooth without a rigid-body engine.

type Opts = {
  footer: HTMLElement;
  canvas: HTMLCanvasElement;
  anchor?: HTMLElement | null;
  colors: { white: string; accent: string; rare: string };
};

const TAU = Math.PI * 2;
const BEAM_W = TAU / 11;
const TILT_SIN = 0.5226872289306592;
const TILT_COS = 0.8525245220595057;
const BALL_R = 0.77;
const DRAW_R = BALL_R * 2.2; // sprite radius in css px
const DIAM = DRAW_R * 2;

// Fall tuning.
const STEP = 1 / 120;
const GRAVITY = 1650; // px/s²
const AIR = 0.55; // 1/s velocity damping
const WALL_BOUNCE = 0.45;
const FLOOR_BOUNCE = 0.32;
const SETTLE_SPEED = 240; // px/s: slower impacts settle instead of bouncing
const LAND_TIME = 0.22; // s, eased slide into the resting slot

function makeSprite(color: string) {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  (
    [
      [0, 1],
      [0.28, 1],
      [0.5, 0.7],
      [0.72, 0.28],
      [0.88, 0.07],
      [1, 0],
    ] as const
  ).forEach(([o, a]) => gr.addColorStop(o, `rgba(255,255,255,${a})`));
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  g.globalCompositeOperation = "source-in";
  g.fillStyle = color;
  g.fillRect(0, 0, 64, 64);
  return c;
}

type Entry = { startX: number; startY: number; curve: number; delay: number; dur: number; wfx: number; wfy: number; wpx: number; wpy: number };
type Particle = {
  color: "white" | "accent" | "rare";
  torus: { u0: number; v: number; speedJitter: number; radialJitter: number };
  entry: Entry;
  x: number;
  y: number;
  depthAlpha: number;
  depthSize: number;
  beam: number;
  // fall state
  vx: number;
  vy: number;
  settled: boolean;
  land: { sx: number; sy: number; tx: number; ty: number; t: number } | null;
  ox: number;
  oy: number;
  fallAlpha: number;
};

export function createTorus({ footer, canvas, anchor, colors }: Opts) {
  const ctx = canvas.getContext("2d")!;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isMobile = window.matchMedia("(max-width: 767px)").matches;
  const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const N = isMobile ? 1000 : 1800;
  const scaleFrac = isMobile ? 0.33 : 0.13;
  const centerFrac = isMobile ? 0.28 : 0.5;
  const sprites = { white: makeSprite(colors.white), accent: makeSprite(colors.accent), rare: makeSprite(colors.rare) };
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  let W = 0;
  let H = 0;
  let ringR = 0;
  let tubeR = 0;
  let cx = 0;
  let cy = 0;
  let persp = 1;
  let hitW = 0;
  let hitH = 0;
  let floorY = 0;
  let state: "spinning" | "falling" = "spinning";
  let spin = reduced ? 0 : 0.32;
  const spinTarget = reduced ? 0 : 0.32;
  let angleOffset = 0;
  const pointer = { x: -1e6, y: -1e6 };
  let dragging = false;
  let dragMoved = false;
  let lastX = 0;
  let downX = 0;
  let downY = 0;
  let particles: Particle[] = [];
  let created = false;
  let lastWin = "";
  let heights = new Float32Array(1);
  let fallStart = 0;

  const makeEntry = (u0: number): Entry => {
    const r = 0.06 + 0.28 * Math.random();
    let startX: number;
    let startY: number;
    if (Math.random() < W / (W + H)) {
      startX = Math.random() * W * 1.2 - 0.1 * W;
      startY = Math.random() < 0.5 ? -H * r - 40 : H * (1 + r) + 40;
    } else {
      startX = Math.random() < 0.5 ? -W * r - 40 : W * (1 + r) + 40;
      startY = Math.random() * H * 1.2 - 0.1 * H;
    }
    return {
      startX,
      startY,
      curve: (40 + 90 * Math.random()) * (Math.random() < 0.5 ? 1 : -1),
      delay: (u0 / TAU) * 0.9 + 0.5 * Math.random(),
      dur: 1.6 + 1.2 * Math.random(),
      wfx: 1.2 + 2.4 * Math.random(),
      wfy: 1.2 + 2.4 * Math.random(),
      wpx: Math.random() * TAU,
      wpy: Math.random() * TAU,
    };
  };

  const createParticles = () => {
    const cols: Particle["color"][] = Array(N).fill("white");
    cols[Math.floor(Math.random() * N)] = "accent";
    let n = 0;
    while (n < 4) {
      const i = Math.floor(Math.random() * N);
      if (cols[i] === "white") {
        cols[i] = "rare";
        n++;
      }
    }
    particles = cols.map((color) => {
      const torus = { u0: Math.random() * TAU, v: Math.random() * TAU, speedJitter: (Math.random() - 0.5) * 0.04, radialJitter: (Math.random() - 0.5) * 0.08 };
      const entry = makeEntry(torus.u0);
      return { color, torus, entry, x: entry.startX, y: entry.startY, depthAlpha: 1, depthSize: 1, beam: 0, vx: 0, vy: 0, settled: false, land: null, ox: 0, oy: 0, fallAlpha: 1 };
    });
    created = true;
  };

  const resetFloor = () => {
    heights = new Float32Array(Math.max(1, Math.ceil(W / DIAM)));
    for (const p of particles) {
      p.settled = false;
      p.land = null;
    }
  };

  const layout = () => {
    const r = footer.getBoundingClientRect();
    const prevW = W;
    W = r.width;
    H = r.height;
    if (!W || !H) return;
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ringR = Math.min(W * scaleFrac, 180);
    tubeR = 0.38 * ringR;
    const projH = (ringR + tubeR) * TILT_SIN + TILT_COS * tubeR;
    const maxH = H * (isMobile ? 0.7 : 0.55);
    if (projH > maxH) {
      const k = maxH / projH;
      ringR *= k;
      tubeR *= k;
    }
    persp = (ringR + tubeR) * 2.5;
    hitW = (ringR + tubeR) * 1.25 + 20;
    hitH = ((ringR + tubeR) * TILT_SIN + TILT_COS * tubeR) * 1.25 + 20;
    cx = W / 2;
    floorY = H - 2;
    const win = `${window.innerWidth}x${window.innerHeight}`;
    if (!created || win !== lastWin) {
      lastWin = win;
      if (isMobile && anchor) {
        const a = anchor.getBoundingClientRect();
        cy = a.top - r.top + a.height / 2;
      } else cy = H * centerFrac;
    }
    if (!created) createParticles();
    if (state === "falling" && prevW !== W) resetFloor();
  };

  /* ---------------- spinning torus ---------------- */
  const update = (t: number) => {
    const beamAngle = (t * BEAM_W) % TAU;
    const beamRamp = reduced ? 0 : Math.min(1, Math.max(0, (t - 2.2) / 1.5));
    for (const p of particles) {
      const to = p.torus;
      const u = to.u0 + angleOffset + t * to.speedJitter;
      const cv = Math.cos(to.v);
      const sv = Math.sin(to.v);
      const rad = ringR + tubeR * cv * (1 + to.radialJitter);
      const px = rad * Math.cos(u);
      const pz = rad * Math.sin(u);
      const py = tubeR * sv;
      const sy = TILT_COS * py - TILT_SIN * pz;
      const m = persp + (TILT_SIN * py + TILT_COS * pz);
      const sc = m > 1 ? persp / m : persp;
      const tx = cx + px * sc;
      const ty = cy - sy * sc;
      const depth = Math.min(1, Math.max(0, (sc - 0.55) / 0.9));
      p.depthAlpha = 0.28 + 0.72 * depth;
      p.depthSize = 0.7 + 0.4 * depth;
      let d = beamAngle - (((u % TAU) + TAU) % TAU);
      if (d < 0) d += TAU;
      p.beam = Math.exp(-5.5 * d) * beamRamp;
      const b = reduced ? 1 : (t - p.entry.delay) / p.entry.dur;
      const w = b < 0 ? 0 : b > 1 ? 1 : b;
      const e = w >= 1 ? 1 : 1 - Math.pow(2, -10 * w);
      let x = p.entry.startX + (tx - p.entry.startX) * e;
      let y = p.entry.startY + (ty - p.entry.startY) * e + Math.sin(e * Math.PI) * p.entry.curve;
      const wob = (1 - w) * (1 - w);
      x += 32 * wob * Math.sin(t * p.entry.wfx + p.entry.wpx);
      y += 28 * wob * Math.cos(t * p.entry.wfy + p.entry.wpy);
      if (!dragging && w > 0.6 && pointer.x > -1e5) {
        const dx = x - pointer.x;
        const dy = y - pointer.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 6400 && d2 > 0.01) {
          const dist = Math.sqrt(d2);
          const f = 1 - dist / 80;
          const push = f * f * 30;
          x += (dx / dist) * push;
          y += (dy / dist) * push;
        }
      }
      p.x = x;
      p.y = y;
    }
  };

  /* ---------------- burst + fall ---------------- */
  const binOf = (x: number) => Math.min(heights.length - 1, Math.max(0, Math.floor(x / DIAM)));

  const settle = (p: Particle, t: number) => {
    // Roll downhill into the lowest neighbouring column, like sand.
    let b = binOf(p.x);
    for (let k = 0; k < 10; k++) {
      const l = b > 0 ? heights[b - 1] : Infinity;
      const r = b < heights.length - 1 ? heights[b + 1] : Infinity;
      const lowest = l < r ? b - 1 : b + 1;
      if (Math.min(l, r) < heights[b] - DIAM * 1.1) b = lowest;
      else break;
    }
    const tx = b * DIAM + DIAM / 2 + (Math.random() - 0.5) * DIAM * 0.4;
    const ty = floorY - heights[b] - DRAW_R;
    heights[b] += DIAM * 0.7;
    p.settled = true;
    p.vx = p.vy = 0;
    p.land = { sx: p.x, sy: p.y, tx, ty, t };
  };

  const physics = (h: number, t: number) => {
    const drag = Math.exp(-AIR * h);
    for (const p of particles) {
      if (p.settled) continue;
      p.vy += GRAVITY * h;
      p.vx *= drag;
      p.vy *= drag;
      // pointer pushes airborne dots
      if (pointer.x > -1e5) {
        const dx = p.x - pointer.x;
        const dy = p.y - pointer.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 4900 && d2 > 0.01) {
          const d = Math.sqrt(d2);
          const f = (1 - d / 70) * 2600 * h;
          p.vx += (dx / d) * f;
          p.vy += (dy / d) * f;
        }
      }
      p.x += p.vx * h;
      p.y += p.vy * h;
      if (p.x < DRAW_R) {
        p.x = DRAW_R;
        p.vx = Math.abs(p.vx) * WALL_BOUNCE;
      } else if (p.x > W - DRAW_R) {
        p.x = W - DRAW_R;
        p.vx = -Math.abs(p.vx) * WALL_BOUNCE;
      }
      const top = floorY - heights[binOf(p.x)] - DRAW_R;
      if (p.y >= top && p.vy > 0) {
        if (p.vy > SETTLE_SPEED) {
          p.y = top;
          p.vy = -p.vy * FLOOR_BOUNCE;
          p.vx *= 0.75;
        } else settle(p, t);
      }
    }
  };

  const burst = (bx: number, by: number, t: number) => {
    state = "falling";
    fallStart = t;
    resetFloor();
    for (const p of particles) {
      let dx = p.x - bx;
      let dy = p.y - by;
      let d = Math.hypot(dx, dy);
      if (d < 0.001) {
        const a = Math.random() * TAU;
        dx = Math.cos(a);
        dy = Math.sin(a);
        d = 1;
      }
      const falloff = 1 / (1 + d / 220);
      const speed = (380 + 520 * Math.random()) * (0.45 + 0.55 * falloff);
      // outward blast + a bit of the torus' own spin + an upward pop
      const sx = (-(p.y - cy) / (ringR || 1)) * spin * 60;
      const sy = ((p.x - cx) / (ringR || 1)) * spin * 20;
      p.vx = (dx / d) * speed + sx + (Math.random() - 0.5) * 80;
      p.vy = (dy / d) * speed + sy - (180 + 260 * Math.random());
      p.fallAlpha = p.depthAlpha;
      p.ox = p.oy = 0;
    }
  };

  const reassemble = (t: number) => {
    // Fly back from wherever each dot lies, then resume spinning.
    for (const p of particles) {
      p.entry = {
        ...p.entry,
        startX: p.x + p.ox,
        startY: p.y + p.oy,
        curve: (20 + 60 * Math.random()) * (Math.random() < 0.5 ? 1 : -1),
        delay: t + 0.6 * Math.random() + (1 - (floorY - p.y) / (H || 1)) * 0.2,
        dur: 1.3 + 0.9 * Math.random(),
      };
      p.settled = false;
      p.land = null;
    }
    state = "spinning";
  };

  /* ---------------- draw ---------------- */
  const draw = (t: number) => {
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";
    const fadeK = Math.min(1, (t - fallStart) / 0.6);
    for (const key of ["white", "rare", "accent"] as const) {
      const spr = sprites[key];
      for (const p of particles) {
        if (p.color !== key) continue;
        if (state === "spinning") {
          const flick = reduced ? 1 : 0.84 + 0.16 * Math.sin(1.1 * t + 2 * p.entry.wpx);
          ctx.globalAlpha = Math.min(1, p.depthAlpha * flick + 0.55 * p.beam);
          const a = DRAW_R * p.depthSize * (1 + 0.4 * p.beam) * (key === "accent" ? 1.8 : 1);
          ctx.drawImage(spr, p.x - a, p.y - a, 2 * a, 2 * a);
        } else {
          ctx.globalAlpha = p.fallAlpha + (0.85 - p.fallAlpha) * fadeK;
          const a = DRAW_R * (key === "accent" ? 1.8 : 1);
          ctx.drawImage(spr, p.x + p.ox - a, p.y + p.oy - a, 2 * a, 2 * a);
        }
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  };

  /* ---------------- loop ---------------- */
  let raf = 0;
  let running = false;
  let started = false;
  let startTime = 0;
  let lastT = 0;
  let acc = 0;
  const frame = () => {
    const t = (performance.now() - startTime) / 1000;
    const dt = Math.min(Math.max(t - lastT, 0), 0.05);
    lastT = t;
    if (state === "spinning") {
      if (!dragging) spin += (spinTarget - spin) * (1 - Math.exp(-1.6 * dt));
      angleOffset += spin * dt;
      update(t);
    } else {
      acc += dt;
      let steps = 0;
      while (acc >= STEP && steps < 8) {
        physics(STEP, t);
        acc -= STEP;
        steps++;
      }
      if (steps === 8) acc = 0;
      // eased landings + soft pointer nudge on the pile
      for (const p of particles) {
        if (!p.settled || !p.land) continue;
        const k = Math.min(1, (t - p.land.t) / LAND_TIME);
        const e = 1 - Math.pow(1 - k, 3);
        p.x = p.land.sx + (p.land.tx - p.land.sx) * e;
        p.y = p.land.sy + (p.land.ty - p.land.sy) * e;
        let tx = 0;
        let ty = 0;
        if (pointer.x > -1e5) {
          const dx = p.x - pointer.x;
          const dy = p.y - pointer.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 3600 && d2 > 0.01) {
            const d = Math.sqrt(d2);
            const f = (1 - d / 60) ** 2 * 18;
            tx = (dx / d) * f;
            ty = Math.min(0, (dy / d) * f);
          }
        }
        const s = 1 - Math.exp(-14 * dt);
        p.ox += (tx - p.ox) * s;
        p.oy += (ty - p.oy) * s;
      }
    }
    draw(reduced ? 60 : t);
    if (reduced && state === "spinning" && !dragging) {
      running = false;
      return;
    }
    raf = requestAnimationFrame(frame);
  };
  const start = () => {
    if (running) return;
    if (!started) {
      started = true;
      startTime = performance.now();
    }
    running = true;
    lastT = (performance.now() - startTime) / 1000;
    raf = requestAnimationFrame(frame);
  };
  const stop = () => {
    running = false;
    cancelAnimationFrame(raf);
  };

  /* ---------------- input ---------------- */
  const local = (e: { clientX: number; clientY: number }) => {
    const r = footer.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const inHit = (x: number, y: number) => Math.abs(x - cx) < hitW && Math.abs(y - cy) < hitH;
  const nearPile = (y: number) => y > floorY - 160;
  const isUi = (el: EventTarget | null) => !!(el as HTMLElement)?.closest?.("a, button, input, textarea, [data-framework-marquee]");
  const now = () => (performance.now() - startTime) / 1000;

  const onMove = (e: PointerEvent) => {
    const p = local(e);
    pointer.x = p.x;
    pointer.y = p.y;
    if (fine && !isUi(e.target)) {
      if (state === "spinning") footer.style.cursor = dragging ? "grabbing" : inHit(p.x, p.y) ? "grab" : "";
      else footer.style.cursor = nearPile(p.y) ? "pointer" : "";
    }
    if (dragging) {
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      if (Math.abs(e.clientX - downX) > 5 || Math.abs(e.clientY - downY) > 5) dragMoved = true;
      angleOffset += 0.006 * dx;
      spin = Math.max(-3, Math.min(3, 0.006 * dx * 60));
    }
  };
  const onLeave = () => {
    pointer.x = pointer.y = -1e6;
    footer.style.cursor = "";
  };
  const onDown = (e: PointerEvent) => {
    if (isUi(e.target) || !started) return;
    const p = local(e);
    if (state === "falling") {
      if (nearPile(p.y)) reassemble(now());
      return;
    }
    if (!inHit(p.x, p.y)) return;
    if (!fine) {
      burst(p.x, p.y, now()); // touch: tap bursts
      return;
    }
    dragging = true;
    dragMoved = false;
    lastX = downX = e.clientX;
    downY = e.clientY;
  };
  const onUp = (e: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    footer.style.cursor = "";
    if (!dragMoved && state === "spinning") {
      const p = local(e);
      if (inHit(p.x, p.y)) burst(p.x, p.y, now());
    }
  };

  layout();
  const ro = new ResizeObserver(layout);
  ro.observe(footer);
  const io = new IntersectionObserver(
    ([e]) => {
      if (e.isIntersecting && !document.hidden) start();
      else stop();
    },
    { threshold: 0.06, rootMargin: "0px 0px -22% 0px" }
  );
  io.observe(footer);
  const vis = () => (document.hidden ? stop() : undefined);
  document.addEventListener("visibilitychange", vis);
  footer.addEventListener("pointermove", onMove);
  footer.addEventListener("pointerleave", onLeave);
  footer.addEventListener("pointerdown", onDown);
  window.addEventListener("pointerup", onUp);

  return () => {
    stop();
    ro.disconnect();
    io.disconnect();
    document.removeEventListener("visibilitychange", vis);
    footer.removeEventListener("pointermove", onMove);
    footer.removeEventListener("pointerleave", onLeave);
    footer.removeEventListener("pointerdown", onDown);
    window.removeEventListener("pointerup", onUp);
  };
}
