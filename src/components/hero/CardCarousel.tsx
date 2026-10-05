"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, useSpring, useTransform } from "motion/react";
import { gsap, prefersReducedMotion } from "@/lib/gsap";
import { cards } from "@/content/site";
import { scramble } from "@/lib/scramble";
import s from "./hero.module.css";

type Card = (typeof cards)[number];

function SourceIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="11" fill="var(--color-accent)" />
      <path d="M8 7h4.4a5 5 0 0 1 0 10H8z" fill="none" stroke="#fff" strokeWidth="2" />
    </svg>
  );
}

function CardItem({ card, id, expanded, onToggle }: { card: Card; id: number; expanded: boolean; onToggle: (id: number) => void }) {
  const cta = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  // Flip (read more) and cursor tilt are springs composed into one transform: GPU-only, no reflow.
  const flip = useSpring(0, { stiffness: 120, damping: 18, mass: 0.9 });
  const tiltX = useSpring(0, { stiffness: 180, damping: 20 });
  const tiltY = useSpring(0, { stiffness: 180, damping: 20 });
  const lift = useSpring(0, { stiffness: 220, damping: 22 });
  const rotateY = useTransform([flip, tiltY], ([f, t]) => (f as number) + (t as number));

  useEffect(() => {
    flip.set(expanded ? 180 : 0);
  }, [expanded, flip]);

  // First reveal scramble of the CTA.
  useEffect(() => {
    const el = cta.current;
    if (!el) return;
    let stop = () => {};
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          stop = scramble(el, el.textContent || "", { stagger: 20, cycles: 8, cycleMs: 50 });
          io.disconnect();
        }
      },
      { threshold: 0.25 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      stop();
    };
  }, []);

  const onMove = (e: React.PointerEvent) => {
    if (reduce || e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width - 0.5;
    const ny = (e.clientY - r.top) / r.height - 0.5;
    tiltY.set(nx * 10);
    tiltX.set(-ny * 8);
    lift.set(-6);
  };
  const onLeave = () => {
    tiltX.set(0);
    tiltY.set(0);
    lift.set(0);
  };

  const meta = (
    <footer className={s.cardFoot}>
      <span className={s.avatar}>{card.chip.replace("CH. ", "")}</span>
      <span className={s.cardMeta}>
        {card.title} <span className={s.dim}>·</span> {card.meta}
      </span>
    </footer>
  );

  return (
    <div className={s.cardWrap} onPointerMove={onMove} onPointerLeave={onLeave}>
      <motion.article
        data-clickable=""
        className={s.card3d}
        style={{ rotateX: tiltX, rotateY, y: lift }}
        onClick={() => onToggle(id)}
        role="button"
        tabIndex={0}
        aria-pressed={expanded}
        aria-label={`${card.title}. ${card.text}`}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle(id);
          }
        }}
      >
        <div className={s.face} aria-hidden={expanded}>
          <div className={s.cardSource}>
            <SourceIcon />
            <p>{card.tag}</p>
          </div>
          <p className={s.cardChip}>{card.chip}</p>
          <p className={s.cardQuote}>“{card.text}”</p>
          <span ref={cta} aria-hidden className={s.cardCta}>
            Click to read more →
          </span>
          {meta}
        </div>
        <div className={`${s.face} ${s.faceBack}`} aria-hidden={!expanded}>
          <div className={s.cardSource}>
            <SourceIcon />
            <p>{card.chip} · {card.title}</p>
          </div>
          <p className={s.cardQuoteFull}>“{card.text}”</p>
          <span aria-hidden className={s.cardCta}>
            ← Click to flip back
          </span>
        </div>
      </motion.article>
    </div>
  );
}

export default function CardCarousel() {
  const track = useRef<HTMLDivElement>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    const el = track.current;
    if (!el || prefersReducedMotion()) return;
    let a = el.scrollWidth / 2;
    let speed = a / 50;
    let wrap = gsap.utils.wrap(-a, 0);
    let x = 0;
    let dragging = false;
    let hovering = false;
    let dragActive = false;
    let startX = 0;
    let startPos = 0;
    let pid: number | null = null;
    const tick = (_t: number, dt: number) => {
      if (!dragging && !hovering) x -= (dt / 1000) * speed;
      x = wrap(x);
      gsap.set(el, { x });
    };
    let ticking = false;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !ticking) {
        gsap.ticker.add(tick);
        ticking = true;
      } else if (!e.isIntersecting && ticking) {
        gsap.ticker.remove(tick);
        ticking = false;
      }
    });
    io.observe(el);
    const ro = new ResizeObserver(() => {
      a = el.scrollWidth / 2;
      speed = a / 50;
      wrap = gsap.utils.wrap(-a, 0);
    });
    ro.observe(el);

    el.style.cursor = "grab";
    const enter = () => (hovering = true);
    const leave = () => (hovering = false);
    const down = (e: PointerEvent) => {
      if (pid !== null) return;
      if ((e.target as HTMLElement).closest("button, a, [role='button'], [data-clickable]")) return;
      pid = e.pointerId;
      dragActive = true;
      dragging = false;
      startX = e.clientX;
      startPos = x;
    };
    const move = (e: PointerEvent) => {
      if (e.pointerId !== pid || !dragActive) return;
      const dx = e.clientX - startX;
      if (!dragging) {
        if (Math.abs(dx) < 5) return;
        dragging = true;
        el.style.cursor = "grabbing";
        el.setPointerCapture(pid);
      }
      x = startPos + dx;
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId !== pid) return;
      try {
        el.releasePointerCapture(pid);
      } catch {}
      dragging = dragActive = false;
      pid = null;
      el.style.cursor = "grab";
    };
    el.addEventListener("pointerenter", enter);
    el.addEventListener("pointerleave", leave);
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      io.disconnect();
      ro.disconnect();
      if (ticking) gsap.ticker.remove(tick);
      el.removeEventListener("pointerenter", enter);
      el.removeEventListener("pointerleave", leave);
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, []);

  const toggle = (id: number) => setExpandedId((v) => (v === id ? null : id));
  const list = [...cards, ...cards];

  return (
    <div data-hero-carousel id="advantage" className={s.carousel}>
      <div ref={track} className={s.carouselTrack}>
        {list.map((c, i) => (
          <CardItem key={i} card={c} id={i % cards.length} expanded={expandedId === i % cards.length} onToggle={toggle} />
        ))}
      </div>
    </div>
  );
}
