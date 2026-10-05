"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { gsap, SplitText, ScrollTrigger, prefersReducedMotion } from "@/lib/gsap";
import { talk, cure, entitiesLinks, footer } from "@/content/site";
import { scramble } from "@/lib/scramble";
import DotBlob from "../DotBlob";
import CurvedMarquee from "./CurvedMarquee";
import { createTorus } from "./torus";
import { reopenConsent } from "../chrome/CookieBanner";
import Magnetic from "../Magnetic";
import s from "./footer.module.css";

function RevealLabel({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) return;
    gsap.set(el, { opacity: 0, y: 12 });
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        gsap.to(el, { opacity: 1, y: 0, duration: 0.8 });
        scramble(el, text);
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [text]);
  return (
    <span ref={ref} className={s.label} style={{ display: "inline-block" }}>
      {text}
    </span>
  );
}

const Arrow = () => (
  <span className="arrow-swap" aria-hidden>
    <span>→</span>
    <span>→</span>
  </span>
);

function MailIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3.5 6.5 8.5 6 8.5-6" />
    </svg>
  );
}
function PhoneIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
    </svg>
  );
}
function GlobeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </svg>
  );
}

function Clock({ tz }: { tz: string }) {
  const [label, setLabel] = useState("--:--");
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const fmt = () => new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
    setLabel(fmt());
    const id = setInterval(() => setLabel(fmt()), 30000);
    return () => clearInterval(id);
  }, [tz]);
  useEffect(() => {
    if (ref.current && label !== "--:--") return scramble(ref.current, label);
  }, [label]);
  return (
    <span ref={ref} className={s.clock}>
      {label}
    </span>
  );
}

