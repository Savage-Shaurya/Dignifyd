// @ts-nocheck
// =============================================================================
// weevolveit.com hero globe -- READABLE PORT of de-minified chunk dyn/0k1q0rnps5ilq.js
// (component `ParticleWorld`, module 76250). three.js r17x-era API (ShaderMaterial,
// Points, LineSegments, SphereGeometry). Every numeric constant is copied from the
// original; comments marked [orig] are translated from the Spanish originals,
// comments marked [note] are mine.
//
// Usage:
//   import { createGlobe } from './globe-port.js'
//   const g = createGlobe({ container, canvas, landMask, cities, arcs, hqNames, visitor })
//   g.setEnabled(true)   // starts the intro clock (original: `enabled` = preloader finished)
//   g.dispose()
// =============================================================================
import * as THREE from 'three';

export const INK = '#F5F5F5';          // white-ish particle colour (== --color-fg)
export const ACCENT = '#EE1A43';       // Dignifyd blue (== --color-accent)
const TAN_HALF_FOV = Math.tan((40 * Math.PI) / 360); // fov 40deg -> tan(20deg) = 0.36397  (was `b`)

const expoOut = (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** lat/lng (deg) -> unit-sphere xyz. NOTE the -z on longitude: lng 0 faces +x, lng +90 faces -z. */
export function latLngToVec3(latDeg, lngDeg, r = 1) {
  const lat = (latDeg * Math.PI) / 180;
  const lng = (lngDeg * Math.PI) / 180;
  return [r * Math.cos(lat) * Math.cos(lng), r * Math.sin(lat), -r * Math.cos(lat) * Math.sin(lng)];
}

// ----------------------------------------------------------------------------
// Land mask.  ORIGINAL: fetch('/data/ne_110m_admin_0_countries.geojson'), rasterise to
// a 2048x1024 equirectangular canvas (even-odd fill, white on black) and read the red
// channel (> 127 = land). Returned predicate is (latDeg, lngDeg) => boolean.
// ----------------------------------------------------------------------------
export async function loadLandMaskFromGeoJSON(url, signal) {
  const res = await fetch(url, { signal });
  const geo = await res.json();
  if (!geo?.features) return null;
  const W = 2048, H = 1024;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fff';
  for (const f of geo.features) {
    const g = f.geometry;
    if (!g?.type) continue;
    const polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
    for (const poly of polys) {
      ctx.beginPath();
      for (const ring of poly) {
        for (let i = 0; i < ring.length; i++) {
          const x = ((ring[i][0] + 180) / 360) * W;
          const y = ((90 - ring[i][1]) / 180) * H;
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath();
      }
      ctx.fill('evenodd');
    }
  }
  const d = ctx.getImageData(0, 0, W, H).data;
  return (lat, lng) => {
    const x = clamp(Math.floor(((lng + 180) / 360) * W), 0, W - 1);
    const y = clamp(Math.floor(((90 - lat) / 180) * H), 0, H - 1);
    return d[(W * y + x) * 4] > 127;
  };
}

/** [note] Same predicate from the pre-baked 1-bit mask (specs/globe-data.land-2048x1024.bin). */
export async function loadLandMaskFromBin(url, signal) {
  const buf = new Uint8Array(await (await fetch(url, { signal })).arrayBuffer());
  const W = 2048, H = 1024;
  return (lat, lng) => {
    const x = clamp(Math.floor(((lng + 180) / 360) * W), 0, W - 1);
    const y = clamp(Math.floor(((90 - lat) / 180) * H), 0, H - 1);
    const i = y * W + x;
    return (buf[i >> 3] & (0x80 >> (i & 7))) !== 0;
  };
}

// ----------------------------------------------------------------------------
// Great-circle arc tessellation (was `x(e)`).  Each arc {a,b,ang,sinAng,offset,freq}
// becomes max(32, round(64*ang)) segments, slerped and lifted by 1 + 0.3*sin(pi*t).
// Output arrays are for THREE.LineSegments (each segment = 2 vertices).
// ----------------------------------------------------------------------------
export function tessellateArcs(arcs) {
  const position = [], arcT = [], offset = [], speed = [];
  for (const { a, b, ang, sinAng, offset: off, freq } of arcs) {
    const n = Math.max(32, Math.round(64 * ang));
    let px = 0, py = 0, pz = 0, pt = 0;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const wa = Math.sin((1 - t) * ang) / sinAng;
      const wb = Math.sin(t * ang) / sinAng;
      const lift = 1 + 0.3 * Math.sin(Math.PI * t);
      const x = (a[0] * wa + b[0] * wb) * lift;
      const y = (a[1] * wa + b[1] * wb) * lift;
      const z = (a[2] * wa + b[2] * wb) * lift;
      if (i > 0) {
        position.push(px, py, pz, x, y, z);
        arcT.push(pt, t);
        offset.push(off, off);
        speed.push(freq, freq);
      }
      px = x; py = y; pz = z; pt = t;
    }
  }
  return {
    position: Float32Array.from(position),
    arcT: Float32Array.from(arcT),
    offset: Float32Array.from(offset),
    speed: Float32Array.from(speed),
  };
}

// ----------------------------------------------------------------------------
// Shaders (verbatim from the bundle; Spanish comments translated).
// ----------------------------------------------------------------------------
const POINTS_VERT = /* glsl */ `
  attribute vec3 aScatter;
  attribute float aDelay;
  attribute float aSize;
  attribute float aPhase;
  attribute float aAccent;
  attribute float aArcT;

  uniform float uTime;
  uniform float uProgress;
  uniform float uArcProgress;
  uniform float uPixelRatio;
  uniform float uScale;
  uniform float uCamZ;
  uniform float uMotion;
  uniform float uRotY;
  uniform float uRotX;

  varying float vAlpha;
  varying float vAccent;

  float expoOut(float x) {
    return x >= 1.0 ? 1.0 : 1.0 - pow(2.0, -10.0 * x);
  }

  // Spin + drag tilt -- the TARGET rotates; flight origins stay fixed in world space,
  // pinned to the screen edge that saw them born.
  vec3 rotYX(vec3 v) {
    float cy = cos(uRotY);
    float sy = sin(uRotY);
    vec3 r = vec3(cy * v.x + sy * v.z, v.y, -sy * v.x + cy * v.z);
    float cx = cos(uRotX);
    float sx = sin(uRotX);
    return vec3(r.x, cx * r.y - sx * r.z, sx * r.y + cx * r.z);
  }

  void main() {
    // 0 = world particle, 1 = light packet (head of an arc's beam).
    float isPacket = step(0.0, aArcT);

    // World: flies from the screen edge to its place on the globe.
    vec3 tw = rotYX(position);
    float p = clamp((uProgress - aDelay) / 0.45, 0.0, 1.0);
    float e = expoOut(p);
    vec3 worldPos = mix(aScatter, tw, e);
    // Subtle breathing once formed (0 under reduced motion).
    worldPos += tw * sin(uTime * 0.6 + aPhase * 6.2831) * 0.004 * e * uMotion;

    // Packet: travels along its great circle (position = origin, aScatter = destination,
    // aArcT = phase, aDelay = REUSED as the cycle frequency). SAME clock as the line beam
    // -> they stay glued together. Own period per arc (18-30 s) -> never in sync;
    // crossing = first 20% of the cycle (only ~1 in 5 arcs has a packet in flight).
    float ang = acos(clamp(dot(position, aScatter), -1.0, 1.0));
    float sa = max(sin(ang), 0.0001);
    float cyc = fract(uTime * aDelay + aArcT);
    float run = step(cyc, 0.20);
    float tr = clamp(cyc / 0.20, 0.0, 1.0);
    float tt = tr * tr * (3.0 - 2.0 * tr);
    vec3 gc = (sin((1.0 - tt) * ang) * position + sin(tt * ang) * aScatter) / sa;
    vec3 packetPos = rotYX(gc * (1.0 + 0.3 * sin(3.14159265 * tt)));

    vec3 pos = mix(worldPos, packetPos, isPacket);

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);

    // Front/back factor: depth without lights (0 = hidden face).
    float front = clamp((mv.z + uCamZ + 1.0) * 0.5, 0.0, 1.0);

    // The accent (HQ MTY) pulses softly -- the brand's "alive".
    float pulse = 1.0 + aAccent * 0.3 * sin(uTime * 2.2 + aPhase) * uMotion;

    float size = aSize * pulse * mix(0.72, 1.0, front);
    gl_PointSize = size * uScale * uPixelRatio / max(-mv.z, 0.001);

    float twinkle = 0.86 + 0.14 * sin(uTime * 1.4 + aPhase * 12.566) * uMotion;
    float worldA = smoothstep(0.0, 0.12, uProgress) * twinkle;

    // Packet: appears once the arcs finished drawing, fades on leaving the HQ and on
    // arrival; hidden during the cycle's rest (run) and invisible under reduced motion.
    float gate = smoothstep(0.85, 1.0, uArcProgress) * uMotion;
    float fade = smoothstep(0.0, 0.08, tt) * (1.0 - smoothstep(0.92, 1.0, tt));
    float packetA = gate * fade * run;

    vAlpha = mix(worldA, packetA, isPacket) * mix(0.16, 1.0, front);
    vAccent = aAccent;

    gl_Position = projectionMatrix * mv;
  }
`;

const POINTS_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uAccentColor;

  varying float vAlpha;
  varying float vAccent;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    // explicit inverted smoothstep -- reversed edges are UB in the GLSL spec [orig]
    float disc = 1.0 - smoothstep(0.14, 0.5, d);
    if (disc < 0.004) discard;
    vec3 col = mix(uColor, uAccentColor, vAccent);
    gl_FragColor = vec4(col, disc * vAlpha);
  }
