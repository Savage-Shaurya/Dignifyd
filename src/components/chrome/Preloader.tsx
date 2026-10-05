"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, prefersReducedMotion } from "@/lib/gsap";
import { phases } from "@/content/site";
import s from "./chrome.module.css";

export const INTRO_KEY = "dg_intro_seen";

export function shouldSkipIntro() {
  if (typeof window === "undefined") return false;
  let seen = false;
  try {
    seen = !!sessionStorage.getItem(INTRO_KEY);
  } catch {}
  return prefersReducedMotion() || window.matchMedia("(max-width: 767px)").matches || seen;
}

export default function Preloader({ onComplete, play }: { onComplete: () => void; play: boolean }) {
  const overlay = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(0);
  const [step, setStep] = useState(-1);
  const done = useRef(onComplete);
  useEffect(() => {
    done.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const el = overlay.current;
    if (!el || !play) return;

    const state = { value: 0 };
    const update = () => setCount(Math.round(state.value));
    let finishing = false;
    const slowTail = gsap.to(state, { value: 99, duration: 4.5, ease: "power1.out", paused: true, onUpdate: update });
    let finishTl: gsap.core.Timeline | null = null;
    let fallback: gsap.core.Tween | null = null;

    const finish = () => {
      if (finishing) return;
      finishing = true;
      slowTail.kill();
      fallback?.kill();
      finishTl = gsap.timeline();
      finishTl.to(state, { value: 100, duration: 0.35, ease: "power2.out", onUpdate: update });
      finishTl.to({}, { duration: 0.5 });
      finishTl.to(el, { autoAlpha: 0, duration: 0.6, ease: "expo.inOut", onComplete: () => done.current() });
    };

    const main = gsap.timeline({
      onComplete: () => {
        if (document.readyState === "complete") finish();
        else {
          slowTail.play();
          window.addEventListener("load", finish, { once: true });
          fallback = gsap.delayedCall(4.5, finish);
        }
      },
    });
    main.to(state, { value: 92, duration: 0.42 * phases.length, ease: "power2.inOut", onUpdate: update }, 0);
    phases.forEach((_, i) => main.call(() => setStep(i), [], 0.42 * i));

    return () => {
      main.kill();
      slowTail.kill();
      finishTl?.kill();
      fallback?.kill();
      window.removeEventListener("load", finish);
    };
  }, [play]);

  const last = phases.length - 1;
  return (
    <div ref={overlay} data-intro-overlay aria-hidden className={s.preloader}>
      <div className={s.counter}>
        <span>{String(count).padStart(3, "0")}</span>
        <span className={s.counterPct}>%</span>
      </div>
      <div className={s.steps}>
        {phases.map((p, i) => {
          const reached = i <= step;
          return (
            <div key={p.key} className={s.step}>
              <span className={`${s.stepDot} ${reached ? (i === last ? s.stepDotAccent : s.stepDotOn) : ""}`} />
              <span className={`${s.stepLabel} ${reached ? s.stepLabelOn : ""}`}>{p.word}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
