"use client";

import * as React from "react";
import { Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  COLORS,
  PATTERNS,
  SLOTS,
  SLOT_MAP,
  TEXTURES,
  TYPES_BY_SLOT,
  TYPE_MAP,
} from "@/db/seed/references";
import { db } from "@/db/db";
import type { Item, ItemColor, Pattern, Slot, Texture } from "@/db/types";
import { SLOT_EMOJI, itemName } from "@/features/items/itemView";
import { ItemPhoto } from "@/features/wardrobe/ItemPhoto";
import { cn } from "@/lib/utils";

export interface EditItemSheetProps {
  item: Item;
  onClose: () => void;
}

interface FormState {
  label: string;
  slot: Slot;
  type: string;
  color: ItemColor;
  pattern: Pattern;
  texture: Texture;
  isSaving: boolean;
  error: string | null;
}

function initialForm(item: Item): FormState {
  return {
    label: item.label ?? "",
    slot: item.slot,
    type: item.type,
    color: item.color,
    pattern: item.pattern,
    texture: item.texture,
    isSaving: false,
    error: null,
  };
}

/**
 * Редактирование вещи. За основу взята форма добавления: те же группы полей,
 * но без фото (снимок не меняем) и с текущими значениями вещи.
 */
export function EditItemSheet({ item, onClose }: EditItemSheetProps) {
  const [form, setForm] = React.useState<FormState>(() => initialForm(item));
  const titleId = React.useId();

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !form.isSaving) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [form.isSaving, onClose]);

  React.useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((state) => ({ ...state, [key]: value, error: null }));

  const handleSlot = (slot: Slot) => {
    setForm((state) => ({
      ...state,
      slot,
      // Тип из другого раздела не подходит: предлагаем первый тип этого
      // раздела, а точный можно выбрать ниже.
      type:
        TYPE_MAP[state.type]?.slot === slot
          ? state.type
          : (TYPES_BY_SLOT[slot][0]?.id ?? "unknown"),
      error: null,
    }));
  };

  const canSave = !form.isSaving;

  const handleSave = async () => {
    if (!canSave) return;
    setForm((state) => ({ ...state, isSaving: true, error: null }));
    try {
      const label = form.label.trim();
      await db.items.put({
        ...item,
        label: label || undefined,
        slot: form.slot,
        type: form.type,
        color: form.color,
        pattern: form.pattern,
        texture: form.texture,
        updatedAt: Date.now(),
      });
      onClose();
    } catch (err) {
      setForm((state) => ({
        ...state,
        isSaving: false,
        error:
          err instanceof Error ? err.message : "Не удалось сохранить вещь",
      }));
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !form.isSaving) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-card shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-center justify-between gap-3 px-5 pt-5">
          <div className="min-w-0">
            <h2 id={titleId} className="truncate text-xl font-semibold">
              Изменить вещь
            </h2>
            <p className="truncate text-xs text-muted-foreground">
              {itemName(item)} · {SLOT_MAP[form.slot].label}
            </p>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="shrink-0 rounded-full"
            onClick={onClose}
            disabled={form.isSaving}
            aria-label="Закрыть"
          >
            <X className="size-4" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="relative size-20 shrink-0 overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800">
              <ItemPhoto item={item} className="h-full w-full object-cover" />
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Фото остаётся прежним. Меняются название, раздел, цвет, узор и
              ткань — подбор образа сразу учтёт правки.
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="item-label" className="text-sm font-medium">
              Название
            </label>
            <input
              id="item-label"
              autoFocus
              value={form.label}
              maxLength={80}
              disabled={form.isSaving}
              onChange={(event) => setField("label", event.target.value)}
              placeholder="Например: любимый тренч"
              className="h-10 w-full rounded-xl border border-border bg-transparent px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <p className="text-xs text-muted-foreground">
              Если оставить пустым, покажем тип вещи.
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Раздел</p>
            <div className="grid grid-cols-3 gap-2">
              {SLOTS.map((slot) => {
                const isSelected = form.slot === slot.id;
                return (
                  <button
                    key={slot.id}
                    type="button"
                    aria-label={slot.label}
                    aria-pressed={isSelected}
                    onClick={() => handleSlot(slot.id)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-2xl border px-2 py-2.5 text-xs transition",
                      isSelected
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40",
                    )}
                  >
                    <span className="text-xl leading-none" aria-hidden>
                      {SLOT_EMOJI[slot.id]}
                    </span>
                    <span className="text-center font-medium leading-tight">
                      {slot.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Тип</p>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                aria-pressed={form.type === "unknown"}
                onClick={() => setField("type", "unknown")}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                  form.type === "unknown"
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border text-muted-foreground hover:border-primary/40",
                )}
              >
                Не указан
              </button>
              {TYPES_BY_SLOT[form.slot].map((type) => {
                const isSelected = form.type === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setField("type", type.id)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                      isSelected
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border text-muted-foreground hover:border-primary/40",
                    )}
                  >
                    {type.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Цвет</p>
            <div className="flex flex-wrap gap-1.5">
              {COLORS.map((color) => {
                const isSelected = form.color.family === color.family;
                return (
                  <button
                    key={color.family}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setField("color", color)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs transition",
                      isSelected
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border text-muted-foreground hover:border-primary/40",
                    )}
                  >
                    <span
                      className="size-3.5 rounded-full border border-border"
                      style={{ backgroundColor: color.hex }}
                      aria-hidden
                    />
                    {color.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Узор</p>
            <div className="flex flex-wrap gap-1.5">
              {PATTERNS.map((pattern) => {
                const isSelected = form.pattern === pattern.id;
                return (
                  <button
                    key={pattern.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setField("pattern", pattern.id)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                      isSelected
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border text-muted-foreground hover:border-primary/40",
                    )}
                  >
                    {pattern.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Ткань</p>
            <div className="grid grid-cols-3 gap-1.5">
              {TEXTURES.map((texture) => {
                const isSelected = form.texture === texture.id;
                return (
                  <button
                    key={texture.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setField("texture", texture.id)}
                    className={cn(
                      "rounded-xl border px-1.5 py-2 text-xs transition",
                      isSelected
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border text-muted-foreground hover:border-primary/40",
                    )}
                  >
                    {texture.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-2 border-t border-border/60 bg-card px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3">
          {form.error ? (
            <p role="alert" className="text-sm text-destructive">
              {form.error}
            </p>
          ) : null}

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="rounded-full"
              onClick={onClose}
              disabled={form.isSaving}
            >
              Отмена
            </Button>
            <Button
              className="rounded-full"
              onClick={() => void handleSave()}
              disabled={!canSave}
            >
              {form.isSaving ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Сохраняем…
                </>
              ) : (
                "Сохранить"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
