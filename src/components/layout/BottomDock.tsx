 "use client";

import * as React from "react";
import { Home, LayoutGrid, Shirt, User } from "lucide-react";

import { cn } from "@/lib/utils";

export type DockTabId = "home" | "wardrobe" | "looks" | "profile";

export interface DockTab {
  id: DockTabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const DOCK_TABS: readonly DockTab[] = [
  { id: "home", label: "Главная", icon: Home },
  { id: "wardrobe", label: "Гардероб", icon: Shirt },
  { id: "looks", label: "Образы", icon: LayoutGrid },
  { id: "profile", label: "Профиль", icon: User },
];

export interface BottomDockProps {
  active?: DockTabId;
  onChange?: (id: DockTabId) => void;
  tabs?: readonly DockTab[];
  className?: string;
}

export function BottomDock({
  active = "home",
  onChange,
  tabs = DOCK_TABS,
  className,
}: BottomDockProps) {
  return (
    <nav aria-label="Основная навигация" className={cn("fixed inset-x-0 bottom-0 z-50", className)}>
      <div className="mx-auto w-full max-w-md px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-1 rounded-[26px] border border-border/60 bg-background/85 p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.12)] backdrop-blur-xl">
          {tabs.map(({ id, label, icon: Icon }) => {
            const isActive = id === active;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onChange?.(id)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex flex-1 flex-col items-center gap-0.5 rounded-[20px] px-1 py-2 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                <Icon className={cn("size-5 transition-transform", isActive && "scale-105")} />
                <span className="leading-none">{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

/** Отступ под фиксированный док: ставьте внизу любой страницы. */
export function DockSpacer({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("h-[calc(5.5rem+env(safe-area-inset-bottom))]", className)} />
  );
}
