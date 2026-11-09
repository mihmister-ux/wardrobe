"use client";

import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

import {
  DOCK_TABS,
  useActiveTab,
  type DockTab,
} from "@/components/layout/navigation";
import { cn } from "@/lib/utils";

export interface BottomDockProps {
  /** Открывает форму добавления вещи — центральная кнопка дока. */
  onAddItem?: () => void;
  tabs?: readonly DockTab[];
  className?: string;
}

/**
 * Нижний док для телефона: четыре вкладки и акцентная «+» по центру.
 * Кнопка выступает над полосой, поэтому перекрыть ею карточку уже нельзя.
 */
export function BottomDock({ onAddItem, tabs = DOCK_TABS, className }: BottomDockProps) {
  const navigate = useNavigate();
  const activeId = useActiveTab(tabs);

  const renderTab = ({ id, label, icon: Icon, path }: DockTab) => {
    const isActive = id === activeId;
    return (
      <button
        key={id}
        type="button"
        onClick={() => navigate(path)}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "flex flex-1 flex-col items-center gap-0.5 rounded-[20px] px-1 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isActive
            ? "bg-secondary text-foreground"
            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
        )}
      >
        <Icon className={cn("size-5 transition-transform", isActive && "scale-105 text-primary")} />
        <span className="leading-none">{label}</span>
      </button>
    );
  };

  return (
    <nav
      aria-label="Основная навигация"
      className={cn("fixed inset-x-0 bottom-0 z-50 md:hidden", className)}
    >
      <div className="mx-auto w-full max-w-md px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-1 rounded-[26px] border border-border/60 bg-background/80 p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.12)] backdrop-blur-xl">
          {tabs.slice(0, 2).map(renderTab)}

          <button
            type="button"
            onClick={onAddItem}
            aria-label="Добавить вещь"
            className="-mt-8 grid size-16 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/35 ring-4 ring-background/80 transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Plus className="size-7" strokeWidth={2.5} />
          </button>

          {tabs.slice(2).map(renderTab)}
        </div>
      </div>
    </nav>
  );
}

/** Отступ под фиксированный док: ставьте внизу любой страницы. */
export function DockSpacer({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("h-[calc(7rem+env(safe-area-inset-bottom))] md:hidden", className)}
    />
  );
}
