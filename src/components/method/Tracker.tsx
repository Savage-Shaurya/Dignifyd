"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { gsap, prefersReducedMotion } from "@/lib/gsap";
import { phases } from "@/content/site";
import { glyph, ringDot, wobbleDot } from "./glyphs";
import s from "./method.module.css";

const CX = [20, 195, 370, 545, 720];
const SEGS = CX.slice(0, -1).map((cx, i) => [cx + 19, CX[i + 1] - 19] as const);

export type TrackerHandle = { setProgress: (p: number) => void; setActive: (i: number) => void };

const Tracker = forwardRef<TrackerHandle>(function Tracker(_, ref) {
  const root = useRef<HTMLDivElement>(null);
  const nodes = useRef<(SVGPathElement | null)[]>([]);
  const labels = useRef<(HTMLSpanElement | null)[]>([]);
  const fills = useRef<(SVGRectElement | null)[]>([]);
  const head = useRef<SVGGElement>(null);
  const headDot = useRef<SVGCircleElement>(null);
  const tail = useRef<SVGRectElement>(null);
  const active = useRef(-1);

  useImperativeHandle(ref, () => ({
    setProgress(p: number) {
      const r = root.current;
      if (!r) return;
      const v = gsap.utils.clamp(0, 1, (p - 0.15) / 0.1);
      r.style.opacity = String(v);
      r.style.transform = `translateX(-50%) translateY(${(1 - v) * 14}px)`;
      const t = gsap.utils.clamp(0, 1, (p - 0.25) / 0.67);
      const hx = 20 + t * 700;
      SEGS.forEach(([x1, x2], i) => {
        const f = fills.current[i];
        if (f) f.setAttribute("width", String(Math.max(0, gsap.utils.clamp(x1, x2, hx) - x1)));
      });
      const show = t > 0.005 && t < 0.995;
      if (head.current) head.current.style.opacity = show ? "1" : "0";
      headDot.current?.setAttribute("cx", String(hx));
      const sw = Math.min(26, hx - 20);
      tail.current?.setAttribute("x", String(hx - sw));
      tail.current?.setAttribute("width", String(Math.max(0, sw)));
    },
    setActive(next: number) {
      const prev = active.current;
      if (next === prev) return;
      active.current = next;
      phases.forEach((ph, i) => {
        const on = i <= next;
        const was = i <= prev;
        if (on === was) return;
        const n = nodes.current[i];
        const l = labels.current[i];
        if (!n || !l) return;
        gsap.killTweensOf(n);
        gsap.to(n, {
          morphSVG: { shape: on ? glyph(ph.letter, CX[i]) : ringDot(CX[i]), type: "rotational", shapeIndex: "auto" },
          scale: 1,
          svgOrigin: `${CX[i]} 50`,
          duration: 0.7,
          ease: "power3.inOut",
        });
        gsap.to(l, { autoAlpha: on ? 1 : 0, y: on ? 0 : 4, duration: 0.45, delay: on ? 0.22 : 0, ease: "power2.out", overwrite: "auto" });
      });
    },
  }));

  useEffect(() => {
    labels.current.forEach((l) => l && gsap.set(l, { xPercent: -50, y: 4 }));
  }, []);

  // Idle breathing of nodes not reached yet.
  useEffect(() => {
    const r = root.current;
    if (!r || prefersReducedMotion()) return;
    let timer: gsap.core.Tween | null = null;
    const breathe = () => {
      const future = CX.map((_, i) => i).filter((i) => i > active.current);
      if (future.length) {
        const i = future[(Math.random() * future.length) | 0];
        const n = nodes.current[i];
        if (n) {
          const tl = gsap.timeline();
          tl.to(n, { morphSVG: { shape: wobbleDot(CX[i]), type: "rotational", shapeIndex: "auto" }, scale: 1.6, svgOrigin: `${CX[i]} 50`, duration: 1.3, ease: "sine.inOut" });
          tl.to(n, { morphSVG: { shape: ringDot(CX[i]), type: "rotational", shapeIndex: "auto" }, scale: 1, svgOrigin: `${CX[i]} 50`, duration: 1.3, ease: "sine.inOut" });
        }
      }
      timer = gsap.delayedCall(2.5 + 3 * Math.random(), breathe);
    };
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        if (!timer) timer = gsap.delayedCall(1.5 + 1.5 * Math.random(), breathe);
      } else {
        timer?.kill();
        timer = null;
      }
    });
    io.observe(r);
    return () => {
      io.disconnect();
      timer?.kill();
    };
  }, []);

  return (
    <div ref={root} className={s.tracker} style={{ opacity: 0 }} aria-hidden>
      <svg viewBox="0 0 740 100" className={s.trackerSvg} role="img" aria-label="Delivery chain progress">
        <defs>
          <linearGradient id="mp-spark-tail" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="var(--method-fg)" stopOpacity="0" />
            <stop offset="1" stopColor="var(--method-fg)" stopOpacity=".9" />
          </linearGradient>
        </defs>
        {SEGS.map(([x1, x2], i) => (
          <g key={i}>
            <rect x={x1} y={49.25} width={x2 - x1} height={1.5} style={{ fill: "var(--method-border)" }} />
            <rect ref={(el) => void (fills.current[i] = el)} x={x1} y={49.25} width={0} height={1.5} style={{ fill: "var(--method-fg)" }} />
          </g>
        ))}
        <g ref={head} style={{ opacity: 0 }}>
          <rect ref={tail} x={20} y={48.25} width={0} height={3.5} rx={1} fill="url(#mp-spark-tail)" />
          <circle ref={headDot} cx={20} cy={50} r={2.4} style={{ fill: "var(--method-fg)" }} />
        </g>
        {phases.map((ph, i) => (
          <path
            key={ph.key}
            ref={(el) => void (nodes.current[i] = el)}
            d={ringDot(CX[i])}
            fillRule="evenodd"
            style={{ fill: i === phases.length - 1 ? "var(--color-accent)" : "var(--method-fg)" }}
          />
        ))}
      </svg>
      <div className={s.trackerLabels}>
        {phases.map((ph, i) => (
          <span
            key={ph.key}
            ref={(el) => void (labels.current[i] = el)}
            className={s.trackerLabel}
            style={{ left: `${(CX[i] / 740) * 100}%`, color: i === phases.length - 1 ? "var(--color-accent)" : "var(--method-fg)", opacity: 0 }}
          >
            {ph.word}
          </span>
        ))}
      </div>
    </div>
  );
});

export default Tracker;