export default function Footer() {
  const root = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const anchor = useRef<HTMLDivElement>(null);
  const phrase = useRef<HTMLHeadingElement>(null);
  const cureLabel = useRef<HTMLSpanElement>(null);

  // Torus.
  useEffect(() => {
    if (!root.current || !canvas.current) return;
    return createTorus({
      footer: root.current,
      canvas: canvas.current,
      anchor: anchor.current,
      colors: { white: "rgba(245,245,245,0.9)", accent: "rgba(238,26,67,1)", rare: "rgba(255,92,122,0.9)" },
    });
  }, []);

  // Reveals.
  useEffect(() => {
    const f = root.current;
    if (!f || prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.fromTo("[data-footer-comm-card]", { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 1, ease: "expo.out", stagger: 0.12, scrollTrigger: { trigger: "[data-footer-comms]", start: "top 85%", once: true } });

      const h = phrase.current!;
      const split = SplitText.create(h, { type: "words", wordsClass: "split-word" });
      const blob = h.querySelector("svg");
      const targets = [...split.words, ...(blob ? [blob] : [])];
      const run = () => {
        gsap.set(targets, { opacity: 0, filter: "blur(10px)", display: "inline-block" });
        gsap.to(targets, { opacity: 1, filter: "blur(0px)", duration: 1.2, ease: "expo.out", stagger: { amount: 1.2, from: "start" }, overwrite: true });
        if (cureLabel.current) scramble(cureLabel.current, `[ ${cure.label} ]`);
      };
      gsap.set(targets, { opacity: 0, filter: "blur(10px)", display: "inline-block" });
      ScrollTrigger.create({ trigger: h, start: "top 85%", onEnter: run, onEnterBack: run });

      const pills = gsap.utils.toArray<HTMLElement>("[data-footer-pill]");
      const tl = gsap.timeline({ scrollTrigger: { trigger: "[data-footer-socials]", start: "top 85%", once: true } });
      tl.fromTo(pills, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.8, ease: "expo.out", stagger: 0.06 }, 0);
      pills.forEach((p, i) => {
        const lab = p.querySelector<HTMLElement>("[data-pill-label]");
        if (lab) tl.call(() => void scramble(lab, lab.getAttribute("aria-label") || ""), undefined, 0.15 + 0.06 * i);
      });

      gsap.fromTo(["[data-footer-strip-row]", "[data-footer-meta]"], { autoAlpha: 0, y: 20 }, {
        autoAlpha: 1,
        y: 0,
        duration: 1,
        ease: "expo.out",
        stagger: 0.15,
        scrollTrigger: {
          trigger: f,
          start: "top 40%",
          once: true,
          onEnter: () => f.querySelectorAll<HTMLElement>("[data-badge-seg]").forEach((el) => scramble(el, el.getAttribute("aria-label") || "")),
        },
      });
      return () => split.revert();
    }, f);
    return () => ctx.revert();
  }, []);

  return (
    <footer ref={root} className={s.footer} id="footprint">
      <canvas ref={canvas} className={s.torus} aria-hidden />
      <div className={s.content}>
        <CurvedMarquee />

        <div data-footer-comms id="contact">
          <section className={s.comms}>
            <RevealLabel text="[ talk to us ]" />
            <ul className={s.commGrid}>
              {talk.map((t) => (
                <li key={t.kind}>
                  <motion.a
                    href={t.href}
                    data-footer-comm-card
                    className={s.commCard}
                    whileHover={{ y: -4, scale: 1.01 }}
                    whileTap={{ scale: 0.985 }}
                    transition={{ type: "spring", stiffness: 320, damping: 22 }}
                  >
                    <span className={s.commIcon}>{t.kind === "email" ? <MailIcon /> : <PhoneIcon />}</span>
                    <span className={s.commText}>
                      <span className={s.commTitle}>{t.title}</span>
                      <span className={s.commSub}>
                        {t.line} · {t.value}
                      </span>
                    </span>
                    <span aria-hidden className={s.commArrow}>
                      →
                    </span>
                  </motion.a>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className={s.cure}>
          <span ref={cureLabel} className={s.label}>
            [ {cure.label} ]
          </span>
          <h2 ref={phrase} data-footer-phrase className={`text-display-xl ${s.phrase}`}>
            <span className="grad-silver">{cure.before}</span>{" "}
            <span className={s.phraseAccent}>
              <span className="grad-crimson serif-accent">{cure.accent}</span>
              <DotBlob accent />
            </span>
          </h2>
        </section>
        <div ref={anchor} className={s.mobileAnchor} aria-hidden />

        <div data-footer-socials>
          <section className={s.socials}>
            <RevealLabel text="[ the group ]" />
            <ul className={s.pills}>
              {entitiesLinks.map((l) => (
                <li key={l.label}>
                  <Magnetic strength={0.2}>
                  <a href={l.href} target="_blank" rel="noopener noreferrer" data-footer-pill className={s.pill}>
                    <span className={s.pillIcon}>
                      <GlobeIcon />
                    </span>
                    <span data-pill-label aria-label={l.label}>
                      {l.label}
                    </span>
                  </a>
                  </Magnetic>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className={s.columns}>
          {footer.columns.map((col, ci) => (
            <motion.div
              key={col.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "0px 0px -10% 0px" }}
              transition={{ type: "spring", stiffness: 140, damping: 22, delay: ci * 0.08 }}
            >
              <p className={s.colTitle}>{col.title}</p>
              <ul className={s.colList}>
                {col.links.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      target={l.href.startsWith("http") ? "_blank" : undefined}
                      rel={l.href.startsWith("http") ? "noopener noreferrer" : undefined}
                      className={"strong" in l && l.strong ? s.colCta : `link-sweep ${s.colLink}`}
                    >
                      {l.label}
                      {"star" in l && l.star && <span className={`ai-star ${s.star}`}>✦</span>}
                      {"strong" in l && l.strong && <Arrow />}
                    </a>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </section>

        <div data-footer-strip-row className={s.strip}>
          <div className={s.badges}>
            {footer.offices.map((o, i) => (
              <span key={o.city} className={s.badge}>
                {i === 0 && (
                  <span className={s.pulse}>
                    <span data-pulse-ring className={s.pulseDot} />
                    <span className={s.pulseDot} />
                  </span>
                )}
                <span data-badge-seg aria-label={o.city} className={s.badgeMain}>
                  {o.city}
                </span>
                <span aria-hidden>·</span>
                <span data-badge-seg aria-label={o.code}>
                  {o.code}
                </span>
                <span aria-hidden>·</span>
                <span data-badge-seg aria-label={o.role}>
                  {o.role}
                </span>
                <span aria-hidden>·</span>
                <Clock tz={o.tz} />
              </span>
            ))}
            <span className={s.badge}>
              {footer.stats.map(([n, l], i) => (
                <span key={l} className={s.stat}>
                  {i > 0 && <span aria-hidden>·</span>}
                  <span className={s.badgeMain}>{n}</span>
                  <span data-badge-seg aria-label={l}>
                    {l}
                  </span>
                </span>
              ))}
            </span>
          </div>
          <div className={s.rails}>
            <span className={s.railLabel}>standards</span>
            {footer.standards.map((t) => (
              <span key={t} className={s.rail}>
                {t}
              </span>
            ))}
          </div>
        </div>

        <div data-footer-meta className={s.meta}>
          <p>{footer.copyright}</p>
          <ul className={s.metaLinks}>
            <li>
              <a href="mailto:hello@dignifyd.io" className="link-sweep">
                hello@dignifyd.io
              </a>
            </li>
            <li>
              <button type="button" className="link-sweep" onClick={reopenConsent}>
                Cookies
              </button>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
