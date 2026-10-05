"use client";

import { useEffect, useRef, useState } from "react";
import { centres } from "@/content/site";
import { getVisitor } from "@/lib/visitor";
import { createGlobe, loadLandMaskFromBin } from "./engine";
import { createGlobe2D } from "./engine2d";
import s from "./globe.module.css";

const CITIES = centres.map((c) => ({ name: c.city, lat: c.lat, lng: c.lon, isHQ: true, accent: !!c.hq }));

// Follow-the-sun loop + London hub.
const ARCS: [string, string][] = [
  ["London", "Dubai"],
  ["London", "Toronto"],
  ["London", "Chicago"],
  ["London", "Delhi NCR"],
  ["London", "Singapore"],
  ["Chicago", "Toronto"],
  ["Dubai", "Delhi NCR"],
  ["Delhi NCR", "Singapore"],
  ["Dubai", "Singapore"],
];

// Start the globe facing EMEA so London, Dubai and Delhi NCR are in view as it turns.
const FACING = { lat: 30, lng: 18 };

type GlobeApi = { setEnabled: (v: boolean) => void; setVisitor: (v: unknown) => void; dispose: () => void };

const GLYPHS = [..."あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをんابتثجحخدذرزسشصضطظعغفقكلمنهوي가나다라마바사아자차카타파하거너더러머버서어저처커터퍼허人大小天地中国王道德文学新水火山风云雷电星空生死爱情家光明亮金银玉龙虎凤马牛羊鸟鱼花草树木林海洋时年月日春夏秋冬东西南北心力气"];
const isLetter = /[\p{L}\p{N}]/u;

function StatusBadge({ city }: { city: string }) {
  const text = `online · ${city.toLowerCase()}`;
  const [chars, setChars] = useState<string[]>(() => [...text]);

  useEffect(() => {
    const full = [...text];
    setChars(full);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timers: number[] = [];
    const resolved = full.map(() => false);
    const cur = [...full];
    full.forEach((ch, i) => {
      if (!isLetter.test(ch)) return;
      const flick = () => {
        if (resolved[i]) return;
        cur[i] = GLYPHS[(Math.random() * GLYPHS.length) | 0];
        setChars([...cur]);
        timers.push(window.setTimeout(flick, 70 + 40 * Math.random()));
      };
      timers.push(window.setTimeout(flick, 2850));
      timers.push(
        window.setTimeout(() => {
          resolved[i] = true;
          cur[i] = ch;
          setChars([...cur]);
        }, 3450 + 45 * i)
      );
    });
    return () => timers.forEach(clearTimeout);
  }, [text]);

  return (
    <div data-globe-status className={s.badge} aria-label={text}>
      <span className={s.pulse}>
        <span data-pulse-ring className={s.pulseRing} />
        <span className={s.pulseDot} />
      </span>
      <span className={s.badgeText} aria-hidden>
        {chars.map((c, i) => (
          <span key={i} className={s.ch}>
            {c}
          </span>
        ))}
      </span>
    </div>
  );
}

// Silent capability check: three.js logs console errors when context creation fails,
// so probe first and go straight to the 2D engine when hardware WebGL2 isn't available.
function hasHardwareWebGL2() {
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2", { failIfMajorPerformanceCaveat: true });
    if (!gl) return false;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}

export default function Globe({ enabled }: { enabled: boolean }) {
  const container = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const api = useRef<GlobeApi | null>(null);
  const [ready, setReady] = useState(false);
  const [city, setCity] = useState<string | null>(null);
  const enabledRef = useRef(enabled);

  useEffect(() => {
    const ctrl = new AbortController();
    let disposed = false;
    let fallback: HTMLCanvasElement | null = null;
    (async () => {
      try {
        const isLand = await loadLandMaskFromBin("/data/land-mask.bin", ctrl.signal);
        if (disposed || !container.current || !canvas.current) return;
        const common = { container: container.current, isLand, cities: CITIES, arcPairs: ARCS, facing: FACING, onFirstFrame: () => setReady(true) };
        let gl: GlobeApi | null = null;
        if (hasHardwareWebGL2()) {
          try {
            gl = createGlobe({ ...common, canvas: canvas.current, enabled: false }) as GlobeApi;
          } catch {
            gl = null;
          }
        }
        if (gl) api.current = gl;
        else {
          // No hardware WebGL (GPU disabled / blocklisted): draw the globe with canvas 2D on a fresh canvas.
          const fresh = document.createElement("canvas");
          fresh.className = canvas.current.className;
          fresh.setAttribute("aria-hidden", "true");
          canvas.current.style.display = "none";
          canvas.current.after(fresh);
          fallback = fresh;
          api.current = createGlobe2D({ ...common, canvas: fresh }) as GlobeApi;
        }
        api.current.setEnabled(enabledRef.current);
        const v = await getVisitor();
        if (disposed) return;
        setCity(v.city);
        api.current?.setVisitor({ latitude: v.latitude, longitude: v.longitude });
      } catch (err) {
        if (!disposed) console.warn("[globe] failed to start", err);
      }
    })();
    return () => {
      disposed = true;
      ctrl.abort();
      api.current?.dispose();
      api.current = null;
      fallback?.remove();
      if (canvas.current) canvas.current.style.display = "";
    };
  }, []);

  useEffect(() => {
    enabledRef.current = enabled;
    api.current?.setEnabled(enabled);
  }, [enabled]);

  return (
    <div ref={container} className={s.root} style={{ opacity: ready ? 1 : 0 }}>
      <canvas ref={canvas} className={s.canvas} aria-hidden />
      {ready && city && (
        <div className={s.frame}>
          <StatusBadge city={city} />
        </div>
      )}
    </div>
  );
}
