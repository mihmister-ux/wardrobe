"use client";

/**
 * Поиск и фильтры гардероба — вся логика отбора в одном месте.
 *
 * Здесь нет ни состояния, ни React: `filterItems` — чистая функция, которую
 * удобно проверять и переиспользовать. Экран только собирает `WardrobeFilters`
 * и рисует то, что вернулось.
 *
 * Условия всегда объединяются по «И»: «верх» + «чёрный» + «зима» находит
 * чёрные зимние вещи верха. Внутри группы цветов — «ИЛИ»: выбрали белый и
 * серый, увидим и то и другое (но не больше двух цветов: третий выбор
 * вытесняет самый старый, см. `MAX_FILTER_COLORS`).
 */

import { COLORS, COLOR_MAP, SLOT_MAP, SLOT_ORDER } from "@/db/seed/references";
import type { ColorFamily, Item, Slot } from "@/db/types";
import { isColorFamily, itemColorFamilies } from "@/features/items/itemColors";
import { itemName, itemTypeLabel, slotLabel } from "@/features/items/itemView";
import { seasonsForRange, type SeasonId } from "@/features/items/seasons";

/** «Все» или конкретный раздел вещи. */
export type CategoryFilter = Slot | "all";

/** «Все» или конкретный сезон. */
export type SeasonFilter = SeasonId | "all";

export interface WardrobeFilters {
  /** Строка поиска как её ввёл человек (обрезка и регистр — при отборе). */
  search: string;
  category: CategoryFilter;
  /** Семейства цветов; пусто — любой цвет. */
  colors: ColorFamily[];
  season: SeasonFilter;
}

/** Больше двух цветов одновременно не выбираем: кружки перестают читаться. */
export const MAX_FILTER_COLORS = 2;

export const EMPTY_FILTERS: WardrobeFilters = {
  search: "",
  category: "all",
  colors: [],
  season: "all",
};

/**
 * Приведение строки к сравнимому виду: без краёв, без регистра, «ё» как «е».
 * Без последнего пункта «Чёрный» не находится запросом «черный» — а именно
 * так его и набирают.
 */
export function normalizeQuery(value: string): string {
  return value.trim().toLowerCase().replace(/ё/g, "е");
}

/**
 * По чему ищем: название, тип и раздел из справочника, названия цветов и теги.
 * Поиск по названию — основной сценарий, остальное подхватывает «синий» или
 * «куртка», когда название у вещи не задано.
 */
function searchHaystack(item: Item): string {
  const parts: string[] = [itemName(item), itemTypeLabel(item), slotLabel(item.slot)];
  for (const family of itemColorFamilies(item)) parts.push(COLOR_MAP[family].label);
  for (const tag of item.tags) parts.push(tag);
  return normalizeQuery(parts.join(" "));
}

/** Совпадает ли вещь с поисковой строкой (уже нормализованной). */
export function matchesSearch(item: Item, query: string): boolean {
  if (!query) return true;
  return searchHaystack(item).includes(query);
}

/** Выбрано ли хоть что-то: от этого зависит кнопка «Сбросить» и счётчик. */
export function hasActiveFilters(filters: WardrobeFilters): boolean {
  return (
    normalizeQuery(filters.search) !== "" ||
    filters.category !== "all" ||
    filters.colors.length > 0 ||
    filters.season !== "all"
  );
}

/**
 * Отбор вещей: поиск → раздел → цвет → сезон, все условия по «И».
 * Если фильтров нет, возвращается исходный массив — без лишней копии и без
 * мигания списка при каждом ре-рендере.
 */
export function filterItems(
  items: readonly Item[],
  filters: WardrobeFilters,
): readonly Item[] {
  const query = normalizeQuery(filters.search);
  const { category, season } = filters;
  const colors = filters.colors;

  if (!query && category === "all" && colors.length === 0 && season === "all") {
    return items;
  }

  return items.filter((item) => {
    if (query && !matchesSearch(item, query)) return false;
    if (category !== "all" && item.slot !== category) return false;
    if (
      colors.length > 0 &&
      !itemColorFamilies(item).some((family) => colors.includes(family))
    ) {
      return false;
    }
    if (
      season !== "all" &&
      !seasonsForRange(item.tempMin, item.tempMax).includes(season)
    ) {
      return false;
    }
    return true;
  });
}

/**
 * Разделы, которые реально есть в гардеробе, — в порядке коллажа. Пустых чипов
 * не показываем: «Верхняя одежда» без единой куртки ведёт только в пустоту.
 */
export function presentSlots(items: readonly Item[]): Slot[] {
  const seen = new Set<Slot>();
  for (const item of items) seen.add(item.slot);
  return SLOT_ORDER.filter((slot) => seen.has(slot));
}

/**
 * Цвета, которые встречаются у вещей, — в порядке круга Иттена. Те же
 * соображения, что и с разделами: 17 кружков ради двух реальных цветов только
 * мешают целиться.
 */
export function presentColors(items: readonly Item[]): ColorFamily[] {
  const seen = new Set<ColorFamily>();
  for (const item of items) {
    for (const family of itemColorFamilies(item)) seen.add(family);
  }
  return COLORS.map((color) => color.family).filter((family) => seen.has(family));
}

const SEASON_IDS: readonly string[] = ["summer", "demi", "winter"];

/**
 * Чтение фильтров из sessionStorage. Мусор и старые версии не ломают экран:
 * всё непонятное отбрасываем и получаем «Все».
 */
export function parseFilters(raw: string | null): WardrobeFilters {
  if (!raw) return { ...EMPTY_FILTERS };

  try {
    const data = JSON.parse(raw) as Partial<WardrobeFilters>;
    const category =
      typeof data.category === "string" &&
      (data.category === "all" || Object.hasOwn(SLOT_MAP, data.category))
        ? (data.category as CategoryFilter)
        : "all";
    const season =
      typeof data.season === "string" && SEASON_IDS.includes(data.season)
        ? (data.season as SeasonFilter)
        : "all";

    return {
      search: typeof data.search === "string" ? data.search.slice(0, 80) : "",
      category,
      colors: Array.isArray(data.colors)
        ? data.colors.filter(isColorFamily).slice(0, MAX_FILTER_COLORS)
        : [],
      season,
    };
  } catch {
    return { ...EMPTY_FILTERS };
  }
}
