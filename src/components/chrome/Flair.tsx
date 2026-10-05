"use client";

import { useEffect, useRef } from "react";
import { gsap, prefersReducedMotion } from "@/lib/gsap";

// Cursor-following circular fill used on pill buttons.
export default function Flair({ className }: { className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const flair = ref.current;
    const btn = flair?.parentElement;
    if (!flair || !btn) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches || prefersReducedMotion()) return;
    gsap.set(flair, { scale: 0, xPercent: -50, yPercent: -50 });
    const qx = gsap.quickTo(flair, "x", { duration: 0.35, ease: "power3" });
    const qy = gsap.quickTo(flair, "y", { duration: 0.35, ease: "power3" });
    const local = (e: MouseEvent) => {
      const r = btn.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top, r };
    };
    const enter = (e: MouseEvent) => {
      const { x, y, r } = local(e);
      const size = 2.2 * Math.hypot(r.width, r.height);
      gsap.set(flair, { width: size, height: size, x, y });
      gsap.to(flair, { scale: 1, duration: 0.45, ease: "power2.out", overwrite: "auto" });
    };
    const move = (e: MouseEvent) => {
      const { x, y } = local(e);
      qx(x);
      qy(y);
    };
    const leave = (e: MouseEvent) => {
      const { x, y } = local(e);
      qx(x);
      qy(y);
      gsap.to(flair, { scale: 0, duration: 0.35, ease: "power2.out", overwrite: "auto" });
    };
    btn.addEventListener("mouseenter", enter);
    btn.addEventListener("mousemove", move);
    btn.addEventListener("mouseleave", leave);
    return () => {
      btn.removeEventListener("mouseenter", enter);
      btn.removeEventListener("mousemove", move);
      btn.removeEventListener("mouseleave", leave);
    };
  }, []);

  return (
    <span
      ref={ref}
      aria-hidden
      className={className}
      style={{ pointerEvents: "none", position: "absolute", left: 0, top: 0, zIndex: 0, borderRadius: 999, transform: "scale(0)" }}
    />
  );
}
