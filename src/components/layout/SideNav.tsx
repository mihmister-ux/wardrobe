"use client";

import { Plus, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { DOCK_TABS, useActiveTab, type DockTab } from "@/components/layout/navigation";
import { cn } from "@/lib/utils";

export interface SideNavProps {
  onAddItem?: () => void;
  tabs?: readonly DockTab[];
}

/**
 * Боковая панель для широких экранов: те же вкладки, что и в доке,
 * но вертикально, плюс «Добавить вещь» внизу.
 */
export function SideNav({ onAddItem, tabs = DOCK_TABS }: SideNavProps) {
  const navigate = useNavigate();
  const activeId = useActiveTab(tabs);

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-border/60 bg-background/75 backdrop-blur-xl md:flex">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
          <Sparkles className="size-4" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-tight">Wardrobe</p>
          <p className="text-xs text-muted-foreground">образ под погоду</p>
        </div>
      </div>

      <nav aria-label="Основная навигация" className="flex-1 space-y-1 px-3 py-2">
        <p className="px-2 pb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Разделы
        </p>

        {tabs.map(({ id, label, icon: Icon, path }) => {
          const isActive = id === activeId;
          return (
            <button
              key={id}
              type="button"
              onClick={() => navigate(path)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
              )}
            >
              <Icon className="size-4.5" />
              {label}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-border/60 p-3">
        <button
          type="button"
          onClick={onAddItem}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Plus className="size-4" />
          Добавить вещь
        </button>
        <p className="mt-2 px-1 text-xs leading-snug text-muted-foreground">
          Фото, тип, сезон — и вещь сразу в образе.
        </p>
      </div>
    </aside>
  );
}
