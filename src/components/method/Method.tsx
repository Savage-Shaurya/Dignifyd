"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, SplitText, prefersReducedMotion } from "@/lib/gsap";
import { framework, phases } from "@/content/site";
import DotBlob from "../DotBlob";
import Tracker, { type TrackerHandle } from "./Tracker";
import { startSwarm } from "./particleSweep";
import s from "./method.module.css";

const ENTER_AT = [0.25, 0.43, 0.59, 0.76, 0.92];
// Final background of the pin = the page background (#0a0a0a).
const END_BG = [10, 10, 10];

function ParticleLayer({ run }: { run: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!run || !canvas.current) return;
    return startSwarm(canvas.current, "#000000");
  }, [run]);
  return <canvas ref={canvas} className={s.particles} aria-hidden />;
}

function nameSize(word: string) {
  const len = Math.max(word.length, 6);
  return `clamp(38px, ${(102 / len).toFixed(1)}vw, ${Math.round(934 / len)}px)`;
}

export default function Method() {
  const wrapper = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const intro = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const tracker = useRef<TrackerHandle>(null);
  const [particleRun, setParticleRun] = useState(0);
  const [showParticles, setShowParticles] = useState(false);

  // Particle sweep: restart whenever the rail comes into view, stop after 6.5s.
  useEffect(() => {
    const r = rail.current;
    if (!r || prefersReducedMotion()) return;
    let t: number | undefined;
    const io = new IntersectionObserver(
      ([e]) => {
        clearTimeout(t);
        if (e.isIntersecting) {
          setParticleRun((k) => k + 1);
          setShowParticles(true);
          t = window.setTimeout(() => setShowParticles(false), 6500);
        } else setShowParticles(false);
      },
      { threshold: 0.1 }
    );
    io.observe(r);
    return () => {
      io.disconnect();
      clearTimeout(t);
    };
  }, []);

  useEffect(() => {
    const w = wrapper.current;
    const r = rail.current;
    const introEl = intro.current;
    const tr = track.current;
    if (!w || !r || !introEl || !tr) return;

    if (prefersReducedMotion()) {
      w.dataset.reducedMotion = "true";
      gsap.set(introEl, { opacity: 1, scale: 1 });
      tracker.current?.setProgress(1);
      tracker.current?.setActive(4);
      return;
    }

    const ctx = gsap.context(() => {
      const slides = gsap.utils.toArray<HTMLElement>("[data-method-slide]", tr);
      const splits: SplitText[] = [];
      const parts = slides.map((slide, i) => {
        const name = slide.querySelector<HTMLElement>("[data-method-name]")!;
        const split = SplitText.create(name, { type: "chars", charsClass: "split-char" });
        splits.push(split);
        gsap.set(name, { opacity: 1 });
        const tagline = slide.querySelectorAll<HTMLElement>("[data-method-tagline]");
        const bullets = slide.querySelectorAll<HTMLElement>("[data-method-bullet]");
        if (i === 0) {
          gsap.set(split.chars, { y: 0, opacity: 1, display: "inline-block" });
          gsap.set([...tagline, ...bullets], { y: 0, opacity: 1 });
        } else {
          gsap.set(split.chars, { y: 24, opacity: 0, display: "inline-block" });
          gsap.set([...tagline, ...bullets], { y: 12, opacity: 0 });
        }
        return { chars: split.chars, tagline, bullets };
      });
      const shown = parts.map((_, i) => i === 0);

      const enter = (i: number) => {
        const p = parts[i];
        gsap.to(p.chars, { y: 0, opacity: 1, duration: 0.8, stagger: 0.06, ease: "expo.out", overwrite: "auto" });
        gsap.to(p.tagline, { y: 0, opacity: 1, duration: 0.8, ease: "expo.out", delay: 0.15, overwrite: "auto" });
        gsap.to(p.bullets, { y: 0, opacity: 1, duration: 0.8, stagger: 0.08, ease: "expo.out", delay: 0.3, overwrite: "auto" });
      };
      const exit = (i: number) => {
        const p = parts[i];
        gsap.to(p.chars, { y: 24, opacity: 0, duration: 0.3, ease: "power3.in", overwrite: "auto" });
        gsap.to(p.tagline, { y: 12, opacity: 0, duration: 0.3, ease: "power3.in", overwrite: "auto" });
        gsap.to(p.bullets, { y: 12, opacity: 0, duration: 0.3, ease: "power3.in", overwrite: "auto" });
      };

      // Intro text in → hold → out around the pin start.
      gsap.set(introEl, { opacity: 0, scale: 0.95 });
      gsap
        .timeline({ scrollTrigger: { trigger: r, start: "top bottom", end: "+=200%", scrub: 1.5 } })
        .to(introEl, { opacity: 1, scale: 1, ease: "none", duration: 50 })
        .to(introEl, { opacity: 1, scale: 1, duration: 35 })
        .to(introEl, { opacity: 0, scale: 1.05, ease: "none", duration: 15 });

      const ease2 = gsap.parseEase("power2.in");
      const mixFg = gsap.utils.interpolate("#171717", "#F5F5F5");
      const mixBorder = gsap.utils.interpolate("rgba(0,0,0,0.1)", "rgba(255,255,255,0.1)");
      const applyTheme = (p: number) => {
        const e = ease2(gsap.utils.clamp(0, 1, (p - 0.5) / 0.5));
        const fade = gsap.utils.clamp(0, 1, (p - 0.95) / 0.05);
        const c = [255, 255, 255].map((v, i) => Math.round(v - (v - END_BG[i]) * e));
        w.style.setProperty("--method-bg", `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${1 - fade})`);
        w.style.setProperty("--method-fg", mixFg(e));
        w.style.setProperty("--method-border", mixBorder(e));
      };

      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: r,
          start: "top top",
          end: "+=500%",
          pin: true,
          scrub: 1.5,
          onUpdate: (self) => {
            const p = self.progress;
            tracker.current?.setProgress(p);
            let act = -1;
            ENTER_AT.forEach((at, i) => {
              if (p >= at) act = i;
            });
            tracker.current?.setActive(act);
            for (let i = 1; i < 5; i++) {
              const now = p >= ENTER_AT[i];
              if (now && !shown[i]) {
                shown[i] = true;
                enter(i);
              } else if (!now && shown[i]) {
                shown[i] = false;
                exit(i);
              }
            }
            applyTheme(p);
          },
        },
      });
      tl.fromTo(tr, { x: () => window.innerWidth }, { x: () => -2.65 * window.innerWidth, duration: 0.8 }, 0.2);

      return () => splits.forEach((sp) => sp.revert());
    }, w);
    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={wrapper}
      id="group"
      data-method
      className={s.method}
      style={{ ["--method-bg" as string]: "#FFFFFF", ["--method-fg" as string]: "#171717", ["--method-border" as string]: "rgba(0,0,0,.1)" }}
    >
      <span id="what-we-do" aria-hidden style={{ position: "absolute", top: "100vh" }} />
      <div ref={rail} data-method-rail className={s.rail}>
        {showParticles && (
          <div className={s.particleLayer}>
            <ParticleLayer run={particleRun} />
          </div>
        )}
        <div ref={intro} data-method-intro className={s.intro} style={{ opacity: 0 }}>
          <span className={s.introLabel}>[ {framework.label} ]</span>
          <h2 className={`text-display-xl ${s.introTitle}`}>
            {framework.titleLead} <span className="grad-ink serif-accent">{framework.titleAccent}</span>
            <DotBlob accent />
          </h2>
          <p className={`text-body ${s.introLead}`}>{framework.body}</p>
          <p className={`text-label-l ${s.introList}`}>
            {phases.slice(0, -1).map((p) => `${p.word} · `)}
            <span className="text-accent">{phases[phases.length - 1].word}</span>
          </p>
        </div>

        <div ref={track} data-method-track className={s.track}>
          {phases.map((ph, i) => (
            <article key={ph.key} data-method-slide={i} aria-label={`${String(i + 1).padStart(2, "0")} · ${ph.word} · ${ph.entity}`} className={s.slide}>
              <span data-method-watermark aria-hidden className={s.watermark}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className={s.slideBody}>
                <p data-method-tagline className={s.entity}>
                  {ph.entity}
                </p>
                <h3 className={s.name} style={{ fontSize: nameSize(ph.word) }}>
                  <span data-method-name>{ph.word}</span>
                  <DotBlob accent={i === phases.length - 1} />
                </h3>
                <div aria-hidden className={s.divider} />
                <p data-method-tagline className={`text-body ${s.tagline}`}>
                  {ph.lead}
                </p>
                <ul data-method-bullets className={s.bullets}>
                  {ph.bullets.map((b) => (
                    <li key={b} data-method-bullet className={s.bullet}>
                      <span aria-hidden className={s.dash} />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
        <Tracker ref={tracker} />
      </div>
    </div>
  );
}
