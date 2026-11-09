"use client";

import * as React from "react";
import { useLiveQuery } from "dexie-react-hooks";

import { db } from "@/db/db";
import type { Item, Occasion } from "@/db/types";
import { buildOutfits } from "@/features/home/buildOutfits";
import type { Outfit as UiOutfit } from "@/features/home/HomePage";

export interface HomeOutfits {
  outfitOfTheDay: UiOutfit | null;
  /** Варианты на выбор: появятся в следующем шаге, пока карточка-заглушка. */
  alternatives: UiOutfit[];
  items: Item[];
  isLoading: boolean;
  isRegenerating: boolean;
  error: string | null;
  regenerate: () => Promise<void>;
}

const NO_ALTERNATIVES: UiOutfit[] = [];
const NO_ITEMS: Item[] = [];

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

/** Свежие вещи — сверху: так список на главной понятнее. */
function newestFirst(items: readonly Item[]): Item[] {
  return [...items].sort((left, right) => right.createdAt - left.createdAt);
}

export function useHomeOutfits(temperature: number, occasion: Occasion): HomeOutfits {
  const [rotation, setRotation] = React.useState(0);
  const [isRegenerating, setIsRegenerating] = React.useState(false);
  const [readError, setReadError] = React.useState<string | null>(null);

  // Живой запрос: Dexie перезапускает его при добавлении, удалении и правке вещей.
  const read = useLiveQuery<ItemsRead>(readItems, []);

  const items = React.useMemo(
    () => (read?.items ? newestFirst(read.items) : NO_ITEMS),
    [read],
  );

  // Варианты уже отсортированы по комплексной оценке: первый — самый уместный.
  const outfits = React.useMemo(
    () =>
      read?.items
        ? buildOutfits({ items: read.items, temperature, occasion })
        : [],
    [read, temperature, occasion],
  );

  const outfitOfTheDay =
    outfits.length > 0 ? outfits[rotation % outfits.length] ?? null : null;

  /** «Другой образ»: переходим к следующему варианту и перечитываем базу. */
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
    items,
    isLoading: read === undefined,
    isRegenerating,
    error: read?.error ?? readError,
    regenerate,
  };
}
