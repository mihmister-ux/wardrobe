"use client";

import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";

export interface RevealProps extends HTMLMotionProps<"div"> {
  /** Задержка появления, сек: для лесенки карточек. */
  delay?: number;
}

/**
 * Появление карточки: лёгкий подъём и проявление. При `prefers-reduced-motion`
 * сразу показывает контент без анимации.
 */
export function Reveal({ delay = 0, children, ...rest }: RevealProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.35, delay, ease: [0.22, 1, 0.36, 1] }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
