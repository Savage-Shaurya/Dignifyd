"use client";

import { useEffect, useRef } from "react";
import { gsap, prefersReducedMotion } from "@/lib/gsap";
import { clientLogos } from "@/content/site";
import s from "./hero.module.css";

const COPIES = 4;

export default function LogoMarquee({ variant = "overlay" }: { variant?: "overlay" | "row" }) {
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = track.current;
    if (!el || prefersReducedMotion()) return;
    let tween: gsap.core.Tween | null = null;
    let visible = true;
    const raf = requestAnimationFrame(() => {
      const w = el.scrollWidth / COPIES;
      if (w <= 0) return;
      const wrap = gsap.utils.unitize(gsap.utils.wrap(-w, 0));
      tween = gsap.to(el, { x: `-=${w}`, duration: 70, ease: "none", repeat: -1, modifiers: { x: wrap } });
      if (!visible) tween.pause();
    });
    const io = new IntersectionObserver((es) =>
      es.forEach((e) => ((visible = e.isIntersecting) ? tween?.play() : tween?.pause()))
    );
    io.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      tween?.kill();
    };
  }, []);

  return (
    <div className={variant === "overlay" ? s.marqueeOverlay : s.marqueeRow} aria-hidden>
      <div ref={track} className={s.marqueeTrack}>
        {Array.from({ length: COPIES }, (_, c) => (
          <div key={c} className={s.marqueeCopy}>
            {clientLogos.map((l, i) => (
              <div key={i} className={s.logoBox}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={l.src} alt={c === 0 ? l.alt : ""} loading="lazy" draggable={false} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
