"use client";

import { useEffect, useRef } from "react";
import { scramble, type ScrambleOpts } from "@/lib/scramble";

type Props = ScrambleOpts & {
  text: string;
  className?: string;
  /** play once when scrolled into view (default) or on mount */
  trigger?: "view" | "mount";
  threshold?: number;
  /** replay on hover of the closest parent matching this selector */
  hoverParent?: string;
};

export default function ScrambleText({ text, className, trigger = "view", threshold = 0.25, hoverParent, ...opts }: Props) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let stop = () => {};
    const run = () => {
      stop();
      stop = scramble(el, text, opts);
    };
    let io: IntersectionObserver | undefined;
    if (trigger === "mount") run();
    else {
      io = new IntersectionObserver(
        ([e]) => {
          if (e.isIntersecting) {
            run();
            io?.disconnect();
          }
        },
        { threshold }
      );
      io.observe(el);
    }
    const parent = hoverParent ? (el.closest(hoverParent) as HTMLElement | null) : null;
    const onEnter = () => run();
    parent?.addEventListener("mouseenter", onEnter);
    return () => {
      stop();
      io?.disconnect();
      parent?.removeEventListener("mouseenter", onEnter);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return (
    <span ref={ref} className={className} aria-label={text}>
      {text}
    </span>
  );
}
