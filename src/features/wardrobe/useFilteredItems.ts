"use client";

import * as React from "react";

import type { ColorFamily, Item } from "@/db/types";
import {
  EMPTY_FILTERS,
  MAX_FILTER_COLORS,
  filterItems,
  hasActiveFilters,
  parseFilters,
  type CategoryFilter,
  type SeasonFilter,
  type WardrobeFilters,
} from "@/features/wardrobe/filterItems";

/**
 * Пауза перед отбором по строке поиска: даём человеку допечатать слово, а не
 * пересобираем сетку на каждый символ. Чипы и кружки цветов срабатывают сразу
 * (там задержка не помогает — это одиночный клик), поэтому дебаунс только у
 * поиска.
 */
const SEARCH_DEBOUNCE_MS = 250;

/** Значение, которое обновляется не раньше чем через `delayMs` после ввода. */
function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = React.useState(value);

  React.useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

/**
 * Отфильтрованный массив вещей. Поиск проходит через дебаунс, поэтому счётчик
 * «Найдено» отстаёт от ввода на четверть секунды — это нормально и незаметно
 * глазу, зато не дёргается.
 */
export function useFilteredItems(
  items: readonly Item[],
  filters: WardrobeFilters,
): readonly Item[] {
  const debouncedSearch = useDebouncedValue(filters.search, SEARCH_DEBOUNCE_MS);

  return React.useMemo(
    () =>
      filterItems(items, {
        search: debouncedSearch,
        category: filters.category,
        colors: filters.colors,
        season: filters.season,
      }),
    [
      items,
      debouncedSearch,
      filters.category,
      filters.colors,
      filters.season,
    ],
  );
}

const STORAGE_KEY = "wardrobe:filters";

export interface FilterActions {
  setSearch: (value: string) => void;
  setCategory: (category: CategoryFilter) => void;
  toggleColor: (family: ColorFamily) => void;
  clearColors: () => void;
  setSeason: (season: SeasonFilter) => void;
  reset: () => void;
}

/**
 * Текущие фильтры + действия над ними. Состояние пишется в sessionStorage:
 * ушёл на «Образы» и вернулся — поиск и выбор на месте, а перезагрузка вкладки
 * начинает заново (так и задумано — это не настройка, а рабочий контекст).
 */
export function useWardrobeFilters(): [WardrobeFilters, FilterActions] {
  const [filters, setFilters] = React.useState<WardrobeFilters>(() => {
    try {
      return parseFilters(sessionStorage.getItem(STORAGE_KEY));
    } catch {
      return { ...EMPTY_FILTERS };
    }
  });

  // sessionStorage может быть недоступен (приватный режим) — молча живём без
  // сохранения, сам фильтр продолжает работать в памяти.
  React.useEffect(() => {
    try {
      if (hasActiveFilters(filters)) {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
      } else {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      /* ignore */
    }
  }, [filters]);

  const actions = React.useMemo<FilterActions>(
    () => ({
      setSearch: (value) =>
        setFilters((current) => ({ ...current, search: value })),

      setCategory: (category) =>
        setFilters((current) => ({ ...current, category })),

      toggleColor: (family) =>
        setFilters((current) => {
          if (current.colors.includes(family)) {
            return {
              ...current,
              colors: current.colors.filter((item) => item !== family),
            };
          }
          // Не больше двух: третий клик вытесняет самый старый выбор.
          const next = [...current.colors, family];
          return { ...current, colors: next.slice(-MAX_FILTER_COLORS) };
        }),

      clearColors: () => setFilters((current) => ({ ...current, colors: [] })),

      setSeason: (season) => setFilters((current) => ({ ...current, season })),

      reset: () => setFilters({ ...EMPTY_FILTERS }),
    }),
    [],
  );

  return [filters, actions];
}