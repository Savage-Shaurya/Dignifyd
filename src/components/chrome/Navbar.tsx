"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { gsap, prefersReducedMotion } from "@/lib/gsap";
import { nav, entities, engagements, footprint, cards, type NavItem } from "@/content/site";
import { useLenis } from "../SmoothScroll";
import LogoFusion from "./LogoFusion";
import Flair from "./Flair";
import { openEnquiry } from "../enquiry/bus";
import Magnetic from "../Magnetic";
import s from "./nav.module.css";

type Panel = NonNullable<NavItem["panel"]>;

const SEARCH_INDEX: { k: string; href: string }[] = [
  ...entities.map((e) => ({ k: `${e.name} ${e.kind}`, href: "#group" })),
  { k: "what we do hire build run grow decide", href: "#what-we-do" },
  { k: "advantage manifesto accountable handover measured follow-the-sun", href: "#advantage" },
  { k: "enquiry outcome audit", href: "#contact" },
  { k: "engage pilot capability partnership", href: "#enquiry" },
  { k: "footprint centres offices london dubai singapore toronto chicago delhi", href: "#footprint" },
  { k: "contact email phone", href: "#contact" },
];

function Arrow() {
  return (
    <span className="arrow-swap" aria-hidden>
      <span>→</span>
      <span>→</span>
    </span>
  );
}

const slug = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

// Optional generated artwork (see /image-prompts.json); hidden until the file exists.
function SlotImage({ src, className }: { src: string; className?: string }) {
  const [ok, setOk] = useState(false);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className={className} style={{ opacity: ok ? 1 : 0 }} onLoad={() => setOk(true)} onError={() => setOk(false)} loading="lazy" draggable={false} />
  );
}

function EntityTile({ letter, name }: { letter: string; name: string }) {
  return (
    <span className={s.tile} aria-hidden>
      <span className={s.tileGlyph}>{letter}</span>
      <SlotImage src={`/images/entities/${slug(name)}.webp`} className={s.slotImg} />
    </span>
  );
}