`;

const LINE_VERT = /* glsl */ `
  attribute float aArcT;
  attribute float aOffset;
  attribute float aSpeed;

  uniform float uRotY;
  uniform float uRotX;
  uniform float uCamZ;

  varying float vT;
  varying float vOff;
  varying float vSpeed;
  varying float vFront;

  void main() {
    // Same rotation as the points -- lines follow the globe and the drag.
    float cy = cos(uRotY);
    float sy = sin(uRotY);
    vec3 t = vec3(
      cy * position.x + sy * position.z,
      position.y,
      -sy * position.x + cy * position.z
    );
    float cx = cos(uRotX);
    float sx = sin(uRotX);
    t = vec3(t.x, cx * t.y - sx * t.z, sx * t.y + cx * t.z);

    vec4 mv = modelViewMatrix * vec4(t, 1.0);
    vFront = clamp((mv.z + uCamZ + 1.0) * 0.5, 0.0, 1.0);
    vT = aArcT;
    vOff = aOffset;
    vSpeed = aSpeed;
    gl_Position = projectionMatrix * mv;
  }
`;

const LINE_FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uArcProgress;
  uniform float uMotion;
  uniform vec3 uColor;
  uniform float uBase;

  varying float vT;
  varying float vOff;
  varying float vSpeed;
  varying float vFront;

  void main() {
    // The line is DRAWN from the HQ (t=0) towards the destination (t=1).
    float reveal = clamp((uArcProgress - vT * 0.85) / 0.15, 0.0, 1.0);

    // ONE packet per arc. Each arc has its OWN period (vSpeed, random 18-30 s) -> never
    // in sync, only ~1 in 5 arcs carries a beam at once. Crossing takes the first 20% of
    // the cycle (~3.6-6 s, easeInOut); the rest of the time the line rests.
    float cyc = fract(uTime * vSpeed + vOff);
    float run = step(cyc, 0.20);
    float tr = clamp(cyc / 0.20, 0.0, 1.0);
    float tt = tr * tr * (3.0 - 2.0 * tr);
    float d = tt - vT;
    // Short, faint tail -- a discreet flash, not a dramatic streak.
    float beam = (d >= 0.0 ? exp(-d * 40.0) : 0.0) * run;

    // Beams start when the arc finished drawing; under reduced motion the line stays static.
    float gate = smoothstep(0.85, 1.0, uArcProgress) * uMotion;

    // uBase = line presence per material: white network 0.30, visitor accent arc 0.55
    // (pink loses luminance under additive blending and it IS the protagonist).
    float a = (uBase + beam * 0.42 * gate) * reveal * mix(0.28, 1.0, vFront);
    gl_FragColor = vec4(uColor, a);
  }
`;

