"use client";

import { useEffect, useId, useRef } from "react";
import { gsap, SplitText, prefersReducedMotion } from "@/lib/gsap";

const CXS = [3, 19.5, 36, 52.5, 66];

// Wordmark + five gooey dots (one per entity); the accent dot slides along leaving white dots behind.
export default function LogoFusion({ enabled }: { enabled: boolean }) {
  const word = useRef<HTMLSpanElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const dots = useRef<(SVGCircleElement | null)[]>([]);
  const ready = useRef(false);
  const filterId = useId().replace(/:/g, "");

  useEffect(() => {
    const w = word.current;
    const d = dots.current;
    if (!w || d.some((x) => !x)) return;
    if (prefersReducedMotion()) {
      gsap.set(w, { opacity: 1 });
      d.forEach((c, i) => gsap.set(c, { opacity: 1, attr: { cx: CXS[i] } }));
      ready.current = true;
      return;
    }
    if (!enabled) {
      gsap.set(w, { opacity: 0 });
      d.slice(0, 4).forEach((c) => gsap.set(c, { opacity: 0 }));
      gsap.set(d[4], { attr: { cx: CXS[0] }, opacity: 1 });
      return;
    }
    gsap.set(w, { opacity: 1 });
    const split = SplitText.create(w, { type: "chars" });
    gsap.set(split.chars, { yPercent: 110, opacity: 0, display: "inline-block" });
    const tl = gsap.timeline({
      delay: 0.3,
      onComplete: () => {
        ready.current = true;
        split.revert();
      },
    });
    tl.to({}, { duration: 0.34 });
    for (let t = 0; t < 4; t++) {
      tl.to(d[t], { opacity: 1, duration: 0.26, ease: "sine.out" }, t === 0 ? ">" : ">0.08");
      tl.to(d[4], { attr: { cx: CXS[t + 1] }, duration: 0.68, ease: "power3.inOut" }, "<");
    }
    tl.to(split.chars, { yPercent: 0, opacity: 1, duration: 0.7, stagger: 0.035, ease: "expo.out" }, ">-0.476");
    return () => {
      tl.kill();
      split.revert();
    };
  }, [enabled]);

  // Dots shy away from the pointer.
  useEffect(() => {
    const el = svg.current;
    if (!el || prefersReducedMotion()) return;
    const move = (e: MouseEvent) => {
      if (!ready.current) return;
      const ctm = el.getScreenCTM();
      if (!ctm) return;
      const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
      dots.current.forEach((c, i) => {
        if (!c) return;
        const dx = CXS[i] - pt.x;
        const dy = 4 - pt.y;
        const o = Math.hypot(dx, dy);
        const k = i === 4 ? 0.55 : 1;
        if (o < 14) {
          const a = Math.atan2(dy, dx);
          gsap.to(c, { x: Math.cos(a) * (1 - o / 14) * 6 * k, y: Math.sin(a) * (1 - o / 14) * 6 * k, duration: 0.5, ease: "power3.out", overwrite: "auto" });
        } else gsap.to(c, { x: 0, y: 0, duration: 0.8, ease: "elastic.out(1,0.5)", overwrite: "auto" });
      });
    };
    const leave = () => gsap.to(dots.current, { x: 0, y: 0, duration: 0.9, ease: "elastic.out(1,0.5)", overwrite: "auto" });
    el.addEventListener("mousemove", move);
    el.addEventListener("mouseleave", leave);
    return () => {
      el.removeEventListener("mousemove", move);
      el.removeEventListener("mouseleave", leave);
    };
  }, []);

  return (
    <span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
      <span
        ref={word}
        style={{ fontFamily: "var(--font-display)", fontWeight: 700, lineHeight: 1, letterSpacing: "-0.02em", fontSize: 14, willChange: "transform", opacity: 0, overflow: "hidden" }}
      >
        Dignifyd<span className="text-accent">Group</span>
      </span>
      <svg ref={svg} viewBox="0 0 69 8" width={96} height={11} style={{ overflow: "visible" }} aria-hidden>
        <defs>
          <filter id={filterId}>
            <feGaussianBlur stdDeviation="2.2" />
            <feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 26 -12" />
          </filter>
        </defs>
        <rect x={-6} y={-8} width={81} height={24} fill="transparent" />
        <g filter={`url(#${filterId})`}>
          {CXS.map((cx, i) => (
            <circle key={i} ref={(el) => void (dots.current[i] = el)} cx={cx} cy={4} r={3.2} fill={i === 4 ? "var(--color-accent)" : "#F5F5F5"} />
          ))}
        </g>
      </svg>
    </span>
  );
}
