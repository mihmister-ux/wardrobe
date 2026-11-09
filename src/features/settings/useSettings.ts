"use client";

import * as React from "react";
import { useLiveQuery } from "dexie-react-hooks";

import { db } from "@/db/db";
import type { Settings } from "@/db/types";

const SETTINGS_ID = "app" as const;

export type ThemeMode = "light" | "dark" | "system";

export interface SettingsPatch {
  userName?: string;
  city?: string;
  theme?: string;
}

interface SettingsState {
  record: Settings | undefined;
  error: string | null;
}

/**
 * Читаем запись целиком: `useLiveQuery` отдаёт undefined и во время загрузки,
 * и когда настроек ещё нет, — а различать эти состояния нужно.
 */
async function readSettings(): Promise<SettingsState> {
  try {
    return { record: await db.settings.get(SETTINGS_ID), error: null };
  } catch (err) {
    return {
      record: undefined,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export function normalizeTheme(value: string | undefined): ThemeMode {
  return value === "light" || value === "dark" ? value : "system";
}

/**
 * Настройки приложения одной записью: имя, город и тема. Сохранение всегда
 * собирает запись заново — иначе `put` затирал бы соседние поля.
 */
export function useSettings() {
  const state = useLiveQuery<SettingsState>(readSettings, []);
  const settings = state?.record;

  const save = React.useCallback(
    async (patch: SettingsPatch): Promise<Settings> => {
      const existing = await db.settings.get(SETTINGS_ID);
      const record: Settings = {
        id: SETTINGS_ID,
        userName:
          patch.userName !== undefined ? patch.userName : existing?.userName,
        city: patch.city !== undefined ? patch.city : (existing?.city ?? ""),
        theme:
          patch.theme !== undefined ? patch.theme : (existing?.theme ?? "system"),
        updatedAt: Date.now(),
      };
      await db.settings.put(record);
      return record;
    },
    [],
  );

  return {
    settings,
    /** Город без пробелов по краям; пустая строка — «по геолокации». */
    city: settings?.city?.trim() ?? "",
    theme: normalizeTheme(settings?.theme),
    isLoading: state === undefined,
    error: state?.error ?? null,
    save,
  };
}
