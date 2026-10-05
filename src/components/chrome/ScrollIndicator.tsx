"use client";

import { useEffect, useRef, useState } from "react";
import s from "./chrome.module.css";

export default function ScrollIndicator({ enabled }: { enabled: boolean }) {
  const label = useRef<HTMLSpanElement>(null);
  const thumb = useRef<HTMLSpanElement>(null);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const pct = Math.min(100, Math.max(0, max > 0 ? (window.scrollY / max) * 100 : 0));
      if (label.current) label.current.textContent = `${String(Math.round(pct)).padStart(3, "0")}%`;
      if (thumb.current) thumb.current.style.transform = `translateX(-50%) translateY(${(pct / 100) * 56}px)`;
      setComplete(pct >= 99.5);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [enabled]);

  return (
    <div aria-hidden data-complete={complete} className={`${s.indicator} ${complete ? s.indicatorDone : ""}`}>
      <div className={s.indicatorTrack}>
        <span ref={thumb} className={s.indicatorThumb} />
      </div>
      <span ref={label} className={s.indicatorLabel}>
        000%
      </span>
    </div>
  );
}
