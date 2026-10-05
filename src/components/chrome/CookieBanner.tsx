"use client";

import { useEffect, useState } from "react";
import Flair from "./Flair";
import Magnetic from "../Magnetic";
import s from "./chrome.module.css";

const KEY = "dg_consent";
export const reopenConsent = () => window.dispatchEvent(new Event("dg:consent-open"));

export default function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let v: string | null = null;
    try {
      v = localStorage.getItem(KEY);
    } catch {}
    if (v !== "granted" && v !== "denied") setShow(true);
    const open = () => setShow(true);
    window.addEventListener("dg:consent-open", open);
    return () => window.removeEventListener("dg:consent-open", open);
  }, []);

  const decide = (v: "granted" | "denied") => {
    try {
      localStorage.setItem(KEY, v);
    } catch {}
    setShow(false);
  };

  if (!show) return null;
  return (
    <div role="dialog" aria-label="Cookie consent" className={s.cookie}>
      <div className={s.cookieCard}>
        <p className={s.cookieText}>
          We use analytics cookies to understand what helps you and what doesn&apos;t.{" "}
          <strong>You can change your mind anytime.</strong>
        </p>
        <div className={s.cookieActions}>
          <button type="button" className={s.reject} onClick={() => decide("denied")}>
            Reject
          </button>
          <Magnetic strength={0.18}>
          <button type="button" className={s.accept} onClick={() => decide("granted")}>
            <Flair className={s.acceptFlair} />
            <span className={s.acceptLabel}>Accept</span>
          </button>
          </Magnetic>
        </div>
      </div>
    </div>
  );
}
