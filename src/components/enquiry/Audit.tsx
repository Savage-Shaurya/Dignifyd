"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { gsap, SplitText, ScrollTrigger, prefersReducedMotion } from "@/lib/gsap";
import { audit, entityByKey, brand, type EntityKey } from "@/content/site";
import { scramble } from "@/lib/scramble";
import { startSwarm } from "../method/particleSweep";
import DotBlob from "../DotBlob";
import Aurora, { type AuroraProps } from "./Aurora";
import PromptBox from "./PromptBox";
import { onEnquiry } from "./bus";
import s from "./enquiry.module.css";

type Step = "idle" | "name" | "org" | "match" | "contact" | "ready";
type Pain = { text: string; key: EntityKey };

const AURORA_BASE: Omit<AuroraProps, "originY" | "bandHalfWidth" | "frequency" | "opacity"> = {
  colorStops: ["#5c0618", "#ee1a43", "#5c0618"],
  amplitude: 0.9,
  blend: 0.55,
  speed: 1.68,
  verticalScale: 2,
  verticalOffset: 0,
};
const AURORA_BY_STEP: Record<Step, Pick<AuroraProps, "originY" | "bandHalfWidth" | "frequency" | "opacity">> = {
  idle: { originY: 0.5, bandHalfWidth: 0.2, frequency: 2, opacity: 0 },
  name: { originY: 0.5, bandHalfWidth: 0.2, frequency: 2, opacity: 1 },
  org: { originY: 0.5, bandHalfWidth: 0.2, frequency: 2, opacity: 1 },
  match: { originY: 0.5, bandHalfWidth: 0.42, frequency: 2.4, opacity: 1 },
  contact: { originY: 0.5, bandHalfWidth: 0.2, frequency: 2, opacity: 1 },
  ready: { originY: 0.5, bandHalfWidth: 0.42, frequency: 2.4, opacity: 1 },
};

function matchKey(text: string): EntityKey {
  const t = text.toLowerCase();
  const rules: [EntityKey, RegExp][] = [
    ["pilot", /pilot|60.?day|trial/],
    ["gov", /gov|public|sector|council|state|ministry|citizen/],
    ["talent", /hire|hiring|talent|recruit|staff|team|people|leadership|gcc|workforce|search/],
    ["data", /data|\bai\b|ml|machine|analytic|decision|model|insight/],
    ["erp", /erp|sap|oracle|infra|architecture|enterprise|migration/],
    ["digital", /brand|market|demand|creative|campaign|digital|seo|content/],
    ["tech", /cloud|app|software|platform|website|web|mobile|it\b|managed|build|devops/],
  ];
  return rules.find(([, re]) => re.test(t))?.[0] ?? "general";
}

/* ---------------- chips field ---------------- */

type Chip = { id: number; label: string; key: EntityKey; x: number; y: number; phase: "entering" | "visible" | "exiting" };

function useChipConfig() {
  const [cfg, setCfg] = useState<null | { bands: { top: [number, number]; bottom: [number, number] }; excl: [number, number, number, number]; slots: number }>(null);
  useEffect(() => {
    const pick = () => {
      if (window.matchMedia("(min-width: 1024px)").matches) setCfg({ bands: { top: [27, 50], bottom: [56, 94] }, excl: [22, 78, 4, 56], slots: 9 });
      else if (window.matchMedia("(min-width: 768px)").matches) setCfg({ bands: { top: [60, 75], bottom: [78, 94] }, excl: [10, 90, 0, 60], slots: 5 });
      else setCfg(null);
    };
    pick();
    window.addEventListener("resize", pick);
    return () => window.removeEventListener("resize", pick);
  }, []);
  return cfg;
}

function ChipLabel({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    return scramble(ref.current, text, { stagger: 22, cycles: 10, cycleMs: 45 });
  }, [text]);
  return (
    <span ref={ref} aria-label={text}>
      {text}
    </span>
  );
}

