"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import s from "./enquiry.module.css";

type Props = {
  placeholder?: string;
  examples?: string[];
  type?: string;
  value: string;
  onChange: (v: string) => void;
  onSubmit?: () => void;
  valid?: boolean;
  showButton?: boolean;
  autoFocus?: boolean;
  name?: string;
  label: string;
};

// Glass input with a circular → submit and an optional typewriter placeholder.
const PromptBox = forwardRef<HTMLInputElement, Props>(function PromptBox(
  { placeholder, examples, type = "text", value, onChange, onSubmit, valid, showButton = true, autoFocus, name, label },
  ref
) {
  const inner = useRef<HTMLInputElement | null>(null);
  const [ph, setPh] = useState(placeholder ?? examples?.[0] ?? "");
  const ok = valid ?? value.trim().length > 0;

  useEffect(() => {
    if (!examples?.length || value) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPh(examples[0]);
      return;
    }
    let idx = 0;
    let len = 0;
    let mode: "typing" | "holding" | "deleting" = "typing";
    let t: number;
    const step = () => {
      const full = examples[idx];
      if (mode === "typing") {
        len++;
        setPh(full.slice(0, len));
        if (len >= full.length) {
          mode = "holding";
          t = window.setTimeout(step, 1500);
          return;
        }
        t = window.setTimeout(step, 55 + 35 * Math.random());
      } else if (mode === "holding") {
        mode = "deleting";
        t = window.setTimeout(step, 24);
      } else {
        len--;
        setPh(full.slice(0, Math.max(0, len)));
        if (len <= 0) {
          idx = (idx + 1) % examples.length;
          mode = "typing";
          t = window.setTimeout(step, 280);
          return;
        }
        t = window.setTimeout(step, 24);
      }
    };
    t = window.setTimeout(step, 400);
    return () => clearTimeout(t);
  }, [examples, value]);

  return (
    <form
      className={s.box}
      onMouseDown={(e) => {
        if (!(e.target as HTMLElement).closest("button, input, a")) {
          e.preventDefault();
          inner.current?.focus();
        }
      }}
      onSubmit={(e) => {
        e.preventDefault();
        if (ok) onSubmit?.();
      }}
    >
      <input
        ref={(el) => {
          inner.current = el;
          if (typeof ref === "function") ref(el);
          else if (ref) ref.current = el;
        }}
        className={s.input}
        type={type}
        name={name}
        aria-label={label}
        placeholder={ph}
        value={value}
        autoFocus={autoFocus}
        spellCheck={false}
        autoComplete={type === "email" ? "email" : "off"}
        onChange={(e) => onChange(e.target.value)}
      />
      {showButton && (
        <button type="submit" className={`${s.go} ${ok ? s.goOn : ""}`} aria-label="Continue" disabled={!ok}>
          →
        </button>
      )}
    </form>
  );
});

export default PromptBox;
