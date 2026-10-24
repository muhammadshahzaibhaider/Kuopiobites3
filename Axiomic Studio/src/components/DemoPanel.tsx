"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import type { Demo } from "@/lib/data/demos";
import { cn } from "@/lib/cn";
import { Spark } from "./icons";

/**
 * UI-only demo shell: pick a sample, press run, watch mock output stream in.
 * Swap the timeout for a real fetch to your model endpoint when wiring it up.
 */
export default function DemoPanel({ demo }: { demo: Demo }) {
  const [input, setInput] = useState(demo.samples[0]);
  const [state, setState] = useState<"idle" | "running" | "done">("idle");
  const [visible, setVisible] = useState(0);

  const run = () => {
    if (!input.trim() || state === "running") return;
    setState("running");
    setVisible(0);
    demo.output.forEach((_, index) => {
      window.setTimeout(() => {
        setVisible(index + 1);
        if (index === demo.output.length - 1) setState("done");
      }, 420 * (index + 1));
    });
  };

  return (
    <div className="rounded-card border border-hairline bg-white/[0.02] p-4 sm:p-6">
      <div className="flex items-center justify-between gap-4 border-b border-hairline pb-4">
        <div className="flex items-center gap-2 text-xxs uppercase tracking-[0.2em] text-muted">
          <span
            aria-hidden
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: demo.accent }}
          />
          {demo.category} demo
        </div>
        <span className="rounded-full border border-hairline px-2.5 py-1 text-micro uppercase text-muted-dim">
          Simulated output
        </span>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {demo.samples.map((sample) => (
          <button
            key={sample}
            type="button"
            onClick={() => {
              setInput(sample);
              setState("idle");
              setVisible(0);
            }}
            className={cn(
              "rounded-full border px-3 py-1.5 text-left text-xxs transition-colors duration-200",
              input === sample
                ? "border-white/35 bg-white/10 text-fg"
                : "border-hairline text-muted hover:border-hairline-strong hover:text-fg",
            )}
          >
            {sample.length > 46 ? `${sample.slice(0, 46)}…` : sample}
          </button>
        ))}
      </div>

      <label htmlFor={`demo-input-${demo.slug}`} className="mt-5 block text-xxs uppercase tracking-[0.18em] text-muted-dim">
        Input
      </label>
      <textarea
        id={`demo-input-${demo.slug}`}
        rows={3}
        value={input}
        onChange={(event) => {
          setInput(event.target.value);
          setState("idle");
          setVisible(0);
        }}
        className="mt-2 w-full resize-y rounded-xl border border-hairline bg-ink/60 p-4 text-sm leading-relaxed text-fg transition-colors focus:border-white/35 focus:outline-none"
      />

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={run}
          disabled={state === "running" || !input.trim()}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-5 text-sm font-medium text-ink transition-transform duration-300 ease-expo hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-60"
        >
          <Spark className="h-3.5 w-3.5" />
          {state === "running" ? "Analysing…" : "Run demo"}
        </button>
        <p className="text-xxs text-muted-dim">
          Illustrative results — connect your own endpoint to go live.
        </p>
      </div>

      <div className="mt-6 border-t border-hairline pt-5" aria-live="polite">
        <p className="text-xxs uppercase tracking-[0.18em] text-muted-dim">Result</p>
        <dl className="mt-3 grid gap-2 sm:grid-cols-2">
          <AnimatePresence initial={false}>
            {demo.output.slice(0, visible).map((row) => (
              <motion.div
                key={row.label}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="rounded-xl border border-hairline bg-white/[0.02] px-4 py-3"
              >
                <dt className="text-xxs uppercase tracking-[0.16em] text-muted-dim">{row.label}</dt>
                <dd className="mt-1 text-sm text-fg" style={{ color: demo.accent }}>
                  {row.value}
                </dd>
              </motion.div>
            ))}
          </AnimatePresence>
        </dl>
        {visible === 0 ? (
          <p className="mt-3 text-sm text-muted">
            Press <span className="text-fg">Run demo</span> to see the shape of the output.
          </p>
        ) : null}
      </div>
    </div>
  );
}
