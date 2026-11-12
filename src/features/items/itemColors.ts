"use client";

/**
 * Цвета вещи: сколько их, как их подписать и как показать.
 *
 * С версии схемы v4 у вещи не один цвет, а массив `colors` (1–2 семейства из
 * справочника): полосатая майка или свитер с контрастными рукавами — обычное
 * дело. Утилиты ниже прячут от интерфейса две вещи, о которых иначе пришлось
 * бы помнить в каждом компоненте:
 *
 *   1. цвет в базе — семейство (`"black"`), а для показа нужны HEX и подпись.
 *      Их берём из COLOR_MAP, чтобы справочник оставался единственным
 *      источником правды;
 *   2. в старых записях и резервных копиях ещё может лежать одноцветное
 *      `color` объектом — читаем его как запасной вариант.
 */

import { COLOR_MAP } from "@/db/seed/references";
import type { ColorFamily, ItemColor } from "@/db/types";

/** Больше двух цветов у вещи не бывает: их количество задано дизайном. */
export const MAX_ITEM_COLORS = 2;

/** Запасной цвет для совсем пустых записей — нейтральный, не бросается в глаза. */
const FALLBACK_FAMILY: ColorFamily = "gray";

/** Любая строка, для которой в справочнике есть HEX и подпись. */
export function isColorFamily(value: unknown): value is ColorFamily {
  return typeof value === "string" && Object.hasOwn(COLOR_MAP, value);
}

/** Семейство → полный цвет для показа. Неизвестное значение даёт нейтраль. */
export function resolveColor(family: string | null | undefined): ItemColor {
  const def = isColorFamily(family) ? COLOR_MAP[family] : COLOR_MAP[FALLBACK_FAMILY];
  return { family: def.family, hex: def.hex, label: def.label };
}

/**
 * Что можно прочитать о цвете вещи. Такой формы достаточно, чтобы принять и
 * новую запись (`colors`), и старую (`color` объектом или строкой).
 */
export interface ColorSource {
  colors?: readonly string[] | null;
  color?: string | ItemColor | null;
}

/**
 * Семейства цветов вещи: основное первым, без повторов, максимум два.
 * Пустой или битый набор не оставляет вещь «бесцветной» — подставляем нейтраль.
 */
export function itemColorFamilies(source: ColorSource): ColorFamily[] {
  const families: ColorFamily[] = [];

  for (const candidate of source.colors ?? []) {
    if (isColorFamily(candidate) && !families.includes(candidate)) families.push(candidate);
  }

  if (families.length === 0) {
    const legacy = source.color;
    const family = typeof legacy === "string" ? legacy : legacy?.family;
    if (isColorFamily(family)) families.push(family);
  }

  if (families.length === 0) families.push(FALLBACK_FAMILY);

  return families.slice(0, MAX_ITEM_COLORS);
}

/** Цвета вещи с HEX и подписями — для кружков и текста. */
export function itemColors(source: ColorSource): ItemColor[] {
  return itemColorFamilies(source).map((family) => resolveColor(family));
}

/** «Белый» или «Белый / Чёрный» — одна строка для карточки и списков. */
export function itemColorLabel(source: ColorSource): string {
  return itemColors(source)
    .map((color) => color.label)
    .join(" / ");
}

/**
 * Собирает `colors` из выбора в форме. Дополнительный цвет не может совпадать
 * с основным: если совпал — вещь остаётся одноцветной.
 */
export function combineColors(
  primary: ColorFamily | null,
  secondary: ColorFamily | null,
): ColorFamily[] {
  if (!primary) return [];
  return secondary && secondary !== primary ? [primary, secondary] : [primary];
}
