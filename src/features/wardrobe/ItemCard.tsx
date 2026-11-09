"use client";

import * as React from "react";
import { EyeOff, MoreVertical, RotateCcw, Trash2 } from "lucide-react";

import type { Item } from "@/db/types";
import { itemName, itemTypeLabel } from "@/features/items/itemView";
import { ItemPhoto } from "@/features/wardrobe/ItemPhoto";
import { cn } from "@/lib/utils";

export interface ItemCardProps {
  item: Item;
  isMenuOpen: boolean;
  isBusy: boolean;
  onMenuOpenChange: (open: boolean) => void;
  onArchiveToggle: () => void;
  onRequestDelete: () => void;
}

/**
 * Карточка вещи: фото, название, тип и меню с двумя действиями.
 * Убранная вещь остаётся в сетке, но приглушена и помечена «Убрано».
 */
export function ItemCard({
  item,
  isMenuOpen,
  isBusy,
  onMenuOpenChange,
  onArchiveToggle,
  onRequestDelete,
}: ItemCardProps) {
  const isArchived = item.status === "archived";
  const menuId = React.useId();

  // Escape закрывает меню — как и любой другой поповер.
  React.useEffect(() => {
    if (!isMenuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onMenuOpenChange(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isMenuOpen, onMenuOpenChange]);

  return (
    <article
      className={cn(
        "relative flex flex-col overflow-visible rounded-3xl border border-border/60 bg-card shadow-sm transition",
        isBusy && "opacity-60",
      )}
    >
      <div className="relative aspect-square overflow-hidden rounded-t-3xl bg-gradient-to-br from-muted to-secondary/70">
        <ItemPhoto item={item} dimmed={isArchived} />

        {isArchived ? (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-background/90 px-2 py-0.5 text-xs font-medium text-muted-foreground backdrop-blur">
            <EyeOff className="size-3" />
            Убрано
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-0.5 px-3 py-2.5">
        <p className="truncate text-sm font-medium leading-snug">{itemName(item)}</p>
        <p className="truncate text-xs text-muted-foreground">
          {itemTypeLabel(item)} · {item.color.label}
        </p>
      </div>

      <button
        type="button"
        aria-label={`Действия с вещью «${itemName(item)}»`}
        aria-haspopup="menu"
        aria-expanded={isMenuOpen}
        aria-controls={isMenuOpen ? menuId : undefined}
        onClick={() => onMenuOpenChange(!isMenuOpen)}
        className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-background/85 text-foreground shadow-sm backdrop-blur transition hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
      >
        <MoreVertical className="size-4" />
      </button>

      {isMenuOpen ? (
        <>
          {/* Клик по любому месту вне меню закрывает его. */}
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={() => onMenuOpenChange(false)}
            className="fixed inset-0 z-20 cursor-default"
          />

          <div
            id={menuId}
            role="menu"
            aria-label={`Действия: ${itemName(item)}`}
            className="absolute right-2 top-11 z-30 w-52 overflow-hidden rounded-2xl border border-border bg-card p-1 shadow-xl"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onMenuOpenChange(false);
                onArchiveToggle();
              }}
              className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm transition hover:bg-secondary focus-visible:outline-none focus-visible:bg-secondary"
            >
              {isArchived ? <RotateCcw className="size-4" /> : <EyeOff className="size-4" />}
              {isArchived ? "Вернуть в образы" : "Убрать из образов"}
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onMenuOpenChange(false);
                onRequestDelete();
              }}
              className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm text-destructive transition hover:bg-destructive/10 focus-visible:outline-none focus-visible:bg-destructive/10"
            >
              <Trash2 className="size-4" />
              Удалить навсегда
            </button>
          </div>
        </>
      ) : null}
    </article>
  );
}
