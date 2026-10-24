"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  className?: string;
  /** Seconds to wait after the element enters the viewport. */
  delay?: number;
  /** Travel distance in px. */
  y?: number;
  once?: boolean;
};

/** Scroll-triggered fade-up used by every section (respects reduced motion). */
export function Reveal({ children, className, delay = 0, y = 26, once = true }: RevealProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: "-90px 0px -60px 0px" }}
      transition={{ duration: 0.75, delay }}
    >
      {children}
    </motion.div>
  );
}
