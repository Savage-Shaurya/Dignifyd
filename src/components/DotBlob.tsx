"use client";

import { useEffect, useRef } from "react";
import { gsap, circlePath, blobPath, prefersReducedMotion } from "@/lib/gsap";

// The period that ends every display headline: a dot that occasionally wobbles into a blob.
export default function DotBlob({ accent = false }: { accent?: boolean }) {
  const pathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    const path = pathRef.current;
    if (!path || prefersReducedMotion()) return;
    let next: gsap.core.Tween | null = null;
    let tl: gsap.core.Timeline | null = null;

    const wobble = () => {
      tl = gsap.timeline();
      tl.to(path, {
        morphSVG: { shape: blobPath(50, 50, 32), type: "rotational", shapeIndex: "auto" },
        scale: 1.4,
        svgOrigin: "50 50",
        duration: 1.5,
        ease: "sine.inOut",
      });
      tl.to(path, {
        morphSVG: { shape: circlePath(50, 50, 32), type: "rotational", shapeIndex: "auto" },
        scale: 1,
        svgOrigin: "50 50",
        duration: 1.5,
        ease: "sine.inOut",
      });
      next = gsap.delayedCall(2.5 + 3 * Math.random(), wobble);
    };
    const stop = () => {
      next?.kill();
      tl?.kill();
      next = null;
    };
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        if (!next) next = gsap.delayedCall(0.5 + 1.8 * Math.random(), wobble);
      } else stop();
    });
    io.observe(path);
    return () => {
      io.disconnect();
      stop();
    };
  }, []);

  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden
      style={{
        display: "inline-block",
        width: ".18em",
        height: ".18em",
        verticalAlign: "baseline",
        marginLeft: ".02em",
        overflow: "visible",
      }}
    >
      <path ref={pathRef} d={circlePath(50, 50, 32)} style={{ fill: accent ? "var(--color-accent)" : "currentColor" }} />
    </svg>
  );
}
