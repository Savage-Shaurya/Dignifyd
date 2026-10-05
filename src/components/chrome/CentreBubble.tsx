"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, prefersReducedMotion } from "@/lib/gsap";
import { footer } from "@/content/site";
import { nearestCentre } from "@/lib/visitor";
import { Flag } from "./Flags";
import s from "./chrome.module.css";

const TIP_KEY = "dg_centre_tip_seen";

// Left-edge bubble (the reference's language switcher): your nearest Dignifyd centre,
// other centres fan out below on hover.
export default function CentreBubble() {
  const wrap = useRef<HTMLDivElement>(null);
  const tip = useRef<HTMLSpanElement>(null);
  const [active, setActive] = useState(footer.offices[0]);
  const [time, setTime] = useState("");

  useEffect(() => {
    const near = nearestCentre();
    const office = footer.offices.find((o) => o.city === near.city);
    if (office) setActive(office);
  }, []);

  useEffect(() => {
    const tick = () =>
      setTime(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: active.tz }).format(new Date()));
    tick();
    const t = setInterval(tick, 15000);
    return () => clearInterval(t);
  }, [active]);

  useEffect(() => {
    const w = wrap.current;
    const t = tip.current;
    if (!w || !t) return;
    if (prefersReducedMotion()) {
      gsap.set(w, { autoAlpha: 1 });
      gsap.set(t, { autoAlpha: 0 });
      return;
    }
    gsap.set(t, { autoAlpha: 0, x: -10 });
    const tl = gsap.timeline({ delay: 1.5 });
    tl.fromTo(w, { x: -30, autoAlpha: 0, scale: 0.6, transformOrigin: "left center" }, { x: 0, autoAlpha: 1, scale: 1, duration: 0.7, ease: "back.out(1.8)" });
    let seen = false;
    try {
      seen = !!sessionStorage.getItem(TIP_KEY);
    } catch {}
    if (!seen)
      tl.to(t, { autoAlpha: 1, x: 0, duration: 0.5, ease: "back.out(2)" }, ">0.25")
        .to(t, { autoAlpha: 0, x: -6, duration: 0.35, ease: "power2.out" }, ">4")
        .add(() => {
          try {
            sessionStorage.setItem(TIP_KEY, "1");
          } catch {}
        });
    const group = w.parentElement!;
    const enter = () => gsap.to(t, { autoAlpha: 1, x: 0, duration: 0.4, ease: "back.out(2)", overwrite: "auto" });
    const leave = () => gsap.to(t, { autoAlpha: 0, x: -6, duration: 0.3, ease: "power2.out", overwrite: "auto" });
    group.addEventListener("mouseenter", enter);
    group.addEventListener("mouseleave", leave);
    group.addEventListener("focusin", enter);
    group.addEventListener("focusout", leave);
    return () => {
      tl.kill();
      group.removeEventListener("mouseenter", enter);
      group.removeEventListener("mouseleave", leave);
      group.removeEventListener("focusin", enter);
      group.removeEventListener("focusout", leave);
    };
  }, []);

  const others = footer.offices.filter((o) => o.city !== active.city);

  return (
    <div className={s.bubbleGroup} role="group" aria-label="Capability centres">
      <div ref={wrap} className={s.bubbleWrap} style={{ visibility: "hidden" }}>
        <button type="button" className={s.flagActive} aria-label={`${active.city} centre`}>
          <span className={s.flagInner}>
            <Flag code={active.code} />
          </span>
          <svg className={s.flagRing} viewBox="0 0 44 44" aria-hidden>
            <circle cx="22" cy="22" r="21" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="1" />
            <circle className={s.sparkRing} cx="22" cy="22" r="21" fill="none" pathLength={100} />
            <circle className={`${s.sparkRing} ${s.sparkRingMirror}`} cx="22" cy="22" r="21" fill="none" pathLength={100} />
          </svg>
        </button>
        <span ref={tip} className={s.tip}>
          <span className={s.tipDot} />
          {active.city} · {active.role} · {time}
        </span>
        <div className={s.flagFan}>
          {others.map((o) => (
            <button key={o.city} type="button" className={s.flagOther} onClick={() => setActive(o)} aria-label={`${o.city} centre`} title={o.city}>
              <span className={s.flagInner}>
                <Flag code={o.code} />
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
