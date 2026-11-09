"use client";

import type { Warmth } from "@/db/types";

export type SeasonId = "summer" | "demi" | "winter";

export interface SeasonDef {
  id: SeasonId;
  label: string;
  emoji: string;
  tempMin: number;
  tempMax: number;
  /** Уровень тепла вещи: лето — 1, демисезон — 3, зима — 5. */
  warmth: Warmth;
}

/**
 * Один сезон — это диапазон температур и уровень тепла. Вещь может подходить
 * сразу к нескольким: тогда диапазоны объединяются, а плотность берётся по
 * самому тёплому из выбранных сезонов.
 */
export const SEASONS: readonly SeasonDef[] = [
  { id: "summer", label: "Лето", emoji: "☀️", tempMin: 15, tempMax: 35, warmth: 1 },
  { id: "demi", label: "Демисезон", emoji: "🍂", tempMin: -5, tempMax: 15, warmth: 3 },
  { id: "winter", label: "Зима", emoji: "❄️", tempMin: -20, tempMax: 5, warmth: 5 },
];

export const SEASON_MAP: Record<SeasonId, SeasonDef> = Object.fromEntries(
  SEASONS.map((season) => [season.id, season]),
) as Record<SeasonId, SeasonDef>;

/** Минус типографский: −5 читается лучше, чем -5. */
export function formatTemp(value: number): string {
  return value < 0 ? `−${Math.abs(value)}` : String(value);
}

export function formatRange(range: { tempMin: number; tempMax: number }): string {
  return `${formatTemp(range.tempMin)}…${formatTemp(range.tempMax)} °C`;
}

export interface MergedRange {
  tempMin: number;
  tempMax: number;
  warmth: Warmth;
}

/** Диапазоны выбранных сезонов объединяются в один общий отрезок. */
export function mergeSeasonRanges(
  seasons: readonly SeasonId[],
): MergedRange | null {
  const selected = SEASONS.filter((season) => seasons.includes(season.id));
  if (selected.length === 0) return null;

  return {
    tempMin: Math.min(...selected.map((season) => season.tempMin)),
    tempMax: Math.max(...selected.map((season) => season.tempMax)),
    // Для нескольких сезонов оставляем самую тёплую плотность: так вещь
    // не «провалится» в мороз из-за летней отметки.
    warmth: Math.max(...selected.map((season) => season.warmth)) as Warmth,
  };
}

/**
 * Какие сезоны соответствуют диапазону вещи.
 *
 * Сначала берём все сезоны, которые диапазон покрывает целиком. Если таких
 * нет (старые импортированные вещи с произвольным диапазоном), выбираем один
 * самый близкий сезон — по перекрытию, затем по близости середины.
 */
export function seasonsForRange(
  tempMin: number,
  tempMax: number,
): SeasonId[] {
  const covered = SEASONS.filter(
    (season) => tempMin <= season.tempMin && tempMax >= season.tempMax,
  );
  if (covered.length > 0) return covered.map((season) => season.id);

  const itemCenter = (tempMin + tempMax) / 2;
  let best: SeasonDef | null = null;
  let bestOverlap = 0;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const season of SEASONS) {
    const overlap =
      Math.min(tempMax, season.tempMax) - Math.max(tempMin, season.tempMin);
    if (overlap < 0) continue;

    const distance = Math.abs(
      itemCenter - (season.tempMin + season.tempMax) / 2,
    );

    const isBetter =
      overlap > bestOverlap ||
      (overlap === bestOverlap && distance < bestDistance) ||
      (overlap === bestOverlap &&
        distance === bestDistance &&
        best !== null &&
        season.warmth > best.warmth);

    if (isBetter) {
      best = season;
      bestOverlap = overlap;
      bestDistance = distance;
    }
  }

  return best ? [best.id] : [];
}

export function sameSeasons(
  left: readonly SeasonId[],
  right: readonly SeasonId[],
): boolean {
  return (
    left.length === right.length &&
    left.every((season) => right.includes(season))
  );
}