export default function Navbar({ revealed }: { revealed: boolean }) {
  const root = useRef<HTMLElement>(null);
  const pill = useRef<HTMLDivElement>(null);
  const panels = useRef<Partial<Record<Panel, HTMLDivElement | null>>>({});
  const tls = useRef<Partial<Record<Panel, gsap.core.Timeline>>>({});
  const [open, setOpen] = useState<Panel | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const openTimer = useRef<number | undefined>(undefined);
  const closeTimer = useRef<number | undefined>(undefined);
  const searchWrap = useRef<HTMLDivElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const mobilePanel = useRef<HTMLDivElement>(null);
  const lenis = useLenis();

  // Entry.
  useEffect(() => {
    if (!revealed || !pill.current || prefersReducedMotion()) return;
    const tl = gsap.timeline({ delay: 0.12 });
    tl.from(pill.current, { y: -26, scale: 0.94, autoAlpha: 0, duration: 1.1, ease: "expo.out", transformOrigin: "center top", clearProps: "transform,opacity,visibility" });
    tl.from(pill.current.querySelectorAll("[data-nav-enter]"), { y: -8, autoAlpha: 0, duration: 0.7, ease: "power3.out", stagger: 0.06, clearProps: "transform,opacity" }, "-=0.7");
    return () => {
      tl.kill();
    };
  }, [revealed]);

  // Panel timelines.
  useEffect(() => {
    (Object.keys(panels.current) as Panel[]).forEach((k) => {
      const el = panels.current[k];
      if (!el) return;
      const items = el.querySelectorAll("[data-mega-item]");
      const tl = gsap.timeline({ paused: true });
      if (k === "footprint") {
        tl.fromTo(el, { autoAlpha: 0, yPercent: -8, scale: 0.94, transformOrigin: "top left" }, { autoAlpha: 1, yPercent: 0, scale: 1, duration: 0.26, ease: "back.out(1.8)" }, 0);
        tl.fromTo(items, { opacity: 0, x: -16 }, { opacity: 1, x: 0, duration: 0.22, ease: "back.out(1.7)", stagger: 0.03 }, 0.06);
      } else {
        tl.fromTo(el, { autoAlpha: 0, xPercent: -50, y: -14, scale: 0.94, transformOrigin: "top center" }, { autoAlpha: 1, xPercent: -50, y: 0, scale: 1, duration: 0.28, ease: "back.out(1.4)" }, 0);
        tl.fromTo(items, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.25, ease: "back.out(2.2)", stagger: k === "engage" ? 0.04 : 0.012 }, 0.06);
      }
      tls.current[k] = tl;
    });
    return () => Object.values(tls.current).forEach((t) => t?.kill());
  }, []);

  useEffect(() => {
    (Object.keys(tls.current) as Panel[]).forEach((k) => {
      const tl = tls.current[k]!;
      if (k === open) tl.timeScale(1).play();
      else if (tl.progress() > 0) tl.timeScale(2).reverse();
    });
  }, [open]);

  // Scroll state + close on scroll.
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 80);
      setOpen(null);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(null);
        setSearchOpen(false);
        setMobileOpen(false);
      }
    };
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) {
        setOpen(null);
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, []);

  // Search expand.
  useEffect(() => {
    const w = searchWrap.current;
    if (!w) return;
    if (searchOpen) gsap.to(w, { width: 210, autoAlpha: 1, duration: 0.5, ease: "expo.out", onComplete: () => searchInput.current?.focus() });
    else gsap.to(w, { width: 0, autoAlpha: 0, duration: 0.3, ease: "power3.in" });
  }, [searchOpen]);

  // Mobile panel.
  useEffect(() => {
    const p = mobilePanel.current;
    if (!p) return;
    const items = p.querySelectorAll("[data-mobile-item]");
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    if (mobileOpen) {
      gsap.to(p, { height: "auto", duration: 0.5, ease: "power2.out" });
      gsap.fromTo(items, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.45, ease: "back.out(1.4)", stagger: 0.04, delay: 0.08 });
    } else {
      gsap.to(items, { autoAlpha: 0, y: 6, duration: 0.2, ease: "power2.in" });
      gsap.to(p, { height: 0, duration: 0.35, ease: "power2.inOut" });
    }
  }, [mobileOpen]);

  const go = useCallback(
    (href: string) => {
      setOpen(null);
      setMobileOpen(false);
      if (href.startsWith("#")) {
        const el = document.querySelector(href) as HTMLElement | null;
        if (el) {
          if (lenis) lenis.scrollTo(el, { offset: -20 });
          else el.scrollIntoView({ behavior: "smooth" });
        }
        return true;
      }
      return false;
    },
    [lenis]
  );

  const intentOpen = (p: Panel) => {
    clearTimeout(closeTimer.current);
    clearTimeout(openTimer.current);
    openTimer.current = window.setTimeout(() => setOpen(p), p === "footprint" ? 0 : 120);
  };
  const intentClose = () => {
    clearTimeout(openTimer.current);
    clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpen(null), 180);
  };

  const onLink = (e: React.MouseEvent, href: string) => {
    if (go(href)) e.preventDefault();
  };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim().toLowerCase();
    if (!q) return;
    const hit = SEARCH_INDEX.find((x) => x.k.toLowerCase().includes(q)) ?? SEARCH_INDEX.find((x) => q.split(/\s+/).some((w) => x.k.toLowerCase().includes(w)));
    setSearchOpen(false);
    setQuery("");
    if (hit) go(hit.href);
  };

  const shadow = mobileOpen ? s.shadowMenu : scrolled || open ? s.shadowScrolled : s.shadowTop;

  return (
    <header ref={root} data-nav-root className={`${s.header} ${revealed ? "" : s.hidden}`} onMouseLeave={intentClose}>
      <div ref={pill} className={`${s.pill} ${shadow}`}>
        <nav className={s.row} aria-label="Primary">
          <a href="#top" data-nav-enter className={s.logo} aria-label="Dignifyd Group home" onClick={(e) => onLink(e, "#top")}>
            <LogoFusion enabled={revealed} />
          </a>

          <ul data-nav-enter className={s.items}>
            {nav.map((item) => (
              <li
                key={item.label}
                className={item.panel === "footprint" ? s.relative : undefined}
                onMouseEnter={() => (item.panel ? intentOpen(item.panel) : intentClose())}
                onMouseLeave={item.panel === "footprint" ? () => setOpen(null) : undefined}
              >
                <span className={s.itemWrap}>
                  {item.panel ? (
                    <button
                      type="button"
                      className={`${s.item} ${open === item.panel ? s.itemOpen : ""}`}
                      aria-expanded={open === item.panel}
                      onClick={() => setOpen((v) => (v === item.panel ? null : item.panel!))}
                      onFocus={() => setOpen(item.panel!)}
                    >
                      {item.label}
                      {item.sup && <sup className={s.sup}>{item.sup}</sup>}
                      <span className={`${s.caret} ${open === item.panel ? s.caretOpen : ""}`}>▾</span>
                    </button>
                  ) : (
                    <a href={item.href} className={`${s.item} ${s.plain}`} onClick={(e) => onLink(e, item.href)}>
                      {item.label}
                      <span className={s.underline} />
                    </a>
                  )}
                </span>
                {item.panel === "footprint" && (
                  <div ref={(el) => void (panels.current.footprint = el)} className={s.small} role="menu">
                    {footprint.map((f) => (
                      <a key={f.city} href="#footprint" data-mega-item className={s.smallItem} onClick={(e) => onLink(e, "#footprint")}>
                        <span>{f.city}</span>
                        <span className={s.smallNote}>{f.region}</span>
                      </a>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>

          <div data-nav-enter className={s.right}>
            <div ref={searchWrap} className={s.searchWrap} style={{ width: 0, opacity: 0, visibility: "hidden" }}>
              <form onSubmit={submitSearch}>
                <input
                  ref={searchInput}
                  className={s.searchInput}
                  placeholder="search the group…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="Search"
                />
              </form>
            </div>
            <button type="button" className={s.iconBtn} aria-label="Search" onClick={() => setSearchOpen((v) => !v)}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </button>
            <Magnetic>
            <button type="button" className={s.cta} onClick={() => openEnquiry({ preset: "pilot" })}>
              <Flair className={s.flair} />
              <span className={s.ctaInner}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <rect x="3" y="5" width="18" height="16" rx="2" />
                  <path d="M3 10h18M8 3v4M16 3v4" />
                </svg>
                book a pilot
              </span>
            </button>
            </Magnetic>
            <button type="button" className={s.burger} aria-label="Menu" aria-expanded={mobileOpen} aria-controls="mobile-nav-panel" onClick={() => setMobileOpen((v) => !v)}>
              <span className={`${s.line} ${mobileOpen ? s.l1 : ""}`} style={{ transform: mobileOpen ? undefined : "translateY(-6px)" }} />
              <span className={`${s.line} ${mobileOpen ? s.l2 : ""}`} />
              <span className={`${s.line} ${mobileOpen ? s.l3 : ""}`} style={{ transform: mobileOpen ? undefined : "translateY(6px)" }} />
            </button>
          </div>
        </nav>

        <div id="mobile-nav-panel" ref={mobilePanel} className={s.mobilePanel} style={{ height: 0 }}>
          <ul className={s.mobileList}>
            {nav.map((item) => (
              <li key={item.label} data-mobile-item>
                <a href={item.href} className={s.mobileItem} onClick={(e) => onLink(e, item.href)}>
                  {item.label}
                </a>
              </li>
            ))}
            <li data-mobile-item>
              <button type="button" className={`${s.mobileItem} text-accent`} onClick={() => (setMobileOpen(false), openEnquiry({ preset: "pilot" }))}>
                Book a 60-day pilot →
              </button>
            </li>
          </ul>
        </div>
      </div>

      {/* ---------- THE GROUP ---------- */}
      <div
        ref={(el) => void (panels.current.group = el)}
        className={s.mega}
        onMouseEnter={() => clearTimeout(closeTimer.current)}
        role="menu"
        aria-hidden={open !== "group"}
      >
        <div className={s.megaInner}>
          <div className={s.megaHead}>
            <span className={s.eyebrow}>the group · five entities</span>
            <a href="#group" className={s.megaLink} onClick={(e) => onLink(e, "#what-we-do")}>
              how they work together <Arrow />
            </a>
          </div>
          <div className={s.groupGrid}>
            {entities.map((e) => (
              <a
                key={e.name}
                data-mega-item
                href={e.href}
                target={e.href.startsWith("http") ? "_blank" : undefined}
                rel={e.href.startsWith("http") ? "noopener noreferrer" : undefined}
                onClick={(ev) => onLink(ev, e.href)}
                className={`${s.card} ${e.star ? s.candle : ""}`}
              >
                <span className={s.cardText}>
                  <span className={s.cardKind}>{e.kind}</span>
                  <span className={s.cardName}>
                    {e.name}
                    {e.star && <span className={`ai-star ${s.star}`}>✦</span>}
                  </span>
                  <span className={s.cardTag}>{e.text}</span>
                  <span className={s.cardMetric}>{e.metric}</span>
                </span>
                <EntityTile letter={e.letter} name={e.name} />
              </a>
            ))}
          </div>
          <div className={s.megaFoot}>
            <span className={s.eyebrow}>
              <span className="ai-star">✦</span> one contract · one governance standard · one delivery backbone
            </span>
            <span className={s.footNote}>Each entity keeps its specialism. All five coordinate as a single partner: one programme, four handovers removed.</span>
          </div>
        </div>
      </div>

      {/* ---------- ADVANTAGE ---------- */}
      <div ref={(el) => void (panels.current.advantage = el)} className={s.mega} onMouseEnter={() => clearTimeout(closeTimer.current)} role="menu" aria-hidden={open !== "advantage"}>
        <div className={`${s.megaInner} ${s.megaInnerTall}`}>
          <span className={s.eyebrow}>the one group advantage</span>
          <div className={s.advGrid}>
            {[cards.filter((c) => c.meta === "Advantage"), cards.filter((c) => c.meta === "Enterprise")].map((col, ci) => (
              <ul key={ci} className={s.advList}>
                <li className={s.advTitle}>{ci === 0 ? "manifesto" : "enterprise & government"}</li>
                {col.map((c) => (
                  <li key={c.title}>
                    <a data-mega-item href="#advantage" className={s.advLink} onClick={(e) => onLink(e, "#advantage")}>
                      <span className={s.advChip}>{c.chip}</span>
                      {c.title}
                    </a>
                  </li>
                ))}
              </ul>
            ))}
            <div data-mega-item className={s.promo}>
              <span className={s.promoHead}>
                <span className={s.promoDot} />
                enterprise & government
              </span>
              <p className={s.promoText}>
                Enterprise procurement teams and public sector buyers share one problem: too many vendors, too many handovers, no single point of accountability.
              </p>
              <button type="button" className={s.megaLink} onClick={() => (setOpen(null), openEnquiry({ preset: "gov" }))}>
                discuss a mandate <Arrow />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ---------- ENGAGE ---------- */}
      <div ref={(el) => void (panels.current.engage = el)} className={`${s.mega} ${s.megaNarrow}`} onMouseEnter={() => clearTimeout(closeTimer.current)} role="menu" aria-hidden={open !== "engage"}>
        <div className={s.megaInnerEngage}>
          <span className={s.eyebrow}>engagement models · sized to the commitment you want to make first</span>
          <div className={s.engageGrid}>
            {engagements.map((m, i) => (
              <button
                type="button"
                key={m.name}
                data-mega-item
                className={s.engageCard}
                onClick={() => (setOpen(null), openEnquiry({ preset: i === 0 ? "pilot" : "general", note: m.name }))}
              >
                <span className={s.engageCover} aria-hidden>
                  <span className={s.engageLine} />
                  <span className={s.engageNum}>{String(i + 1).padStart(2, "0")}</span>
                  <SlotImage src={`/images/engage/${slug(m.name)}.webp`} className={s.slotImg} />
                </span>
                <span className={s.engageBody}>
                  <span className={s.cardName}>
                    {m.name}
                    {m.star && <span className={`ai-star ${s.star}`}>✦</span>}
                  </span>
                  <span className={s.cardTag}>{m.tag}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
