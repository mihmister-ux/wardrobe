"use client";

import * as React from "react";
import { useLiveQuery } from "dexie-react-hooks";

import { db } from "@/db/db";
import type { Item } from "@/db/types";

export interface Wardrobe {
  /** Активные сверху, убранные — в конце; внутри — новые первыми. */
  items: Item[];
  /** Всего вещей в базе (включая убранные). */
  total: number;
  /** Сколько сейчас участвует в подборе. */
  activeCount: number;
  archivedCount: number;
  isLoading: boolean;
  /** id вещи, по которой идёт запись: кнопка показывает «…». */
  busyId: string | null;
  error: string | null;
  clearError: () => void;
  /** archived=true — «убрать из образов», false — «вернуть в образы». */
  setArchived: (item: Item, archived: boolean) => Promise<boolean>;
  /** Удаляет вещь и все её фото. */
  remove: (item: Item) => Promise<boolean>;
}

const ERROR_TEXT = "Не получилось сохранить изменение. Попробуйте ещё раз.";

export function useWardrobe(): Wardrobe {
  // toArray() читает таблицу целиком, поэтому Dexie подписывается на любые
  // изменения items и обновляет сетку сам — без ручного refresh.
  const items = useLiveQuery(() => db.items.toArray(), []);

  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const sorted = React.useMemo(() => {
    if (!items) return [];
    const rank = (item: Item) => (item.status === "archived" ? 1 : 0);
    return [...items].sort(
      (left, right) => rank(left) - rank(right) || right.createdAt - left.createdAt,
    );
  }, [items]);

  const run = React.useCallback(
    async (item: Item, action: () => Promise<unknown>): Promise<boolean> => {
      setBusyId(item.id);
      setError(null);
      try {
        await action();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : ERROR_TEXT);
        return false;
      } finally {
        setBusyId(null);
      }
    },
    [],
  );

  const setArchived = React.useCallback(
    (item: Item, archived: boolean) =>
      run(item, () =>
        db.items.update(item.id, {
          status: archived ? "archived" : "available",
          updatedAt: Date.now(),
        }),
      ),
    [run],
  );

  const remove = React.useCallback(
    (item: Item) =>
      run(item, () =>
        db.transaction("rw", db.items, db.photos, async () => {
          // Фото ищем по itemId, а не только по photoId: так не останется
          // «сирот», если у вещи когда-нибудь появится несколько снимков.
          await db.photos.where("itemId").equals(item.id).delete();
          await db.items.delete(item.id);
        }),
      ),
    [run],
  );

  const activeCount = sorted.filter((item) => item.status !== "archived").length;

  return {
    items: sorted,
    total: sorted.length,
    activeCount,
    archivedCount: sorted.length - activeCount,
    isLoading: items === undefined,
    busyId,
    error,
    clearError: React.useCallback(() => setError(null), []),
    setArchived,
    remove,
  };
}
