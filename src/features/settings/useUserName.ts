"use client";

import * as React from "react";
import { useLiveQuery } from "dexie-react-hooks";

import { db } from "@/db/db";
import type { Settings } from "@/db/types";

const SETTINGS_ID = "app" as const;

interface UserNameState {
  record: Settings | undefined;
  error: string | null;
}

function readName(value: string | undefined): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

/**
 * Возвращаем объект-обёртку, а не саму запись: `useLiveQuery` отдаёт undefined
 * и во время загрузки, и когда настройки ещё нет, — а различать эти состояния
 * нужно (диалог имени не должен открываться до ответа базы).
 */
async function readSettings(): Promise<UserNameState> {
  try {
    return { record: await db.settings.get(SETTINGS_ID), error: null };
  } catch (err) {
    return {
      record: undefined,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export function useUserName() {
  const state = useLiveQuery<UserNameState>(readSettings, []);
  const name = readName(state?.record?.userName);

  const saveName = React.useCallback(async (raw: string): Promise<string> => {
    const trimmed = raw.trim();
    if (!trimmed) throw new Error("Имя не может быть пустым");

    // Читаем запись и собираем её заново: put({ id, userName }) затирал
    // city и theme, которые появятся в настройках позже.
    const existing = await db.settings.get(SETTINGS_ID);
    const record: Settings = {
      id: SETTINGS_ID,
      city: existing?.city ?? "",
      theme: existing?.theme ?? "system",
      userName: trimmed,
      updatedAt: Date.now(),
    };
    await db.settings.put(record);
    return trimmed;
  }, []);

  return {
    name,
    isLoading: state === undefined,
    error: state?.error ?? null,
    saveName,
  };
}
