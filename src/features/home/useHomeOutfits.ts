"use client";

import * as React from "react";
import { useLiveQuery } from "dexie-react-hooks";

import { db } from "@/db/db";
import type { Item } from "@/db/types";
import type { Outfit as UiOutfit } from "@/features/home/HomePage";

export interface HomeOutfits {
  outfitOfTheDay: UiOutfit | null;
  alternatives: UiOutfit[];
  isLoading: boolean;
  isRegenerating: boolean;
  error: string | null;
  regenerate: () => Promise<void>;
}

/** Сколько вещей попадает в образ дня. */
const OUTFIT_SIZE = 4;

const NO_ALTERNATIVES: UiOutfit[] = [];

function slotEmoji(slot: Item["slot"]): string {
  switch (slot) {
    case "top": return "👕";
    case "bottom": return "👖";
    case "fullbody": return "👗";
    case "outerwear": return "🧥";
    case "shoes": return "👟";
    case "accessory": return "🧣";
    default: return "👕";
  }
}

/**
 * Чтение вещей для образа. Ошибку не бросаем, а возвращаем результатом:
 * `useLiveQuery` не умеет показывать баннер, а экран умеет.
 */
type ItemsRead = { items: Item[]; error: null } | { items: null; error: string };

async function readItems(): Promise<ItemsRead> {
  try {
    // toCollection().filter() читает всю таблицу, поэтому Dexie подписывается
    // на любое изменение items и перезапускает запрос сам.
    const items = await db.items
      .toCollection()
      .filter((item) => item.status !== "archived")
      .toArray();
    return { items, error: null };
  } catch (err) {
    return { items: null, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Заглушка генератора: берём OUTFIT_SIZE вещей со сдвигом `rotation`. */
function buildOutfit(items: Item[], rotation: number): UiOutfit {
  const start = rotation % items.length;
  const picked = Array.from(
    { length: Math.min(OUTFIT_SIZE, items.length) },
    (_, i) => items[(start + i) % items.length],
  );

  return {
    id: "outfit-1",
    title: "Ваш первый образ",
    note: "Собран из реальных вещей в базе",
    score: 85,
    tags: ["Из базы"],
    items: picked.map((item) => ({
      id: item.id,
      name: item.label || item.type,
      category: item.slot as any,
      emoji: slotEmoji(item.slot),
    })),
    gradient: "from-sky-200 via-indigo-200 to-violet-200",
  };
}

export function useHomeOutfits(): HomeOutfits {
  const [rotation, setRotation] = React.useState(0);
  const [isRegenerating, setIsRegenerating] = React.useState(false);
  const [readError, setReadError] = React.useState<string | null>(null);

  // Живой запрос: Dexie перезапускает его при добавлении, удалении и правке вещей.
  const read = useLiveQuery<ItemsRead>(readItems, []);

  const items = read?.items ?? null;
  const outfitOfTheDay = React.useMemo(
    () => (items && items.length > 0 ? buildOutfit(items, rotation) : null),
    [items, rotation],
  );

  /** «Другой образ»: сдвигаем выборку и честно перечитываем базу. */
  const regenerate = React.useCallback(async () => {
    setRotation((value) => value + 1);
    setIsRegenerating(true);
    try {
      const fresh = await readItems();
      setReadError(fresh.error);
    } finally {
      setIsRegenerating(false);
    }
  }, []);

  return {
    outfitOfTheDay,
    alternatives: NO_ALTERNATIVES,
    isLoading: read === undefined,
    isRegenerating,
    error: read?.error ?? readError,
    regenerate,
  };
}
