"use client";

import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

/**
 * One global motion policy: every framer animation in the page defers to the
 * OS "reduce motion" setting. Transform/layout animations are dropped, while
 * simple opacity fades remain so content still appears.
 */
export default function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ ease: [0.16, 1, 0.3, 1] }}>
      {children}
    </MotionConfig>
  );
}
