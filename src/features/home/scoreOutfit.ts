"use client";

/**
 * Комплексная оценка образа.
 *
 * Раньше кольцо показывало только гармонию палитры, поэтому «зимний пуховик
 * с летними шортами» и «капсула в одной гамме» могли получить одинаковый
 * процент. Теперь к цвету добавляются два понятных слагаемых:
 *
 *   цвет           0..100  — основа, правила сочетаемости из generator/colors;
 *   погода         0..10   — доля вещей, чей диапазон температур накрывает
 *                            текущую погоду;
 *   формальность   0..5    — насколько вещи уместны для выбранной ситуации
 *                            (точное попадание +5, соседняя ступень — половина).
 *
 * Итог — сумма, ограниченная сотней. Слагаемые возвращаем отдельно, чтобы
 * интерфейс мог честно показать, из чего сложился процент.
 */

import { OCCASION_MAP } from "@/db/seed/references";
import type { Formality, Item, Occasion } from "@/db/types";

export interface OutfitScore {
  /** Гармония палитры 0..100. */
  color: number;
  /** Надбавка за погоду 0..10. */
  temperature: number;
  /** Надбавка за формальность 0..5. */
  formality: number;
  /** Итог 0..100. */
  total: number;
  /** Сколько вещей реально подходят под текущую температуру. */
  temperatureFits: number;
  /** Суммарное соответствие формальности: 0..pieces. */
  formalityFits: number;
  /** Сколько вещей в образе. */
  pieces: number;
}

export const TEMPERATURE_POINTS = 10;
export const FORMALITY_POINTS = 5;

function fitsTemperature(item: Item, temperature: number): boolean {
  return temperature >= item.tempMin && temperature <= item.tempMax;
}

/** 1 — точное совпадение, 0.5 — соседняя ступень, 0 — мимо. */
function formalityMatch(item: Item, target: Formality): number {
  const diff = Math.abs(item.formality - target);
  if (diff === 0) return 1;
  if (diff === 1) return 0.5;
  return 0;
}

export function scoreOutfit(
  pieces: readonly Item[],
  colorScore: number,
  temperature: number,
  occasion: Occasion,
): OutfitScore {
  const count = pieces.length;
  const target = OCCASION_MAP[occasion].formality;

  let temperatureFits = 0;
  let formalityFits = 0;

  for (const item of pieces) {
    if (fitsTemperature(item, temperature)) temperatureFits += 1;
    formalityFits += formalityMatch(item, target);
  }

  const temperaturePoints =
    count === 0 ? 0 : Math.round((temperatureFits / count) * TEMPERATURE_POINTS);
  const formalityPoints =
    count === 0 ? 0 : Math.round((formalityFits / count) * FORMALITY_POINTS);
  const total = Math.max(
    0,
    Math.min(100, Math.round(colorScore + temperaturePoints + formalityPoints)),
  );

  return {
    color: Math.round(colorScore),
    temperature: temperaturePoints,
    formality: formalityPoints,
    total,
    temperatureFits,
    formalityFits,
    pieces: count,
  };
}
