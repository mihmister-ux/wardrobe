"use client";

import * as React from "react";

/**
 * Императивный показ уведомления снизу по центру.
 * Никаких зависимостей — только React.
 */

interface ToastEvent {
  id: number;
  message: string;
}

type Listener = (event: ToastEvent) => void;

// Module-level pub/sub: `toast(message)` работает из любого компонента.
const listeners = new Set<Listener>();
let nextId = 0;

/** Показать тост на 2.6 секунды. */
export function toast(message: string): void {
  const id = ++nextId;
  for (const listener of listeners) listener({ id, message });
}

/** Контейнер для тостов. Монтировать один раз в корне приложения. */
export function Toaster() {
  const [toasts, setToasts] = React.useState<ToastEvent[]>([]);

  const remove = React.useCallback((id: number) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  React.useEffect(() => {
    const listener: Listener = (event) => {
      setToasts((current) => [...current, event]);
      window.setTimeout(() => remove(event.id), 2600);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, [remove]);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-20 z-[70] flex flex-col items-center gap-2 px-4 md:bottom-6"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className="animate-reveal rounded-full border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground shadow-lg"
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
