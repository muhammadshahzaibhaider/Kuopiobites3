"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import type { Faq } from "@/lib/data/services";
import { cn } from "@/lib/cn";
import { Plus } from "./icons";

/** Accessible single-open FAQ list (button + aria-expanded + region). */
export default function FaqAccordion({ items }: { items: Faq[] }) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <ul className="divide-y divide-hairline border-y border-hairline">
      {items.map((item, index) => {
        const isOpen = open === index;
        const panelId = `faq-panel-${index}`;
        return (
          <li key={item.question}>
            <h3>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-6 py-6 text-left"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpen(isOpen ? null : index)}
              >
                <span
                  className={cn(
                    "text-base font-medium tracking-tight transition-colors duration-200 sm:text-lg",
                    isOpen ? "text-fg" : "text-white/75 hover:text-fg",
                  )}
                >
                  {item.question}
                </span>
                <span
                  aria-hidden
                  className={cn(
                    "grid h-8 w-8 shrink-0 place-items-center rounded-full border border-hairline text-muted transition-[transform,color,border-color] duration-300",
                    isOpen && "rotate-45 border-white/30 text-fg",
                  )}
                >
                  <Plus className="h-4 w-4" />
                </span>
              </button>
            </h3>
            <AnimatePresence initial={false}>
              {isOpen ? (
                <motion.div
                  id={panelId}
                  role="region"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <p className="max-w-2xl pb-6 text-sm leading-relaxed text-muted">{item.answer}</p>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </li>
        );
      })}
    </ul>
  );
}
