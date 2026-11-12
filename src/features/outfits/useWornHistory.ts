"use client";

import * as React from "react";
import { useLiveQuery } from "dexie-react-hooks";

import { db } from "@/db/db";
import type { Item, WornHistory } from "@/db/types";

/* ========================================================================== */
/*  Типы                                                                      */
/* ========================================================================== */

export interface ResolvedWornEntry {
  id: number;
  /** Начало дня ношения (timestamp). */
  date: number;
  items: Item[];
  outfitScore?: number;
  createdAt: number;
}

/* ========================================================================== */
/*  Помощники                                                                 */
/* ========================================================================== */

/** Нормализовать метку времени к началу локальных суток (00:00). */
export function startOfDay(timestamp: number): number {
  const d = new Date(timestamp);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** «12 ноября» — только день и месяц. */
const DAY_MONTH = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
});

export function formatWornDay(timestamp: number): string {
  return DAY_MONTH.format(new Date(timestamp));
}

/* ========================================================================== */
/*  Императивная запись (для кнопки «Носить сегодня»)                         */
/* ========================================================================== */

/**
 * Записать набор вещей в историю сегодняшнего дня.
 * Если такой же набор id уже записан сегодня — возвращает false (не дублируем).
 */
export async function recordWornOutfit(
  itemIds: readonly string[],
  score?: number,
): Promise<boolean> {
  if (itemIds.length === 0) return false;

  const day = startOfDay(Date.now());
  const signature = [...itemIds].sort().join("+");

  // Сегодняшние записи
  const today = await db.wornHistory.where("date").equals(day).toArray();
  const already = today.some(
    (r) => [...r.itemIds].sort().join("+") === signature,
  );
  if (already) return false;

  await db.wornHistory.add({
    date: day,
    itemIds: [...itemIds],
    outfitScore: score,
    createdAt: Date.now(),
  });
  return true;
}

/* ========================================================================== */
/*  Хук для чтения (вкладка «История»)                                        */
/* ========================================================================== */

async function resolveEntries(
  raw: readonly WornHistory[],
): Promise<ResolvedWornEntry[]> {
  const out: ResolvedWornEntry[] = [];
  for (const r of raw) {
    const items: Item[] = [];
    for (const id of r.itemIds) {
      const item = await db.items.get(id);
      if (item) items.push(item);
    }
    if (items.length === 0) continue;
    out.push({
      id: r.id ?? 0,
      date: r.date,
      items,
      outfitScore: r.outfitScore,
      createdAt: r.createdAt,
    });
  }
  // Новые сверху: по дате (убыв.), затем по времени записи (убыв.).
  out.sort((a, b) => b.date - a.date || b.createdAt - a.createdAt);
  return out;
}

export function useWornHistory() {
  const raw = useLiveQuery(() => db.wornHistory.toArray(), []);
  const items = useLiveQuery(() => db.items.toArray(), []);

  const [resolved, setResolved] = React.useState<ResolvedWornEntry[]>([]);

  React.useEffect(() => {
    if (!raw) return;
    let cancelled = false;
    void resolveEntries(raw).then((value) => {
      if (!cancelled) setResolved(value);
    });
    return () => {
      cancelled = true;
    };
  }, [raw, items]);

  return {
    entries: raw ? resolved : [],
    isLoading: raw === undefined || items === undefined,
  };
}
