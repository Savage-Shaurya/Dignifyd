"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";
import { Observer } from "gsap/Observer";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, SplitText, MorphSVGPlugin, Observer);
}

export { gsap, ScrollTrigger, SplitText, MorphSVGPlugin, Observer };

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const isMobileViewport = () => typeof window !== "undefined" && window.innerWidth <= 767;

// Bezier circle helper shared by the morphing dots.
export const K = 0.5522847498;
export function circlePath(cx: number, cy: number, r: number) {
  const k = K * r;
  return `M ${cx - r} ${cy} C ${cx - r} ${cy - k}, ${cx - k} ${cy - r}, ${cx} ${cy - r} C ${cx + k} ${cy - r}, ${cx + r} ${cy - k}, ${cx + r} ${cy} C ${cx + r} ${cy + k}, ${cx + k} ${cy + r}, ${cx} ${cy + r} C ${cx - k} ${cy + r}, ${cx - r} ${cy + k}, ${cx - r} ${cy} Z`;
}

// Same construction with an independent radius per side (top, right, bottom, left).
export function blobPath(cx: number, cy: number, r: number, amount = 0.7) {
  const [t, rr, b, l] = [0, 1, 2, 3].map(() => r * (1 + (Math.random() - 0.5) * amount));
  return `M ${cx - l} ${cy} C ${cx - l} ${cy - K * t}, ${cx - K * l} ${cy - t}, ${cx} ${cy - t} C ${cx + K * rr} ${cy - t}, ${cx + rr} ${cy - K * t}, ${cx + rr} ${cy} C ${cx + rr} ${cy + K * b}, ${cx + K * rr} ${cy + b}, ${cx} ${cy + b} C ${cx - K * l} ${cy + b}, ${cx - l} ${cy + K * b}, ${cx - l} ${cy} Z`;
}