const RIM_VERT = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const RIM_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uIntensity;

  varying vec3 vNormal;
  varying vec3 vView;

  void main() {
    float rim = pow(1.0 - abs(dot(vView, normalize(vNormal))), 3.5);
    gl_FragColor = vec4(uColor, rim * uIntensity);
  }
`;

const additive = (extra) => ({
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  depthTest: false,
  ...extra,
});

// ----------------------------------------------------------------------------
// Particle buffer builder (was the IIFE inside the async loader).
//   N      : Fibonacci-sphere candidate count (52000 desktop, 22000 if (max-width:767px))
//   view   : { w, h, camZ, ndcY }  -- canvas css size, resting camera z, ndcY (see resize())
//   cities : [{name, short?, lat, lng, isHQ?}]
//   arcs   : tessellation inputs from buildArcs()
// Order in the buffers: land dots, HQ dots, other-city dots, arc packets.
// ----------------------------------------------------------------------------
export function buildParticles(isLand, N, view, cities, arcs) {
  const position = [], scatter = [], delay = [], size = [], phase = [], accent = [], arcT = [];
  const aspect = view.w / view.h;
  const startCamZ = 1.145 * view.camZ;                       // camera z at t=0 (zooms in to camZ)
  const camYOffset = -view.ndcY * TAN_HALF_FOV * startCamZ;  // camera.y at t=0

  // Start position: a point on a frame just OUTSIDE the viewport (1.06..1.34 of half-extent),
  // at a random depth n in [startCamZ-1.2, startCamZ+1.6], so dots fly in from all four edges.
  const pushScatter = () => {
    const o = 2 * Math.random() - 1;
    const r = 1.06 + 0.28 * Math.random();
    let sx, sy;
    if (Math.random() < view.w / (view.w + view.h)) { sx = o * r; sy = Math.random() < 0.5 ? r : -r; } // top/bottom edge
    else { sx = Math.random() < 0.5 ? r : -r; sy = o * r; }                                           // left/right edge
    const n = startCamZ - 1.2 + 2.8 * Math.random();
    const half = n * TAN_HALF_FOV;
    scatter.push(sx * half * aspect, sy * half + camYOffset, startCamZ - n);
  };

  // 1) land: Fibonacci sphere, keep points whose (lat,lng) is land
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2;
    const rad = Math.sqrt(Math.max(0, 1 - y * y));
    const th = golden * i;
    const x = Math.cos(th) * rad;
    const z = Math.sin(th) * rad;
    const lng = (180 * Math.atan2(-z, x)) / Math.PI;
    const lat = (180 * Math.asin(y)) / Math.PI;
    if (isLand(lat, lng)) {
      position.push(x, y, z);
      pushScatter();
      delay.push(((lng + 180) / 360) * 0.33 + 0.22 * Math.random()); // west->east arrival sweep
      size.push(0.008 + 0.005 * Math.random());
      phase.push(Math.random());
      accent.push(0);
      arcT.push(-1);
    }
  }
  // 2) HQ dots (bigger; Monterrey = accent colour + pulse)
  for (const c of cities.filter((c) => c.isHQ)) {
    const [x, y, z] = latLngToVec3(c.lat, c.lng, 1);
    const isMTY = !!c.accent;
    position.push(x, y, z); pushScatter();
    delay.push(0.05);
    size.push(isMTY ? 0.02 : 0.017);
    phase.push(Math.random());
    accent.push(isMTY ? 1 : 0);
    arcT.push(-1);
  }
  // 3) other cities (white, slightly larger than land dots)
  for (const c of cities) {
    if (c.isHQ) continue;
    const [x, y, z] = latLngToVec3(c.lat, c.lng, 1);
    position.push(x, y, z); pushScatter();
    delay.push(((c.lng + 180) / 360) * 0.33 + 0.22 * Math.random());
    size.push(0.013);
    phase.push(Math.random());
    accent.push(0);
    arcT.push(-1);
  }
  // 4) arc packets: position = origin, scatter = destination, delay = cycle frequency, arcT = phase offset (>=0)
  for (const a of arcs) {
    position.push(a.a[0], a.a[1], a.a[2]);
    scatter.push(a.b[0], a.b[1], a.b[2]);
    delay.push(a.freq);
    size.push(0.012);
    phase.push(Math.random());
    accent.push(0);
    arcT.push(a.offset);
  }
  return {
    position: Float32Array.from(position), scatter: Float32Array.from(scatter),
    delay: Float32Array.from(delay), size: Float32Array.from(size),
    phase: Float32Array.from(phase), accent: Float32Array.from(accent),
    arcT: Float32Array.from(arcT), count: position.length / 3,
  };
}

/** Build one arc record from two [x,y,z] unit vectors. Returns null for degenerate arcs. */
function makeArc(a, b, freq) {
  const ang = Math.acos(clamp(a[0] * b[0] + a[1] * b[1] + a[2] * b[2], -1, 1));
  const sinAng = Math.sin(ang);
  if (sinAng < 1e-4) return null;
  return { a, b, ang, sinAng, offset: Math.random(), freq };
}

// ----------------------------------------------------------------------------
// Main factory (was the useEffect body of ParticleWorld).
// ----------------------------------------------------------------------------
export function createGlobe({
  container,        // div, `relative h-[100svh] w-full`
  canvas,           // <canvas class="absolute inset-0 h-full w-full">
  isLand,           // (lat,lng)=>boolean   (from loadLandMask*)
  cities,           // see globe-data.cities.json
  arcPairs,         // [["Monterrey","Boston"], ...]
  visitor = /** @type {any} */ (null),   // optional {latitude, longitude}: draws a pink arc MTY -> visitor
  enabled = true,
  facing = /** @type {any} */ (null),    // {lat,lng} that faces the camera at t=0 (defaults to the accent HQ)
  onFirstFrame = () => {},   // original: setState(true) -> container opacity 0 -> 1 (1000ms ease-out)
}) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = matchMedia('(max-width: 767px)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const byName = Object.fromEntries(cities.map((c) => [c.name, c]));
  const HQs = cities.filter((c) => c.isHQ);
  const MTY = HQs.find((c) => c.accent) ?? HQs[0];

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 50);
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance', failIfMajorPerformanceCaveat: true });
  renderer.setClearColor(0, 0);

  // Rim glow: slightly larger sphere, fresnel-ish additive shell. Added FIRST (drawn first).
  const rimGeo = new THREE.SphereGeometry(1.045, 48, 48);
  const rimMat = new THREE.ShaderMaterial({
    vertexShader: RIM_VERT, fragmentShader: RIM_FRAG,
    uniforms: { uColor: { value: new THREE.Color(INK) }, uIntensity: { value: 0 } },
    ...additive(),
  });
  scene.add(new THREE.Mesh(rimGeo, rimMat));

  const U = {
    uTime: { value: 0 },
    uProgress: { value: reduced ? 1 : 0 },
    uArcProgress: { value: reduced ? 1 : 0 },
    uPixelRatio: { value: 1 },
    uScale: { value: 1 },
    uCamZ: { value: 3 },
    uMotion: { value: reduced ? 0 : 1 },
    uRotY: { value: 0 },
    uRotX: { value: 0 },
    uColor: { value: new THREE.Color(INK) },
    uAccentColor: { value: new THREE.Color(ACCENT) },
  };

  // HQ -> city network: random per-arc offset + cycle frequency 1/(18..30) s
  const networkArcs = arcPairs
    .map(([from, to]) => (byName[from] && byName[to]
      ? makeArc(latLngToVec3(byName[from].lat, byName[from].lng, 1), latLngToVec3(byName[to].lat, byName[to].lng, 1), 1 / (18 + 12 * Math.random()))
      : null))
    .filter(Boolean);

  // ---- sizing / camera framing (was er()) ----------------------------------
  let W = 1, H = 1, camZ = 3, ndcY = 0.24;
  const resize = () => {
    W = Math.max(1, Math.round(container.clientWidth));
    H = Math.max(1, Math.round(container.clientHeight));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    const globePx = Math.min(512, 0.66 * Math.min(W, H));            // globe DIAMETER in css px
    camZ = H / (TAN_HALF_FOV * globePx);                             // so radius 1 == globePx/2 px
    ndcY = 1 - (Math.max(0.38 * H, globePx / 2 + 120) / H) * 2;      // centre sits at y = max(38vh, r+120px)
    U.uPixelRatio.value = dpr;
    U.uScale.value = (0.5 * H) / TAN_HALF_FOV;                       // world -> px for gl_PointSize
  };
  resize();
  camera.position.z = reduced ? camZ : 1.145 * camZ;
  camera.position.y = -ndcY * TAN_HALF_FOV * camera.position.z;
  const ro = new ResizeObserver(resize); ro.observe(container);

  // ---- rotation state ---------------------------------------------------------
  let rotY = 0;                                   // `el`
  if (MTY) { const f = facing ?? MTY; const [x, , z] = latLngToVec3(f.lat, f.lng, 1); rotY = -Math.atan2(x, z); } // Monterrey faces camera at t=0
  let rotX = 0;                                   // `es`  tilt (only from vertical drag)
  let dragging = false, touchPending = false, isTouch = false;
  let sx = 0, sy = 0, lx = 0, ly = 0;
  const AUTO_SPIN = reduced ? 0 : 0.055;          // rad/s  (~114 s per revolution)
  let spin = AUTO_SPIN;                           // `eg` current angular velocity (rad/s)
  // Smooth drag: input moves a target; each frame eases toward it (frame-rate independent),
  // velocity is an exponentially smoothed estimate from coalesced pointer samples.
  let targetY = 0, targetX = 0, vel = 0, lastMoveT = 0;
  const FOLLOW = 26;                              // 1/s, how tightly the globe tracks the pointer

  const onDown = (e) => {
    if (dragging || touchPending) return;
    isTouch = e.pointerType === 'touch';
    sx = lx = e.clientX; sy = ly = e.clientY;
    spin = 0; vel = 0; targetY = rotY; targetX = rotX; lastMoveT = e.timeStamp;
    if (isTouch) touchPending = true;             // touch: wait for a >8px horizontal move
    else { dragging = true; canvas.setPointerCapture(e.pointerId); canvas.style.cursor = 'grabbing'; }
  };
  const onMove = (e) => {
    if (touchPending && !dragging) {
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) { dragging = true; lx = e.clientX; ly = e.clientY; }
      else if (Math.abs(dy) > 8) { touchPending = false; return; }  // vertical => let page scroll
      else return;
    }
    if (!dragging) return;
    const samples = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
    for (const ev of samples.length ? samples : [e]) {
      const dx = ev.clientX - lx, dy = ev.clientY - ly;
      lx = ev.clientX; ly = ev.clientY;
      const step = 0.0045 * dx;                                    // 0.0045 rad per px
      targetY += step;
      const dtm = Math.max(4, ev.timeStamp - lastMoveT);           // ms
      lastMoveT = ev.timeStamp;
      const a = 1 - Math.exp(-dtm / 60);                           // ~60 ms smoothing window
      vel += ((step / dtm) * 1000 - vel) * a;
      if (!isTouch) {                                              // tilt: mouse only, soft-limited near +-0.55
        const k = 1 - Math.min(1, Math.abs(targetX) / 0.55);
        targetX = clamp(targetX + 0.0035 * dy * (0.35 + 0.65 * k), -0.55, 0.55);
      }
    }
  };
  const onUp = (e) => {
    touchPending = false;
    if (dragging) {
      dragging = false;
      const idle = performance.now() - lastMoveT;                  // paused before release => little fling
      spin = clamp(vel * Math.exp(-Math.max(0, idle - 40) / 90), -2.2, 2.2);
      if (!isTouch) { try { canvas.releasePointerCapture(e.pointerId); } catch {} canvas.style.cursor = 'grab'; }
    }
  };
  canvas.style.touchAction = 'pan-y';
  if (finePointer) canvas.style.cursor = 'grab';
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);

  // ---- scene objects created after the land mask is ready -----------------------
  let pointsMat = null, lineMat = null, visitorDone = false;
  const disposables = [rimGeo, rimMat];

  const addNetwork = () => {
    const P = buildParticles(isLand, mobile ? 22000 : 52000, { w: W, h: H, camZ, ndcY }, cities, networkArcs);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(P.position, 3));
    g.setAttribute('aScatter', new THREE.BufferAttribute(P.scatter, 3));
    g.setAttribute('aDelay', new THREE.BufferAttribute(P.delay, 1));
    g.setAttribute('aSize', new THREE.BufferAttribute(P.size, 1));
    g.setAttribute('aPhase', new THREE.BufferAttribute(P.phase, 1));
    g.setAttribute('aAccent', new THREE.BufferAttribute(P.accent, 1));
    g.setAttribute('aArcT', new THREE.BufferAttribute(P.arcT, 1));
    pointsMat = new THREE.ShaderMaterial({ vertexShader: POINTS_VERT, fragmentShader: POINTS_FRAG, uniforms: U, ...additive() });
    const pts = new THREE.Points(g, pointsMat); pts.frustumCulled = false; scene.add(pts);

    const L = tessellateArcs(networkArcs);
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.BufferAttribute(L.position, 3));
    lg.setAttribute('aArcT', new THREE.BufferAttribute(L.arcT, 1));
    lg.setAttribute('aOffset', new THREE.BufferAttribute(L.offset, 1));
    lg.setAttribute('aSpeed', new THREE.BufferAttribute(L.speed, 1));
    lineMat = new THREE.ShaderMaterial({
      vertexShader: LINE_VERT, fragmentShader: LINE_FRAG,
      uniforms: { uTime: U.uTime, uArcProgress: U.uArcProgress, uRotY: U.uRotY, uRotX: U.uRotX, uCamZ: U.uCamZ, uMotion: U.uMotion, uColor: U.uColor, uBase: { value: 0.3 } },
      ...additive(),
    });
    const lines = new THREE.LineSegments(lg, lineMat); lines.frustumCulled = false; scene.add(lines);
    container.dataset.weParticles = String(P.count);
    disposables.push(g, pointsMat, lg, lineMat);
  };

  /** Visitor arc: pink line MTY -> visitor + one accent packet. Called when both the network
   *  and the visitor geolocation exist. Skipped if visitor is within 0.02 rad of MTY. */
  const addVisitor = () => {
    if (!visitor || visitorDone || !pointsMat || !MTY) return;
    const a = latLngToVec3(MTY.lat, MTY.lng, 1);
    const b = latLngToVec3(visitor.latitude, visitor.longitude, 1);
    const ang = Math.acos(clamp(a[0] * b[0] + a[1] * b[1] + a[2] * b[2], -1, 1));
    visitorDone = true;
    if (ang < 0.02 || Math.sin(ang) < 1e-4) return;
    const arc = { a, b, ang, sinAng: Math.sin(ang), offset: Math.random(), freq: 1 / (12 + 4 * Math.random()) }; // faster: 12-16 s
    const L = tessellateArcs([arc]);
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.BufferAttribute(L.position, 3));
    lg.setAttribute('aArcT', new THREE.BufferAttribute(L.arcT, 1));
    lg.setAttribute('aOffset', new THREE.BufferAttribute(L.offset, 1));
    lg.setAttribute('aSpeed', new THREE.BufferAttribute(L.speed, 1));
    const mat = new THREE.ShaderMaterial({
      vertexShader: LINE_VERT, fragmentShader: LINE_FRAG,
      uniforms: { uTime: U.uTime, uArcProgress: U.uArcProgress, uRotY: U.uRotY, uRotX: U.uRotX, uCamZ: U.uCamZ, uMotion: U.uMotion, uColor: { value: new THREE.Color(ACCENT) }, uBase: { value: 0.55 } },
      ...additive(),
    });
    const line = new THREE.LineSegments(lg, mat); line.frustumCulled = false; scene.add(line);
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(Float32Array.from(a), 3));
    pg.setAttribute('aScatter', new THREE.BufferAttribute(Float32Array.from(b), 3));
    pg.setAttribute('aDelay', new THREE.BufferAttribute(Float32Array.from([arc.freq]), 1));
    pg.setAttribute('aSize', new THREE.BufferAttribute(Float32Array.from([0.014]), 1));
    pg.setAttribute('aPhase', new THREE.BufferAttribute(Float32Array.from([Math.random()]), 1));
    pg.setAttribute('aAccent', new THREE.BufferAttribute(Float32Array.from([1]), 1));
    pg.setAttribute('aArcT', new THREE.BufferAttribute(Float32Array.from([arc.offset]), 1));
    const pts = new THREE.Points(pg, pointsMat); pts.frustumCulled = false; scene.add(pts);
    disposables.push(lg, mat, pg);
  };

  addNetwork();
  addVisitor();

  // ---- render loop (was eT) ---------------------------------------------------------
  const clock = new THREE.Clock();
  let ew = reduced ? 2.4 : 0;   // intro clock, seconds; caps at 4.4
  let raf = 0, running = false, visible = true, firstFrame = false, isEnabled = enabled, disposed = false;
  const frame = () => {
    if (disposed) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    ew = Math.min(ew + dt, 4.4);
    U.uTime.value += dt;
    U.uProgress.value = Math.min(ew / 2.4, 1);                          // particles fly in: 0..2.4 s
    U.uArcProgress.value = reduced ? 1 : clamp((ew - 2.65) / 1.3, 0, 1); // arcs draw: 2.65..3.95 s
    camera.position.z = reduced ? camZ : camZ + camZ * (1.145 - 1) * (1 - expoOut(Math.min(ew / 3, 1))); // dolly-in 0..3 s
    camera.position.y = -ndcY * TAN_HALF_FOV * camera.position.z;
    U.uCamZ.value = camera.position.z;
    rimMat.uniforms.uIntensity.value = 0.32 * expoOut(Math.min(ew / 2.4, 1)); // rim fades in with the particles
    if (dragging) {
      const k = 1 - Math.exp(-FOLLOW * dt);
      rotY += (targetY - rotY) * k;
      rotX += (targetX - rotX) * k;
    } else {
      spin += (AUTO_SPIN - spin) * (1 - Math.exp(-1.2 * dt));            // fling glides back to auto-spin
      rotY += spin * dt;
      rotX += (0 - rotX) * (1 - Math.exp(-0.9 * dt));                    // tilt eases back to 0 (rate 0.9/s)
    }
    U.uRotY.value = rotY;
    U.uRotX.value = rotX;
    renderer.render(scene, camera);
    if (!firstFrame) { firstFrame = true; onFirstFrame(); }
  };
  const stop = () => { running = false; cancelAnimationFrame(raf); };
  const sync = () => {
    if (isEnabled && visible && !document.hidden) {
      if (!running && !disposed) { running = true; clock.getDelta(); raf = requestAnimationFrame(frame); }
    } else stop();
  };
  const io = new IntersectionObserver((es) => { for (const e of es) visible = e.isIntersecting; sync(); }, { threshold: 0 });
  io.observe(container);
  document.addEventListener('visibilitychange', sync);
  sync();

  return {
    setEnabled(v) { isEnabled = v; sync(); },
    setVisitor(v) { visitor = v; addVisitor(); },
    dispose() {
      disposed = true; stop(); io.disconnect(); ro.disconnect();
      document.removeEventListener('visibilitychange', sync);
      canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp); canvas.removeEventListener('pointercancel', onUp);
      disposables.forEach((d) => d.dispose()); renderer.dispose(); renderer.forceContextLoss();
    },
  };
}
