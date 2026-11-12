"use client";

import * as React from "react";
import { useLiveQuery } from "dexie-react-hooks";

import { db } from "@/db/db";
import type { Item, SavedOutfit } from "@/db/types";
import { itemName } from "@/features/items/itemView";

/**
 * Чтение сохранённых образов: подгружаем записи из `savedOutfits` и резолвим
 * id вещей в сами вещи. Отсутствующие (удалённые) вещи просто пропускаем —
 * образ с одной вещью не ломается, а просто становится короче.
 */
export interface ResolvedSavedOutfit {
  id: string;
  /** Вещи в порядке сохранения (пропущены удалённые). */
  items: Item[];
  score: number;
  createdAt: number;
  /** Заголовок «Свитер + Брюки» из первых двух вещей. */
  title: string;
}

export interface SavedOutfitsState {
  outfits: ResolvedSavedOutfit[];
  isLoading: boolean;
  error: string | null;
  /** Сохранить набор вещей с оценкой. */
  save: (items: readonly Item[], score: number) => Promise<boolean>;
  /** Удалить сохранённый образ. */
  remove: (id: string) => Promise<boolean>;
}

function buildTitle(items: readonly Item[]): string {
  if (items.length === 0) return "Образ";
  return items
    .slice(0, 2)
    .map((item) => itemName(item))
    .join(" + ");
}

/**
 * Сохранить набор вещей в `savedOutfits`. Возвращает false, если вещей нет
 * или такой же состав (по набору id) уже сохранён — повторный клик не плодит
 * дубли. Отдельная функция, чтобы главная сохраняла образ без всего хука.
 */
export async function saveOutfit(
  outfitItems: readonly Item[],
  score: number,
): Promise<boolean> {
  if (outfitItems.length === 0) return false;

  const ids = outfitItems.map((item) => item.id);
  const signature = [...ids].sort().join("+");

  const existing = await db.savedOutfits.toArray();
  if (existing.some((record) => [...record.items].sort().join("+") === signature)) {
    return false;
  }

  await db.savedOutfits.add({
    id: crypto.randomUUID(),
    items: ids,
    score,
    createdAt: Date.now(),
  });
  return true;
}

async function resolveOutfits(
  saved: readonly SavedOutfit[],
): Promise<ResolvedSavedOutfit[]> {
  const resolved: ResolvedSavedOutfit[] = [];

  for (const record of saved) {
    const items: Item[] = [];
    for (const id of record.items) {
      const item = await db.items.get(id);
      if (item) items.push(item);
    }
    if (items.length === 0) continue;
    resolved.push({
      id: record.id,
      items,
      score: record.score,
      createdAt: record.createdAt,
      title: buildTitle(items),
    });
  }

  return resolved.sort((a, b) => b.createdAt - a.createdAt);
}

export function useSavedOutfits(): SavedOutfitsState {
  // toArray() читает таблицу целиком: Dexie сам перезапускает запрос при
  // добавлении/удалении записи.
  const saved = useLiveQuery(
    () => db.savedOutfits.orderBy("createdAt").reverse().toArray(),
    [],
  );

  const [resolved, setResolved] = React.useState<ResolvedSavedOutfit[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  // Резолвим id вещей в объекты. Это отдельный шаг от live-запроса: если вещь
  // изменилась (цвет, фото), а записи savedOutfits не трогались, подписка на
  // items не сработает. Поэтому подписываемся и на items тоже.
  const items = useLiveQuery(() => db.items.toArray(), []);

  React.useEffect(() => {
    if (!saved) return;
    let cancelled = false;
    void resolveOutfits(saved).then((value) => {
      if (!cancelled) setResolved(value);
    });
    return () => {
      cancelled = true;
    };
  }, [saved, items]);

  const save = React.useCallback(
    async (outfitItems: readonly Item[], score: number): Promise<boolean> => {
      setError(null);
      try {
        return await saveOutfit(outfitItems, score);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Не удалось сохранить образ");
        return false;
      }
    },
    [],
  );

  const remove = React.useCallback(async (id: string): Promise<boolean> => {
    setError(null);
    try {
      await db.savedOutfits.delete(id);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось удалить образ");
      return false;
    }
  }, []);

  return {
    outfits: saved ? resolved : [],
    isLoading: saved === undefined || items === undefined,
    error,
    save,
    remove,
  };
}
