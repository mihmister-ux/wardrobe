import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Модальный диалог без Radix: простой оверлей с центрированной панелью.
 * Escape закрывает, клик по подложке закрывает, фокус-ловушка минимальна.
 */

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  /** Доступное имя диалога для скринридеров. */
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function Dialog({ open, onClose, title, children, className }: DialogProps) {
  const panelRef = React.useRef<HTMLDivElement>(null);

  // Escape закрывает — как любой другой поповер.
  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  // При открытии отдаём фокус панели, при закрытии возвращаем body.
  React.useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  if (!open) return null;

  // Портал в <body>: иначе `fixed inset-0` цепляется за ближайший containing
  // block. Например, «Инструкция» живёт внутри <aside> с backdrop-blur, а
  // backdrop-filter делает предка containing block'ом для fixed-потомков —
  // и диалог растягивался не на экран, а на 240px сайдбара.
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        aria-hidden
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/40 backdrop-blur-sm"
      />

      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn(
          "relative z-10 w-full max-w-md rounded-t-3xl border border-border bg-card p-5 shadow-2xl outline-none sm:rounded-3xl",
          className,
        )}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть"
          className="absolute right-3 top-3 grid size-8 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-4" />
        </button>
        {children}
      </div>
    </div>,
    document.body,
  );
}
