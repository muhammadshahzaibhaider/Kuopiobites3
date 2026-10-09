"use client";
import { useRef, useState, type InputHTMLAttributes, type Ref } from "react";
import { cx } from "@/lib/format";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label?: string;
  /** Optional external ref so forms can move focus to the first error. */
  inputRef?: Ref<HTMLInputElement>;
};

/** Accessible, independent password visibility control used by customer forms. */
export default function PasswordInput({ className, label = "Password", autoComplete = "current-password", inputRef: externalRef, ...props }: Props) {
  const [visible, setVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const mergedRef = (el: HTMLInputElement | null) => {
    (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
    if (typeof externalRef === "function") externalRef(el);
    else if (externalRef) (externalRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
  };
  const toggle = () => {
    const input = inputRef.current;
    const start = input?.selectionStart ?? null;
    const end = input?.selectionEnd ?? null;
    setVisible((current) => !current);
    requestAnimationFrame(() => {
      if (!input || start === null || end === null) return;
      input.focus({ preventScroll: true });
      input.setSelectionRange(start, end);
    });
  };
  return (
    <span className="relative block">
      <input {...props} ref={mergedRef} type={visible ? "text" : "password"} autoComplete={autoComplete} aria-label={props["aria-label"] ?? label} className={cx("pr-14", className)} />
      <button type="button" onClick={toggle} aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`} aria-pressed={visible} title={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`} className="absolute right-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-xl text-cherry/60 transition hover:bg-cherry/10 hover:text-cherry focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          {visible ? <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" /><circle cx="12" cy="12" r="2.5" /></> : <><path d="m3 3 18 18" /><path d="M10.6 5.1A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a18.4 18.4 0 0 1-3.1 3.8M6.3 6.3C3.6 8.1 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 3.7-.7" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>}
        </svg>
      </button>
    </span>
  );
}
