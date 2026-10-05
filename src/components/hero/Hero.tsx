"use client";

import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { gsap, SplitText, prefersReducedMotion, isMobileViewport } from "@/lib/gsap";
import { hero } from "@/content/site";
import StatsPill from "./StatsPill";
import CardCarousel from "./CardCarousel";
import s from "./hero.module.css";

const Globe = dynamic(() => import("../globe/Globe"), { ssr: false });

function blurWordReveal(el: HTMLElement, tl: gsap.core.Timeline, at: number, splits: SplitText[]) {
  const split = SplitText.create(el, { type: "words", wordsClass: "split-word" });
  splits.push(split);
  gsap.set(el, { opacity: 1 });
  gsap.set(split.words, { opacity: 0, filter: "blur(10px)", display: "inline-block", willChange: "filter,opacity" });
  tl.to(
    split.words,
    {
      opacity: 1,
      filter: "blur(0px)",
      duration: 1.2,
      stagger: { amount: 1.2, from: "start" },
      onComplete: () => gsap.set(split.words, { clearProps: "filter,willChange" }),
    },
    at
  );
}

export default function Hero({ enabled }: { enabled: boolean }) {
  const title = useRef<HTMLHeadingElement>(null);
  const sub = useRef<HTMLParagraphElement>(null);
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const t = title.current;
    const p = sub.current;
    const r = root.current;
    if (!t || !p || !r) return;
    const stats = r.querySelector("[data-hero-stats]");
    const carousel = r.querySelector("[data-hero-carousel]");
    if (prefersReducedMotion() || isMobileViewport()) {
      gsap.set([t, p, stats, carousel], { opacity: 1, y: 0 });
      return;
    }
    if (!enabled) {
      gsap.set([t, p], { opacity: 0 });
      gsap.set([stats, carousel], { y: 24, opacity: 0 });
      return;
    }
    const splits: SplitText[] = [];
    const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
    blurWordReveal(t, tl, 0.6, splits);
    blurWordReveal(p, tl, 1.4, splits);
    tl.to(stats, { y: 0, opacity: 1, duration: 1.2 }, 2.0);
    tl.to(carousel, { y: 0, opacity: 1, duration: 1.2 }, 2.6);
    return () => {
      tl.kill();
      splits.forEach((sp) => sp.revert());
    };
  }, [enabled]);

  return (
    <section ref={root} data-hero-section className={s.section} aria-label="Introduction">
      <div className={s.globeSlot}>
        <Globe enabled={enabled} />
      </div>
      <div className={s.content}>
        <div className={s.textBlock}>
          <h1 ref={title} data-hero-title className={`text-display-xl ${s.title}`}>
            {hero.line1} {hero.line2}
          </h1>
          <p ref={sub} data-hero-sub className={`text-body ${s.sub}`}>
            {hero.body}
          </p>
        </div>
        <StatsPill />
        <CardCarousel />
      </div>
    </section>
  );
}
