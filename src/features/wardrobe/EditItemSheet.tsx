"use client";

import * as React from "react";
import { Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  PATTERNS,
  SLOTS,
  SLOT_MAP,
  TEXTURES,
  TYPES_BY_SLOT,
  TYPE_MAP,
} from "@/db/seed/references";
import { db } from "@/db/db";
import type { ColorFamily, Item, Pattern, Slot, Texture } from "@/db/types";
import { ColorPicker } from "@/features/items/ColorPicker";
import { combineColors, itemColorFamilies } from "@/features/items/itemColors";
import { SeasonPicker } from "@/features/items/SeasonPicker";
import { SLOT_EMOJI, itemName } from "@/features/items/itemView";
import {
  mergeSeasonRanges,
  sameSeasons,
  seasonsForRange,
  type SeasonId,
} from "@/features/items/seasons";
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
  seasons: SeasonId[];
  primary: ColorFamily;
  secondary: ColorFamily | null;
  tertiary: ColorFamily | null;
  colorHint: string | null;
  pattern: Pattern;
  texture: Texture;
  isSaving: boolean;
  error: string | null;
}

function initialForm(item: Item): FormState {
  const colors = itemColorFamilies(item);
  return {
    label: item.label ?? "",
    slot: item.slot,
    type: item.type,
    seasons: seasonsForRange(item.tempMin, item.tempMax),
    primary: colors[0]!,
    secondary: colors[1] ?? null,
    tertiary: colors[2] ?? null,
    colorHint: null,
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

  // Исходный набор нужен, чтобы не сузить старый произвольный диапазон,
  // если пользователь меняет только название или цвет.
  const initialSeasons = React.useMemo(
    () => seasonsForRange(item.tempMin, item.tempMax),
    [item.tempMin, item.tempMax],
  );

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

  /** Основной цвет обязателен. Если он совпал с дополнительным или третьим — те убираем. */
  const handlePrimaryColor = (primary: ColorFamily | null) => {
    if (!primary) return;
    setForm((state) => {
      const secondary = state.secondary === primary ? null : state.secondary;
      const tertiary = state.tertiary === primary ? null : state.tertiary;
      const changed = secondary !== state.secondary || tertiary !== state.tertiary;
      return {
        ...state,
        primary,
        secondary,
        tertiary,
        colorHint: changed
          ? "Совпадавшие цвета пришлось убрать — они не могут повторять основной."
          : null,
        error: null,
      };
    });
  };

  const handleSecondaryColor = (secondary: ColorFamily | null) => {
    setForm((state) => {
      if (secondary && secondary === state.primary) {
        return {
          ...state,
          colorHint: "Дополнительный цвет не может совпадать с основным.",
          error: null,
        };
      }
      // Если новый дополнительный цвет совпал с уже выбранным третьим —
      // третий сбрасываем, чтобы не было двух одинаковых.
      const tertiary =
        secondary && state.tertiary === secondary ? null : state.tertiary;
      return {
        ...state,
        secondary,
        tertiary,
        colorHint:
          tertiary !== state.tertiary
            ? "Третий цвет совпадал с новым дополнительным — мы его убрали."
            : null,
        error: null,
      };
    });
  };

  const handleTertiaryColor = (tertiary: ColorFamily | null) => {
    setForm((state) => ({
      ...state,
      tertiary:
        tertiary && tertiary !== state.primary && tertiary !== state.secondary
          ? tertiary
          : null,
      colorHint:
        tertiary && (tertiary === state.primary || tertiary === state.secondary)
          ? "Третий цвет не может совпадать с уже выбранными."
          : null,
      error: null,
    }));
  };

  const canSave = !form.isSaving && form.seasons.length > 0;

  const handleSave = async () => {
    if (!canSave) return;
    const merged = mergeSeasonRanges(form.seasons);
    if (!merged) return;
    const seasonsChanged = !sameSeasons(form.seasons, initialSeasons);
    const range = seasonsChanged
      ? merged
      : {
          tempMin: item.tempMin,
          tempMax: item.tempMax,
          warmth: item.warmth,
        };

    setForm((state) => ({ ...state, isSaving: true, error: null }));
    try {
      const label = form.label.trim();
      await db.items.put({
        ...item,
        label: label || undefined,
        slot: form.slot,
        type: form.type,
        colors: combineColors(form.primary, form.secondary, form.tertiary),
        pattern: form.pattern,
        texture: form.texture,
        warmth: range.warmth,
        tempMin: range.tempMin,
        tempMax: range.tempMax,
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
              <ItemPhoto item={item} className="h-full w-full object-contain" />
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Фото остаётся прежним. Меняются название, раздел, сезоны, цвет,
              узор и ткань — подбор образа сразу учтёт правки.
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

          <SeasonPicker
            value={form.seasons}
            onChange={(seasons) => setField("seasons", seasons)}
            disabled={form.isSaving}
          />

          <div className="space-y-2">
            <p className="text-sm font-medium">Цвет</p>
            <div className="grid grid-cols-2 gap-2">
              <ColorPicker
                id="item-color-primary"
                label="Основной"
                value={form.primary}
                onChange={handlePrimaryColor}
                disabled={form.isSaving}
              />
              <ColorPicker
                id="item-color-secondary"
                label="Дополнительный"
                value={form.secondary}
                onChange={handleSecondaryColor}
                allowEmpty
                emptyLabel="Нет"
                exclude={[form.primary]}
                disabled={form.isSaving}
              />
              <ColorPicker
                id="item-color-tertiary"
                label="Третий цвет"
                value={form.tertiary}
                onChange={handleTertiaryColor}
                allowEmpty
                emptyLabel="Нет"
                exclude={
                  form.secondary
                    ? [form.primary, form.secondary]
                    : [form.primary]
                }
                disabled={form.isSaving}
              />
            </div>
            {form.colorHint ? (
              <p role="status" className="text-xs text-muted-foreground">
                {form.colorHint}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Второй и третий цвета нужны вещам с узором или отделкой: полоски,
                контрастные рукава, кант. Их можно не выбирать.
              </p>
            )}
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

          {form.seasons.length === 0 ? (
            <p role="alert" className="text-xs text-destructive">
              Выберите хотя бы один сезон.
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
