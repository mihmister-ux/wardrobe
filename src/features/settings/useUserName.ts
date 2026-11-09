"use client";

import * as React from "react";

import { useSettings } from "@/features/settings/useSettings";

function readName(value: string | undefined): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

/**
 * Имя живёт в общей записи настроек, поэтому и читается, и пишется через
 * useSettings — соседние поля (город, тема) при этом не теряются.
 */
export function useUserName() {
  const { settings, isLoading, error, save } = useSettings();
  const name = readName(settings?.userName);

  const saveName = React.useCallback(
    async (raw: string): Promise<string> => {
      const trimmed = raw.trim();
      if (!trimmed) throw new Error("Имя не может быть пустым");
      await save({ userName: trimmed });
      return trimmed;
    },
    [save],
  );

  return {
    name,
    isLoading,
    error,
    saveName,
  };
}
