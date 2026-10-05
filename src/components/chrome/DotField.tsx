"use client";

import { useEffect, useRef } from "react";
import { gsap, prefersReducedMotion } from "@/lib/gsap";

const STEP = 22;
const START = 11;
const R = 1;
const BASE_ALPHA = 0.09;

// Fixed dotted grid behind every dark section; clicks send a ripple through it.
export default function DotField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let w = 0;
    let h = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawStatic();
    };
    const drawStatic = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = `rgba(255,255,255,${BASE_ALPHA})`;
      for (let y = START; y < h; y += STEP)
        for (let x = START; x < w; x += STEP) {
          ctx.beginPath();
          ctx.arc(x, y, R, 0, Math.PI * 2);
          ctx.fill();
        }
    };

    type Ripple = { x: number; y: number; start: number };
    let ripples: Ripple[] = [];
    let ticking = false;
    const update = () => {
      const t = performance.now() / 1000;
      ripples = ripples.filter((r) => t - r.start < 2.2);
      if (!ripples.length) {
        drawStatic();
        gsap.ticker.remove(update);
        ticking = false;
        return;
      }
      const rings = ripples.map((r) => {
        const age = t - r.start;
        const k = 1 - age / 2.2;
        return { x: r.x, y: r.y, radius: 380 * age, amp: 14 * k, bright: 0.28 * k };
      });
      ctx.clearRect(0, 0, w, h);
      for (let y = START; y < h; y += STEP)
        for (let x = START; x < w; x += STEP) {
          let px = x;
          let py = y;
          let a = BASE_ALPHA;
          for (const r of rings) {
            const dx = x - r.x;
            const dy = y - r.y;
            const dist = Math.hypot(dx, dy);
            const d = dist - r.radius;
            if (Math.abs(d) >= 80) continue;
            const f = Math.cos((d / 80) * Math.PI * 0.5);
            const inv = dist > 0.001 ? 1 / dist : 0;
            const amt = f * r.amp;
            px += dx * inv * amt;
            py += dy * inv * amt;
            a += r.bright * Math.max(0, f);
          }
          ctx.fillStyle = `rgba(255,255,255,${Math.min(1, a)})`;
          ctx.beginPath();
          ctx.arc(px, py, R, 0, Math.PI * 2);
          ctx.fill();
        }
    };
    const onClick = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('a, button, [role="button"], input, textarea, select, [data-cursor-hover]')) return;
      if (ripples.length >= 6) ripples.shift();
      ripples.push({ x: e.clientX, y: e.clientY, start: performance.now() / 1000 });
      if (!ticking) {
        gsap.ticker.add(update);
        ticking = true;
      }
    };
    resize();
    window.addEventListener("resize", resize);
    if (!prefersReducedMotion()) window.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("click", onClick);
      gsap.ticker.remove(update);
    };
  }, []);

  return (
    <div aria-hidden style={{ pointerEvents: "none", position: "fixed", inset: 0, zIndex: -2 }}>
      <canvas ref={ref} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
