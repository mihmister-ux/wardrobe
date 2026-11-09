"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export interface RevealProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Задержка появления, сек: для лесенки карточек. */
  delay?: number;
}

/**
 * Появление карточки: лёгкий подъём и проявление.
 *
 * Это обычная CSS-анимация, а не motion-библиотека: анимация нужна ровно в
 * одном месте (главный экран), а framer-motion весил больше, чем весь
 * остальной код страницы. `prefers-reduced-motion` учтён в index.css.
 */
export function Reveal({ delay = 0, className, style, children, ...rest }: RevealProps) {
  return (
    <div
      className={cn("animate-reveal", className)}
      style={{ animationDelay: `${delay}s`, ...style }}
      {...rest}
    >
      {children}
    </div>
  );
}
