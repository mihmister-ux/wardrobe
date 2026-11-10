"use client";

import * as React from "react";

export interface PageHeaderProps {
  /** Надзаголовок: дата, раздел, контекст. */
  eyebrow: string;
  title: string;
  /** Правый слот: аватар, кнопка. */
  action?: React.ReactNode;
}

/**
 * «Стеклянная» шапка экрана в стиле iOS: полупрозрачная, с блюром,
 * прилипает к верху и пропускает контент под собой.
 */
export function PageHeader({ eyebrow, title, action }: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-30 -mx-4 -mt-5 mb-5 flex items-center justify-between gap-3 border-b border-border/50 bg-background/75 px-4 py-3 backdrop-blur-xl md:-mx-8 md:-mt-8 md:px-8">
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{eyebrow}</p>
        <h1 className="truncate font-serif text-xl font-semibold tracking-tight">{title}</h1>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
