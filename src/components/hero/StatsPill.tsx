"use client";

import { useEffect, useState } from "react";
import { hero } from "@/content/site";
import LogoMarquee from "./LogoMarquee";
import s from "./hero.module.css";

// Alternates between two small "sources" like the reference's Google / Trustindex loop.
function SourceLoop() {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((v) => (v + 1) % 2), 3200);
    return () => clearInterval(t);
  }, []);
  return (
    <span className={s.sourceLoop}>
      <span className={s.sourceItem} style={{ opacity: i === 0 ? 1 : 0 }}>
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
          <rect width="16" height="16" rx="5" fill="var(--color-accent)" />
          <path d="M5 4h3.2a4 4 0 0 1 0 8H5z" fill="none" stroke="#fff" strokeWidth="1.6" />
        </svg>
        satisfaction
      </span>
      <span className={s.sourceItem} style={{ opacity: i === 1 ? 1 : 0 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
          <rect width="24" height="24" rx="6" fill="#f5f5f5" />
          <path d="M10.6 16.2 6.4 12l1.6-1.6 2.6 2.6 5.4-5.4 1.6 1.6z" fill="#0a0a0a" />
        </svg>
        rated 4.7/5
      </span>
    </span>
  );
}

export default function StatsPill() {
  return (
    <div data-hero-stats className={s.stats}>
      <LogoMarquee variant="overlay" />
      <div className={s.pillWrap}>
        <div className={s.pill}>
          {hero.stats.map(([n, l], i) => (
            <span key={l} className={s.pillGroup}>
              <span>
                <span className={s.pillNum}>{n}</span> <span className={s.pillLabel}>{l}</span>
              </span>
              {i < hero.stats.length - 1 && <span className={s.sep}>·</span>}
            </span>
          ))}
          <span className={s.sep}>·</span>
          <span className={s.pillRating}>
            <span className={s.star}>★</span>
            <span>{hero.rating.value}</span>
            <SourceLoop />
          </span>
        </div>
        <svg className={s.spark} preserveAspectRatio="none" aria-hidden>
          <defs>
            <filter id="spark-halo" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.2" />
            </filter>
          </defs>
          <rect x="0" y="0" width="100%" height="100%" rx="8" ry="8" fill="none" vectorEffect="non-scaling-stroke" stroke="rgba(255,255,255,.15)" strokeWidth="1" />
          <rect className={s.sparkHead} x="0" y="0" width="100%" height="100%" rx="8" ry="8" fill="none" vectorEffect="non-scaling-stroke" pathLength={100} filter="url(#spark-halo)" />
          <rect className={`${s.sparkHead} ${s.sparkMirror}`} x="0" y="0" width="100%" height="100%" rx="8" ry="8" fill="none" vectorEffect="non-scaling-stroke" pathLength={100} filter="url(#spark-halo)" />
        </svg>
      </div>
      <div className={s.marqueeMobile}>
        <LogoMarquee variant="row" />
      </div>
    </div>
  );
}
