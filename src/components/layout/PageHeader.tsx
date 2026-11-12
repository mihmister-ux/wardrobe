"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export interface PageHeaderProps {
  /** Надзаголовок: дата, раздел, контекст. */
  eyebrow?: string;
  /**
   * Заголовок экрана. Не передавайте его, если крупный заголовок живёт
   * в теле страницы: тогда <h1> остаётся за ним, а не за шапкой.
   */
  title?: React.ReactNode;
  /** Доп. классы надзаголовка — например, mono-капс для даты на Главной. */
  eyebrowClassName?: string;
  /** Правый слот: аватар, кнопка. */
  action?: React.ReactNode;
}

/**
 * «Стеклянная» шапка экрана в стиле iOS: полупрозрачная, с блюром,
 * прилипает к верху и пропускает контент под собой.
 */
export function PageHeader({ eyebrow, title, eyebrowClassName, action }: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-30 -mx-4 -mt-5 mb-5 flex items-center justify-between gap-3 border-b border-border/50 bg-background/75 px-4 py-3 backdrop-blur-xl md:-mx-8 md:-mt-8 md:px-8">
      <div className="min-w-0">
        {eyebrow ? (
          <p className={cn("text-xs text-muted-foreground", eyebrowClassName)}>{eyebrow}</p>
        ) : null}
        {title ? (
          <h1 className="truncate font-serif text-xl font-semibold tracking-tight">{title}</h1>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