/* ---------------- main ---------------- */

export default function Audit() {
  const section = useRef<HTMLElement>(null);
  const stack = useRef<HTMLDivElement>(null);
  const eyebrow = useRef<HTMLSpanElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const sub = useRef<HTMLParagraphElement>(null);
  const live = useRef<HTMLDivElement>(null);
  const liveWord = useRef<HTMLSpanElement>(null);
  const form = useRef<HTMLDivElement>(null);
  const chipsLayer = useRef<HTMLDivElement>(null);
  const swarmCanvas = useRef<HTMLCanvasElement>(null);

  const [step, setStep] = useState<Step>("idle");
  const [pain, setPain] = useState<Pain | null>(null);
  const [free, setFree] = useState("");
  const [name, setName] = useState("");
  const [org, setOrg] = useState("");
  const [email, setEmail] = useState("");
  const [outcome, setOutcome] = useState("");
  const [chipsOn, setChipsOn] = useState(false);
  const [chips, setChips] = useState<Chip[]>([]);
  const frozen = useRef(false);
  const busy = useRef(false);
  const cfg = useChipConfig();

  /* --- section fade + entrance timeline (replays on enter / enter-back) --- */
  useEffect(() => {
    const sec = section.current;
    if (!sec) return;
    const els = [eyebrow.current, title.current, sub.current, live.current, form.current];
    if (els.some((e) => !e)) return;
    if (prefersReducedMotion()) {
      setChipsOn(true);
      return;
    }
    const ctx = gsap.context(() => {
      gsap.set(sec, { opacity: 0 });
      gsap.to(sec, { opacity: 1, ease: "power1.out", duration: 1, scrollTrigger: { trigger: sec, start: "top bottom", end: "top 60%", scrub: 0.5 } });
      const tSplit = SplitText.create(title.current!, { type: "words", wordsClass: "split-word" });
      const sSplit = SplitText.create(sub.current!, { type: "words", wordsClass: "split-word" });
      let tl: gsap.core.Timeline | null = null;
      let enabledOnce = false;
      const reset = () => {
        gsap.set([...tSplit.words, ...sSplit.words], { opacity: 0, filter: "blur(10px)", display: "inline-block" });
        gsap.set([eyebrow.current, live.current, form.current], { autoAlpha: 0, y: 16 });
      };
      reset();
      const play = () => {
        if (frozen.current) return;
        tl?.kill();
        reset();
        tl = gsap.timeline();
        tl.to(eyebrow.current, { autoAlpha: 1, y: 0, duration: 0.9, ease: "expo.out" }, 0);
        tl.call(() => void scramble(eyebrow.current!, `[ ${audit.label} ]`), undefined, 0);
        tl.to(tSplit.words, { opacity: 1, filter: "blur(0px)", duration: 1.2, ease: "expo.out", stagger: { amount: 1.2, from: "start" } }, 0);
        tl.to(sSplit.words, { opacity: 1, filter: "blur(0px)", duration: 1.2, ease: "expo.out", stagger: { amount: 1.2, from: "start" } }, 1.2);
        tl.to(live.current, { autoAlpha: 1, y: 0, duration: 0.9, ease: "expo.out" }, 2);
        tl.call(() => void (liveWord.current && scramble(liveWord.current, "live", { stagger: 45 })), undefined, 2);
        tl.to(form.current, { autoAlpha: 1, y: 0, duration: 0.6, ease: "expo.out" }, 2.2);
        if (!enabledOnce)
          tl.call(
            () => {
              enabledOnce = true;
              setChipsOn(true);
            },
            undefined,
            2.8
          );
      };
      ScrollTrigger.create({ trigger: sec, start: "top 80%", onEnter: play, onEnterBack: play });
      return () => {
        tl?.kill();
        tSplit.revert();
        sSplit.revert();
      };
    }, sec);
    return () => ctx.revert();
  }, []);

  /* --- chip spawner --- */
  useEffect(() => {
    if (!chipsOn || !cfg || step !== "idle") return;
    frozen.current = false;
    const timers: number[] = [];
    let counter = 0;
    let idSeq = 0;
    let live: Chip[] = [];
    const commit = () => setChips([...live]);
    const spawn = () => {
      if (frozen.current) return;
      const c = audit.chips[counter++ % audit.chips.length];
      let best: { x: number; y: number } | null = null;
      let bestD = -1;
      for (let i = 0; i < 12; i++) {
        const x = 8 + 84 * Math.random();
        const band = Math.random() < 0.5 ? cfg.bands.top : cfg.bands.bottom;
        const y = band[0] + Math.random() * (band[1] - band[0]);
        const [x1, x2, y1, y2] = cfg.excl;
        if (x > x1 && x < x2 && y > y1 && y < y2) continue;
        const d = live.length ? Math.min(...live.map((o) => Math.hypot(o.x - x, (o.y - y) * 2.5))) : Infinity;
        if (d > bestD) {
          bestD = d;
          best = { x, y };
        }
      }
      const pos = best ?? { x: 12, y: cfg.bands.top[0] };
      const chip: Chip = { id: idSeq++, label: c.label, key: c.key, ...pos, phase: "entering" };
      live = [...live, chip];
      commit();
      timers.push(
        window.setTimeout(() => {
          live = live.map((o) => (o.id === chip.id ? { ...o, phase: "visible" } : o));
          commit();
        }, 50)
      );
      timers.push(
        window.setTimeout(() => {
          if (frozen.current) return;
          live = live.map((o) => (o.id === chip.id ? { ...o, phase: "exiting" } : o));
          commit();
          timers.push(
            window.setTimeout(() => {
              if (frozen.current) return;
              live = live.filter((o) => o.id !== chip.id);
              commit();
              timers.push(window.setTimeout(spawn, 100 + 600 * Math.random()));
            }, 600)
          );
        }, 7000 + 4000 * Math.random())
      );
    };
    [400, 900, 1400, 1900, 2400, 2900, 3400, 3900, 4400].slice(0, cfg.slots).forEach((d) => timers.push(window.setTimeout(spawn, d)));
    return () => {
      timers.forEach(clearTimeout);
      live = [];
      setChips([]);
    };
  }, [chipsOn, cfg, step]);

  /* --- swarm in the name step --- */
  useEffect(() => {
    if (step !== "name" || !swarmCanvas.current || prefersReducedMotion()) return;
    return startSwarm(swarmCanvas.current, "#F5F5F5", "swarm");
  }, [step]);

  const scrollToTop = useCallback(() => {
    setTimeout(() => section.current?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" }), 80);
  }, []);

  const begin = useCallback(
    (p: Pain, chipEl?: HTMLElement) => {
      if (busy.current || step !== "idle") return;
      busy.current = true;
      frozen.current = true;
      const others = chipsLayer.current?.querySelectorAll("[data-keyword]:not([data-clicked])") ?? [];
      const done = () => {
        busy.current = false;
        setPain(p);
        setStep("name");
        scrollToTop();
      };
      if (prefersReducedMotion()) return done();
      const tl = gsap.timeline({ onComplete: done });
      if (chipEl) {
        chipEl.dataset.clicked = "";
        const r = chipEl.getBoundingClientRect();
        const secTop = section.current!.getBoundingClientRect().top;
        const dx = window.innerWidth / 2 - (r.left + r.width / 2);
        const dy = secTop + 90 - (r.top + r.height / 2);
        gsap.set(chipEl, { zIndex: 30 });
        tl.to(chipEl, { scale: 1.15, duration: 0.2, ease: "expo.out" }, 0);
        tl.to(chipEl, { scale: 1, duration: 0.2, ease: "expo.out" }, 0.2);
        tl.to(others, { opacity: 0.15, duration: 0.4, ease: "power2.out" }, 0);
        tl.to(chipEl, { x: dx, y: dy, scale: 20 / 15, duration: 0.7, ease: "expo.inOut" }, 0.4);
        tl.to(others, { opacity: 0, duration: 0.5, ease: "power3.in" }, 0.4);
        tl.to(stack.current, { opacity: 0, y: -30, duration: 0.5, ease: "power3.in" }, 0.4);
      } else {
        tl.to(chipsLayer.current?.querySelectorAll("[data-keyword]") ?? [], { opacity: 0, duration: 0.4, ease: "power3.in" }, 0);
        tl.to(stack.current, { opacity: 0, y: -30, duration: 0.5, ease: "power3.in" }, 0.1);
      }
    },
    [step, scrollToTop]
  );

  // Navbar / footer CTAs jump straight into the flow.
  useEffect(
    () =>
      onEnquiry(({ preset, note }) => {
        const key = (preset as EntityKey) || "general";
        const text = note ? note : audit.presets[preset ?? "general"] ?? audit.presets.general;
        const el = section.current;
        if (!el) return;
        if (step !== "idle") {
          setPain({ text, key: entityByKey[key] ? key : "general" });
          el.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }
        el.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
        window.setTimeout(() => begin({ text, key: entityByKey[key] ? key : "general" }), 900);
      }),
    [begin, step]
  );

  const reset = () => {
    setStep("idle");
    setPain(null);
    setFree("");
    gsap.set(stack.current, { opacity: 1, y: 0 });
  };

  const entity = pain ? entityByKey[pain.key] : null;
  const mailto = (() => {
    const subject = `Enquiry: ${pain?.text ?? "general"}${org ? ` · ${org}` : ""}`;
    const body = [
      `Name: ${name}`,
      `Organisation: ${org}`,
      `Work email: ${email}`,
      `I'm interested in: ${entity?.name ?? "General enquiry"} (${pain?.text ?? ""})`,
      "",
      "What outcome do you need?",
      outcome,
    ].join("\n");
    return `mailto:${brand.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  })();
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const stepMotion = {
    initial: { opacity: 0, x: 120, filter: "blur(8px)" },
    animate: { opacity: 1, x: 0, filter: "blur(0px)", transition: { duration: 1, ease: [0.16, 1, 0.3, 1] as const } },
    exit: { opacity: 0, y: -20, filter: "blur(6px)", transition: { duration: 0.6, ease: [0.55, 0.055, 0.675, 0.19] as const } },
  };
  const line = (d: number) => ({
    initial: { opacity: 0, y: 14, filter: "blur(10px)" },
    animate: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 1.1, delay: d, ease: [0.16, 1, 0.3, 1] as const } },
  });

  return (
    <section ref={section} id="enquiry" data-section="2" className={s.section} aria-label="Enquiry">
      <div className={s.auroraLayer}>
        <Aurora {...AURORA_BASE} {...AURORA_BY_STEP[step]} />
      </div>
      {step === "name" && <canvas ref={swarmCanvas} className={s.swarm} aria-hidden />}

      {step !== "idle" && (
        <button type="button" className={s.cancel} onClick={reset}>
          <span className={s.cancelLine} />
          cancel
        </button>
      )}
      {pain && (step === "name" || step === "org" || step === "ready") && (
        <motion.div className={s.echo} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <p className={s.echoText}>
            {pain.text}
            <span className={s.echoMeta}>{entityByKey[pain.key].name.toLowerCase()} ↗</span>
          </p>
        </motion.div>
      )}

      <div className={s.inner}>
        {/* ---------- idle ---------- */}
        <div className={s.idle} style={{ display: step === "idle" ? undefined : "none" }}>
          <div ref={stack} className={s.stack}>
            <span ref={eyebrow} className={s.eyebrow}>
              [ {audit.label} ]
            </span>
            <h2 ref={title} className={`text-display-l ${s.title}`}>
              {audit.title}
            </h2>
            <p ref={sub} className={`text-body ${s.sub}`}>
              {audit.sub[0]}
              <br />
              {audit.sub[1]}
            </p>
            <div ref={live} className={s.live}>
              <span className={s.badge}>
                <span className={s.pulse}>
                  <span data-pulse-ring className={s.pulseDot} />
                  <span className={s.pulseDot} />
                </span>
                <span ref={liveWord}>live</span>
              </span>
              <p className={s.liveText}>
                <span className={s.liveNum}>{audit.live.value}</span>
                <span className={s.liveSep}>·</span>
                <span>{audit.live.label}</span>
              </p>
            </div>
            <div ref={form} className={s.formWrap}>
              <PromptBox
                label="What outcome do you need?"
                examples={audit.examples}
                value={free}
                onChange={setFree}
                onSubmit={() => {
                  const exact = audit.chips.find((c) => c.label.toLowerCase() === free.trim().toLowerCase());
                  begin({ text: free.trim(), key: exact?.key ?? matchKey(free) });
                }}
              />
            </div>
          </div>
          {cfg && (
            <div ref={chipsLayer} className={s.chips}>
              {chips.map((c) => (
                <div key={c.id} className={s.chipPos} style={{ left: `${c.x}%`, top: `${c.y}%` }}>
                <button
                  type="button"
                  data-keyword
                  data-cursor-hover
                  className={s.chip}
                  style={{ opacity: c.phase === "visible" ? 1 : 0 }}
                  onClick={(e) => begin({ text: c.label, key: c.key }, e.currentTarget)}
                >
                  <span className={s.chipInner}>
                    <ChipLabel text={c.label} />
                    <span className={s.chipMeta}>{entityByKey[c.key].name.toLowerCase()} ↗</span>
                  </span>
                </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ---------- funnel ---------- */}
        <AnimatePresence mode="wait">
          {step === "name" && pain && (
            <motion.div key="name" className={s.funnel} {...stepMotion}>
              <motion.p className={s.ack} {...line(0.3)}>
                one relationship starts here.
              </motion.p>
              <motion.p className={s.ack} {...line(0.9)}>
                {entity?.name} leads this: {entity?.line}
              </motion.p>
              <motion.p className={s.prompt} {...line(1.8)}>
                before we route it, what should we call you?
              </motion.p>
              <motion.div className={s.field} {...line(2.3)}>
                <PromptBox label="Your name" placeholder="your name *" value={name} onChange={setName} onSubmit={() => setStep("org")} autoFocus />
              </motion.div>
            </motion.div>
          )}

          {step === "org" && (
            <motion.div key="org" className={s.funnel} {...stepMotion}>
              <motion.p className={s.prompt} {...line(0.1)}>
                Nice to meet you, {name.trim().split(" ")[0]}. Where do you work?
              </motion.p>
              <motion.div className={s.fieldCol} {...line(0.5)}>
                <PromptBox label="Organisation" placeholder="company or department *" value={org} onChange={setOrg} onSubmit={() => setStep("match")} autoFocus />
              </motion.div>
              <motion.p className={s.reassure} {...line(0.8)}>
                Short enquiry form. Lands directly with the Group team.
              </motion.p>
            </motion.div>
          )}

          {step === "match" && pain && entity && (
            <motion.div key="match" className={s.match} {...stepMotion}>
              <motion.h3 className={`text-display-l ${s.greet}`} {...line(0.2)}>
                {name.trim().split(" ")[0]}
                <DotBlob accent />
              </motion.h3>
              <motion.p className={s.painref} {...line(0.8)}>
                about “{pain.text}”:
              </motion.p>
              <motion.p className={s.category} {...line(1.6)}>
                <strong className={s.entityName}>{entity.name}</strong> leads: {entity.line}
              </motion.p>
              <motion.div className={s.nodes} {...line(2.4)}>
                {entity.tags.map((t, i) => (
                  <motion.span
                    key={t}
                    className={s.node}
                    initial={{ opacity: 0, y: 12, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1, transition: { delay: 2.6 + i * 0.15, duration: 0.7, ease: [0.16, 1, 0.3, 1] } }}
                    whileHover={{ y: -3, borderColor: "rgba(238,26,67,.6)" }}
                  >
                    <span className={s.nodeDot} />
                    {t}
                  </motion.span>
                ))}
              </motion.div>
              <motion.div {...line(3.3)}>
                <motion.button type="button" className={s.btnSecondary} onClick={() => setStep("contact")} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  continue the enquiry
                  <span className="arrow-swap" aria-hidden>
                    <span>→</span>
                    <span>→</span>
                  </span>
                </motion.button>
              </motion.div>
            </motion.div>
          )}

          {step === "contact" && (
            <motion.div key="contact" className={s.funnel} {...stepMotion}>
              <motion.p className={`${s.promptBig}`} {...line(0.1)}>
                {name.trim().split(" ")[0]}, where should the reply go?
              </motion.p>
              <motion.div className={s.fieldCol} {...line(0.5)}>
                <PromptBox label="Work email" type="email" placeholder="you@organisation.com *" value={email} onChange={setEmail} showButton={false} valid={emailOk} autoFocus />
                <PromptBox
                  label="What outcome do you need?"
                  placeholder="A mandate, a platform, a programme. Tell us briefly. *"
                  value={outcome}
                  onChange={setOutcome}
                  valid={emailOk && outcome.trim().length > 0}
                  onSubmit={() => setStep("ready")}
                />
              </motion.div>
              <motion.p className={s.reassure} {...line(0.8)}>
                Tell us the outcome you need, and the right entity leads will respond.
              </motion.p>
            </motion.div>
          )}

          {step === "ready" && entity && (
            <motion.div key="ready" className={s.match} {...stepMotion}>
              <motion.span className={s.flash} initial={{ x: "-110%" }} animate={{ x: "110%", transition: { duration: 0.9, ease: [0.76, 0, 0.24, 1] } }} />
              <motion.h3 className={`text-display-l ${s.greet}`} initial={{ opacity: 0, scale: 0.96, filter: "blur(10px)" }} animate={{ opacity: 1, scale: 1, filter: "blur(0px)", transition: { delay: 0.15, duration: 1.4, ease: [0.16, 1, 0.3, 1] } }}>
                your enquiry is ready, {name.trim().split(" ")[0]}<DotBlob accent />
              </motion.h3>
              <motion.p className={s.painref} {...line(0.8)}>
                Send it and {entity.name} will respond at {email}.
              </motion.p>
              <motion.div className={s.cards} initial="h" animate="v" variants={{ v: { transition: { staggerChildren: 0.12, delayChildren: 1.5 } } }}>
                {[
                  { k: "lead entity", t: entity.name, d: entity.line },
                  { k: "start here", t: "Strategic Pilot", d: entityByKey.pilot.line },
                  { k: "one contract", t: "All five entities", d: "One relationship, one governance standard and one delivery backbone." },
                ].map((c) => (
                  <motion.div
                    key={c.k}
                    className={s.card}
                    variants={{ h: { opacity: 0, y: 18, filter: "blur(8px)" }, v: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } } }}
                    whileHover={{ y: -4 }}
                  >
                    <span className={s.cardKey}>{c.k}</span>
                    <span className={s.cardTitle}>{c.t}</span>
                    <span className={s.cardDesc}>{c.d}</span>
                  </motion.div>
                ))}
              </motion.div>
              <motion.div className={s.ctaRow} {...line(2.3)}>
                <motion.a href={mailto} className={s.btnAccent} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  send to {brand.email}
                </motion.a>
                <a href={brand.phoneHref} className={s.alt}>
                  or call {brand.phone}
                </a>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
