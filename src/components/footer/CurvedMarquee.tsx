"use client";

import { useEffect, useRef } from "react";
import { gsap, prefersReducedMotion } from "@/lib/gsap";
import { marquee } from "@/content/site";
import s from "./footer.module.css";

const DURATION = 22;

// Text running along a shallow curve; drag it to scrub, release to fling.
export default function CurvedMarquee() {
  const wrap = useRef<HTMLDivElement>(null);
  const textPath = useRef<SVGTextPathElement>(null);
  const measure = useRef<SVGTextElement>(null);
  const pathEl = useRef<SVGPathElement>(null);

  useEffect(() => {
    const w = wrap.current;
    const tp = textPath.current;
    if (!w || !tp || !measure.current || !pathEl.current || prefersReducedMotion()) return;
    let tween: gsap.core.Tween | null = null;
    let dur = DURATION;
    let alive = true;
    let dragging = false;
    let lastX = 0;
    let lastTs = 0;
    let velocity = 1;
    let pid: number | null = null;
    let easing: ((t: number, dt: number) => void) | null = null;

    const build = () => {
      if (!alive) return;
      const textLen = measure.current!.getComputedTextLength();
      const pathLen = pathEl.current!.getTotalLength();
      dur = window.innerWidth <= 639 ? DURATION * 1.1 : DURATION;
      gsap.set(tp, { attr: { startOffset: "0%" } });
      tween = gsap.to(tp, { attr: { startOffset: `-${(textLen / pathLen) * 100}%` }, duration: dur, ease: "none", repeat: -1 });
    };
    document.fonts.ready.then(() => requestAnimationFrame(build));

    const io = new IntersectionObserver(([e]) => {
      if (!tween) return;
      if (e.isIntersecting && !dragging) tween.resume();
      else if (!e.isIntersecting) tween.pause();
    });
    io.observe(w);

    const stopEase = () => {
      if (easing) gsap.ticker.remove(easing);
      easing = null;
    };
    const down = (e: PointerEvent) => {
      if (!tween) return;
      stopEase();
      dragging = true;
      pid = e.pointerId;
      tween.pause();
      w.setPointerCapture(e.pointerId);
      w.style.cursor = "grabbing";
      lastX = e.clientX;
      lastTs = performance.now();
    };
    const move = (e: PointerEvent) => {
      if (!dragging || !tween || e.pointerId !== pid) return;
      const now = performance.now();
      const dx = e.clientX - lastX;
      const shift = (-dx / window.innerWidth) * dur;
      tween.time(gsap.utils.wrap(0, dur, tween.time() + shift));
      const dtMs = Math.max(1, now - lastTs);
      velocity = gsap.utils.clamp(-10, 10, (shift / dtMs) * 1000);
      lastX = e.clientX;
      lastTs = now;
    };
    const up = () => {
      if (!dragging || !tween) return;
      dragging = false;
      pid = null;
      w.style.cursor = "grab";
      const v = performance.now() - lastTs > 120 ? 1 : velocity;
      if (v < 0) tween.totalTime(tween.time() + dur);
      tween.timeScale(v || 1);
      tween.resume();
      let ts = v || 1;
      easing = (_t, dt) => {
        ts += (1 - ts) * (1 - Math.exp(-(dt / 1000) * 2));
        if (Math.abs(ts - 1) < 0.01) {
          tween?.timeScale(1);
          stopEase();
        } else tween?.timeScale(ts);
      };
      gsap.ticker.add(easing);
    };
    w.addEventListener("pointerdown", down);
    w.addEventListener("pointermove", move);
    w.addEventListener("pointerup", up);
    w.addEventListener("pointercancel", up);
    return () => {
      alive = false;
      io.disconnect();
      stopEase();
      tween?.kill();
      w.removeEventListener("pointerdown", down);
      w.removeEventListener("pointermove", move);
      w.removeEventListener("pointerup", up);
      w.removeEventListener("pointercancel", up);
    };
  }, []);

  const rep = (i: number) => (
    <tspan key={i}>
      {marquee.head}
      <tspan fill="var(--color-accent)">{marquee.accent}</tspan>
      {marquee.tail}
      {" · "}
    </tspan>
  );

  return (
    <div ref={wrap} data-framework-marquee className={s.marquee} aria-label={`${marquee.head}${marquee.accent}${marquee.tail}`}>
      <svg viewBox="0 165 1400 175" preserveAspectRatio="xMidYMid meet" className={s.marqueeSvg} aria-hidden>
        <defs>
          <path ref={pathEl} id="fm-curve" d="M -50,304 Q 700,410 1450,190" fill="none" />
        </defs>
        <text ref={measure} x="0" y="0" visibility="hidden">
          {marquee.head}
          <tspan>{marquee.accent}</tspan>
          {marquee.tail}
          {" · "}
        </text>
        <text fill="rgba(245,245,245,.32)" style={{ pointerEvents: "none" }}>
          <textPath ref={textPath} href="#fm-curve" startOffset="0%">
            {[0, 1, 2].map(rep)}
          </textPath>
        </text>
      </svg>
    </div>
  );
}
