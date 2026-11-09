"use client";

import * as React from "react";
import { Check, EyeOff, MoreVertical, RotateCcw, Trash2 } from "lucide-react";

import type { Item } from "@/db/types";
import { itemName, itemTypeLabel } from "@/features/items/itemView";
import { ItemPhoto } from "@/features/wardrobe/ItemPhoto";
import { cn } from "@/lib/utils";

export interface ItemCardProps {
  item: Item;
  isMenuOpen: boolean;
  isBusy: boolean;
  /** Режим массового выбора: клик отмечает вещь, а не открывает форму. */
  selectionMode?: boolean;
  isSelected?: boolean;
  onMenuOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onToggleSelect?: () => void;
  onArchiveToggle: () => void;
  onRequestDelete: () => void;
}

/**
 * Карточка вещи: фото на мягкой нейтральной подложке, название, тип и меню.
 * Светлая подложка карточки и белое «окно» фотографии отделяют вещь от фона,
 * а размытая тень заставляет её парить над страницей.
 */
export function ItemCard({
  item,
  isMenuOpen,
  isBusy,
  selectionMode = false,
  isSelected = false,
  onMenuOpenChange,
  onEdit,
  onToggleSelect,
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

  const name = itemName(item);
  const actionHint = selectionMode
    ? `${isSelected ? "Снять выделение с" : "Выделить"} «${name}»`
    : `Изменить вещь «${name}»`;
  const checkboxHint = isSelected
    ? `Снять отметку с «${name}»`
    : `Отметить «${name}»`;

  return (
    <article
      className={cn(
        "group relative flex flex-col rounded-3xl bg-slate-100 p-2.5 transition-[box-shadow,transform] duration-300 dark:bg-slate-800",
        isSelected
          ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
          : "shadow-[0_18px_40px_-30px_rgba(15,23,42,0.55)] hover:-translate-y-0.5 hover:shadow-[0_26px_48px_-28px_rgba(15,23,42,0.45)] dark:shadow-[0_18px_40px_-26px_rgba(0,0,0,0.9)] dark:hover:shadow-[0_26px_48px_-24px_rgba(0,0,0,0.95)]",
        isBusy && "opacity-60",
      )}
    >
      <button
        type="button"
        onClick={selectionMode ? onToggleSelect : onEdit}
        aria-label={actionHint}
        aria-pressed={selectionMode ? isSelected : undefined}
        className="flex flex-1 flex-col text-left focus-visible:outline-none"
      >
        {/* «Окно» фотографии: независимая подложка + своя тень. */}
        <span className="relative block overflow-hidden rounded-2xl bg-white shadow-[0_20px_35px_-22px_rgba(15,23,42,0.5)] transition-transform duration-500 ease-out group-hover:-translate-y-1 dark:bg-slate-900 dark:shadow-[0_20px_35px_-20px_rgba(0,0,0,0.9)]">
          <span className="block aspect-square">
            <ItemPhoto
              item={item}
              dimmed={isArchived}
              className="drop-shadow-[0_18px_14px_rgba(15,23,42,0.25)] transition-transform duration-700 ease-out group-hover:scale-[1.05] dark:drop-shadow-[0_18px_14px_rgba(0,0,0,0.65)]"
            />
          </span>
        </span>

        <span className="block px-1 pb-1 pt-2.5">
          <span className="block truncate text-sm font-medium leading-snug">
            {name}
          </span>
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
            {itemTypeLabel(item)} · {item.color.label}
          </span>
        </span>
      </button>

      {isArchived && !selectionMode ? (
        <span className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-background/90 px-2 py-0.5 text-[11px] font-medium text-muted-foreground shadow-sm backdrop-blur">
          <EyeOff className="size-3" />
          Убрано
        </span>
      ) : null}

      {selectionMode ? (
        <button
          type="button"
          role="checkbox"
          aria-checked={isSelected}
          aria-label={checkboxHint}
          onClick={onToggleSelect}
          className={cn(
            "absolute left-3 top-3 z-10 grid size-7 place-items-center rounded-full border-2 shadow-sm backdrop-blur transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            isSelected
              ? "border-primary bg-primary text-primary-foreground"
              : "border-white/80 bg-background/80 text-transparent hover:border-primary",
          )}
        >
          <Check className="size-4" strokeWidth={3} />
        </button>
      ) : (
        <button
          type="button"
          aria-label={`Действия с вещью «${name}»`}
          aria-haspopup="menu"
          aria-expanded={isMenuOpen}
          aria-controls={isMenuOpen ? menuId : undefined}
          onClick={() => onMenuOpenChange(!isMenuOpen)}
          className="absolute right-3 top-3 z-30 grid size-8 place-items-center rounded-full bg-background/85 text-foreground shadow-sm backdrop-blur transition hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
        >
          <MoreVertical className="size-4" />
        </button>
      )}

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
            aria-label={`Действия: ${name}`}
            className="absolute right-2 top-12 z-30 w-52 overflow-hidden rounded-2xl border border-border bg-card p-1 shadow-xl"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onMenuOpenChange(false);
                onEdit();
              }}
              className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm transition hover:bg-secondary focus-visible:bg-secondary focus-visible:outline-none"
            >
              Изменить
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onMenuOpenChange(false);
                onArchiveToggle();
              }}
              className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm transition hover:bg-secondary focus-visible:bg-secondary focus-visible:outline-none"
            >
              {isArchived ? (
                <RotateCcw className="size-4" />
              ) : (
                <EyeOff className="size-4" />
              )}
              {isArchived ? "Вернуть в образы" : "Убрать из образов"}
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onMenuOpenChange(false);
                onRequestDelete();
              }}
              className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm text-destructive transition hover:bg-destructive/10 focus-visible:bg-destructive/10 focus-visible:outline-none"
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
