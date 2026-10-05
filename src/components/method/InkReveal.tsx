"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";

// White ink rising over the bottom of the hero as the method section approaches.
export default function InkReveal({ hero, method }: { hero: React.ReactNode; method: React.ReactNode }) {
  const ink = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ink.current;
    const t = trigger.current;
    if (!el || !t) return;
    // Translate (not scale) so the filtered ragged edge is rasterised once and only composited.
    // `s` is the share of the layer covered by ink, as in the original scaleY reveal.
    const base = () => (window.innerHeight + 300) / (window.innerHeight + 600);
    const proxy = { s: 0 };
    const apply = () => gsap.set(el, { yPercent: (base() - proxy.s) * 100 });
    apply();
    const tw = gsap.to(proxy, {
      s: 1,
      ease: (p: number) => (p < 0.02 ? (p / 0.02) * 0.18 : 0.18 + ((p - 0.02) / 0.98) * 0.82),
      onUpdate: apply,
      scrollTrigger: { trigger: t, start: "top bottom", end: "top -25%", scrub: true, onRefresh: apply },
    });
    return () => {
      tw.scrollTrigger?.kill();
      tw.kill();
    };
  }, []);

  return (
    <div style={{ position: "relative" }}>
      <svg width="0" height="0" style={{ position: "absolute", pointerEvents: "none" }} aria-hidden>
        <defs>
          <filter id="ink-edge" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.015 0.02" numOctaves={3} seed={7} result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale={220} xChannelSelector="R" yChannelSelector="G" result="displaced" />
            <feGaussianBlur in="displaced" stdDeviation="1.8" result="presmooth" />
            <feComponentTransfer in="presmooth" result="cut">
              <feFuncA type="discrete" tableValues="0 0 0 0 0 1 1 1 1 1" />
            </feComponentTransfer>
            <feGaussianBlur in="cut" stdDeviation="0.4" />
          </filter>
        </defs>
      </svg>
      <div style={{ position: "relative" }}>
        {hero}
        <div
          aria-hidden
          style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "100vh", zIndex: 40, overflow: "hidden", pointerEvents: "none" }}
        >
          <div ref={ink} style={{ position: "absolute", inset: "-300px -300px -300px -300px", willChange: "transform" }}>
            <div style={{ position: "absolute", inset: 0, filter: "url(#ink-edge)" }}>
              <div style={{ position: "absolute", left: 0, right: 0, top: 300, bottom: 0, background: "#FFFFFF" }} />
            </div>
          </div>
        </div>
      </div>
      <div ref={trigger} style={{ position: "relative" }}>
        {method}
      </div>
    </div>
  );
}
