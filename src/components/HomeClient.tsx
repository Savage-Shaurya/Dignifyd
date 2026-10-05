"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import SmoothScroll from "./SmoothScroll";
import Hero from "./hero/Hero";
import Method from "./method/Method";
import InkReveal from "./method/InkReveal";
import Audit from "./enquiry/Audit";
import Footer from "./footer/Footer";
import Preloader, { shouldSkipIntro, INTRO_KEY } from "./chrome/Preloader";
import Navbar from "./chrome/Navbar";
import DotField from "./chrome/DotField";
import ScrollIndicator from "./chrome/ScrollIndicator";
import CentreBubble from "./chrome/CentreBubble";
import CookieBanner from "./chrome/CookieBanner";
import { ScrollTrigger } from "@/lib/gsap";

export default function HomeClient() {
  const [introDone, setIntroDone] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const [playIntro, setPlayIntro] = useState(false);
  const decided = useRef(false);

  useEffect(() => {
    if (decided.current) {
      /* already decided (dev double-invoke) */
    } else if (shouldSkipIntro()) {
      decided.current = true;
      setIntroDone(true);
      setShowOverlay(false);
    } else {
      decided.current = true;
      try {
        sessionStorage.setItem(INTRO_KEY, "1");
      } catch {}
      setPlayIntro(true);
    }
    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener("load", refresh);
    const t = setTimeout(refresh, 1200);
    document.fonts?.ready.then(refresh);
    return () => {
      window.removeEventListener("load", refresh);
      clearTimeout(t);
    };
  }, []);

  const finish = useCallback(() => {
    setIntroDone(true);
    setShowOverlay(false);
  }, []);

  return (
    <SmoothScroll>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <DotField />
      <Navbar revealed={introDone} />
      <ScrollIndicator enabled={introDone} />
      <div id="top" />
      <main id="main" data-home-main style={{ overflowX: "clip", visibility: introDone ? "visible" : "hidden" }}>
        <InkReveal hero={<Hero enabled={introDone} />} method={<Method />} />
        <Audit />
      </main>
      <Footer />
      <CentreBubble />
      <CookieBanner />
      {showOverlay && <Preloader onComplete={finish} play={playIntro} />}
    </SmoothScroll>
  );
}
