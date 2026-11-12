"use client";

/**
 * Статистика «что носили» — считается из журнала `wornHistory`.
 *
 * Два взгляда на один и тот же журнал:
 *   • топ-5 — что надевалось чаще всего (и когда в последний раз);
 *   • «не носили» — что так и лежит без дела.
 *
 * Считаем по `itemIds`: вещь «ношеная», если она хотя бы раз встретилась в
 * записи журнала. Один образ даёт +1 к счётчику, даже если вещь попала в
 * `itemIds` дважды, — поэтому внутри записи id сначала дедуплицируются.
 *
 * Сама логика вынесена в чистую `computeWornStats`, а хук только мемоизирует
 * её результат: так статистику можно посчитать и проверить без React.
 */

import * as React from "react";

import type { Item, WornHistory } from "@/db/types";

/** В топе показываем ровно пять вещей. */
export const WORN_TOP_LIMIT = 5;

export interface WornTopItem {
  item: Item;
  /** В скольких записях журнала встречается вещь. */
  wearCount: number;
  /** Дата последнего ношения (timestamp начала дня). */
  lastWornAt: number;
}

export interface WornStats {
  /** До пяти самых носимых вещей: чаще — выше, при равенстве — свежее. */
  topItems: WornTopItem[];
  /** Вещи, которых нет ни в одной записи журнала. */
  unwornItems: Item[];
  /** Сколько разных вещей хоть раз надевали. */
  wornCount: number;
  /** Есть ли вообще записи в журнале. */
  hasHistory: boolean;
}

const EMPTY_STATS: WornStats = {
  topItems: [],
  unwornItems: [],
  wornCount: 0,
  hasHistory: false,
};

/**
 * Убранные вещи — в конце списка, внутри — новые первыми: тот же порядок, что
 * в гардеробе, чтобы список «не носили» не выглядел случайным.
 */
function byWardrobeOrder(left: Item, right: Item): number {
  const rank = (item: Item) => (item.status === "archived" ? 1 : 0);
  return rank(left) - rank(right) || right.createdAt - left.createdAt;
}

export function computeWornStats(
  items: readonly Item[] | undefined,
  history: readonly WornHistory[] | undefined,
  limit: number = WORN_TOP_LIMIT,
): WornStats {
  if (!items) return EMPTY_STATS;

  const itemById = new Map(items.map((item) => [item.id, item]));
  const usage = new Map<string, { wearCount: number; lastWornAt: number }>();

  for (const entry of history ?? []) {
    // Повтор одного id внутри образа — всё равно один выход.
    for (const id of new Set(entry.itemIds)) {
      // Вещь удалили из гардероба: считать её незачем, показывать нечего.
      if (!itemById.has(id)) continue;

      const current = usage.get(id);
      if (current) {
        current.wearCount += 1;
        if (entry.date > current.lastWornAt) current.lastWornAt = entry.date;
      } else {
        usage.set(id, { wearCount: 1, lastWornAt: entry.date });
      }
    }
  }

  const topItems: WornTopItem[] = [...usage.entries()]
    .map(([id, stat]) => ({ item: itemById.get(id)!, ...stat }))
    .sort(
      (left, right) =>
        right.wearCount - left.wearCount || right.lastWornAt - left.lastWornAt,
    )
    .slice(0, limit);

  const unwornItems = items
    .filter((item) => !usage.has(item.id))
    .sort(byWardrobeOrder);

  return {
    topItems,
    unwornItems,
    wornCount: usage.size,
    hasHistory: (history?.length ?? 0) > 0,
  };
}

/**
 * Статистика ношения по текущим вещам и журналу. Пока данные грузятся
 * (`undefined`), возвращается пустой набор — экран показывает скелетон.
 */
export function useWornStats(
  items: readonly Item[] | undefined,
  history: readonly WornHistory[] | undefined,
): WornStats & { isLoading: boolean } {
  const stats = React.useMemo(
    () => computeWornStats(items, history),
    [items, history],
  );

  return { ...stats, isLoading: items === undefined || history === undefined };
}
