"use client";

/**
 * Сборка вариантов образа из вещей в базе.
 *
 * Правила простые и детерминированные: набор слотов → подходящие по погоде
 * вещи → комплексная оценка (палитра + погода + формальность) → сортировка
 * по баллу. «Другой образ» просто берёт следующий вариант из списка.
 */

import type { Item, Occasion, Slot } from "@/db/types";
import { assessPalette, type HarmonyId, type PalettePiece } from "@/generator/colors";
import { itemColors } from "@/features/items/itemColors";
import { itemName, itemTypeLabel } from "@/features/items/itemView";
import { scoreOutfit } from "@/features/home/scoreOutfit";
import type { Outfit as UiOutfit } from "@/features/home/HomePage";

/** Сколько вариантов держим в памяти под кнопку «другой образ». */
const MAX_VARIANTS = 12;

const GRADIENTS: Record<HarmonyId, string> = {
  monochrome: "from-stone-200 via-amber-100 to-orange-200",
  "monochrome-shades": "from-slate-300 via-slate-200 to-zinc-200",
  "neutral-accent": "from-zinc-200 via-rose-100 to-indigo-200",
  "neutral-only": "from-neutral-200 via-stone-100 to-zinc-200",
  analogous: "from-sky-200 via-teal-100 to-emerald-200",
  contrast: "from-amber-200 via-orange-100 to-rose-200",
  busy: "from-fuchsia-200 via-rose-200 to-amber-200",
  mixed: "from-sky-200 via-indigo-200 to-violet-200",
};

/** Короткое имя для заголовка образа: только тип, без цвета. */
function shortName(item: Item): string {
  return itemTypeLabel(item);
}

function tempText(value: number): string {
  return value < 0 ? `−${Math.abs(value)}` : String(value);
}

function seasonLabel(temperature: number): string {
  if (temperature >= 15) return "Лето";
  if (temperature >= -5) return "Демисезон";
  return "Зима";
}

function groupBySlot(items: readonly Item[]): Record<Slot, Item[]> {
  const groups: Record<Slot, Item[]> = {
    fullbody: [],
    top: [],
    bottom: [],
    outerwear: [],
    shoes: [],
    accessory: [],
  };
  for (const item of items) groups[item.slot].push(item);
  return groups;
}

/** Круговая выборка: сдвиг `offset` даёт разные варианты на «другой образ». */
function pickAt(list: readonly Item[], offset: number): Item | undefined {
  if (list.length === 0) return undefined;
  return list[offset % list.length];
}

function slotsFilled(groups: Record<Slot, Item[]>): boolean {
  return groups.fullbody.length > 0 || (groups.top.length > 0 && groups.bottom.length > 0);
}

function fitsTemperature(item: Item, temperature: number): boolean {
  return temperature >= item.tempMin && temperature <= item.tempMax;
}

export interface BuildOutfitsOptions {
  items: readonly Item[];
  /** Текущая температура: по ней отбираются вещи и подпись «сезон». */
  temperature: number;
  /** Куда собираемся: задаёт целевую формальность в оценке. */
  occasion: Occasion;
  limit?: number;
}

export function buildOutfits({
  items,
  temperature,
  occasion,
  limit = MAX_VARIANTS,
}: BuildOutfitsOptions): UiOutfit[] {
  const available = items.filter((item) => item.status === "available");
  const usable = available.length > 0 ? available : items.filter((item) => item.status !== "archived");
  if (usable.length === 0) return [];

  // Сначала пробуем вещи, подходящие под температуру. Если их не хватает на
  // образ — берём весь гардероб, чтобы экран не остался пустым.
  const byTemperature = usable.filter((item) => fitsTemperature(item, temperature));
  const strict = slotsFilled(groupBySlot(byTemperature));
  const pool = strict ? byTemperature : usable;
  const groups = groupBySlot(pool);

  if (!slotsFilled(groups)) return [];

  const variants = new Map<string, UiOutfit>();

  for (let variant = 0; variant < limit * 2 && variants.size < limit; variant += 1) {
    const hasBoth = groups.top.length > 0 && groups.bottom.length > 0;
    const useFullbody =
      groups.fullbody.length > 0 && (!hasBoth || variant % 4 === 3);

    const picked: Item[] = [];

    if (useFullbody) {
      const dress = pickAt(groups.fullbody, variant);
      if (!dress) continue;
      picked.push(dress);
    } else {
      const top = pickAt(groups.top, variant);
      const bottom = pickAt(groups.bottom, variant);
      if (!top || !bottom) continue;
      picked.push(top, bottom);
    }

    const shoes = pickAt(groups.shoes, variant);
    if (shoes) picked.push(shoes);

    // Верхний слой: при отборе по температуре он уже проверен. Когда вещей
    // под погоду не хватило, куртку добавляем только в холод.
    const outerwear = pickAt(groups.outerwear, variant);
    if (outerwear && (strict || temperature <= 5)) picked.push(outerwear);

    if (variant % 2 === 1) {
      const accessory = pickAt(groups.accessory, variant);
      if (accessory) picked.push(accessory);
    }

    const signature = picked
      .map((item) => item.id)
      .slice()
      .sort()
      .join("+");

    if (variants.has(signature)) continue;

    const pieces: PalettePiece[] = picked.map((item) => ({
      role: item.slot,
      colors: itemColors(item),
    }));
    const assessment = assessPalette(pieces);
    const score = scoreOutfit(picked, assessment.score, temperature, occasion);

    variants.set(signature, {
      id: `outfit-${signature}`,
      title: picked
        .slice(0, useFullbody ? 1 : 2)
        .map(shortName)
        .join(" + "),
      note: assessment.detail,
      harmony: assessment.label,
      palette: [
        ...new Set(picked.flatMap((item) => itemColors(item).map((color) => color.hex))),
      ].slice(0, 4),
      score: score.total,
      scoreParts: score,
      tags: [seasonLabel(temperature), `${tempText(temperature)}°`],
      items: picked.map((item) => ({
        id: item.id,
        name: itemName(item),
        category: item.slot,
        item,
      })),
      gradient: GRADIENTS[assessment.id] ?? GRADIENTS.mixed,
    });
  }

  return [...variants.values()]
    .sort(
      (left, right) =>
        right.score - left.score ||
        right.scoreParts.color - left.scoreParts.color ||
        left.id.localeCompare(right.id),
    )
    .slice(0, limit);
}
