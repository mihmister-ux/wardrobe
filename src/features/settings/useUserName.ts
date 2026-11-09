 "use client";

import * as React from "react";
import { db } from "@/db/db";
import type { Settings } from "@/db/types";

const SETTINGS_ID = "app" as const;

function readName(record: Settings | undefined): string | null {
  const value = record?.userName;
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export function useUserName() {
  const [name, setName] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const record = await db.settings.get(SETTINGS_ID);
        if (!cancelled) setName(readName(record));
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const saveName = React.useCallback(async (raw: string): Promise<string> => {
    const trimmed = raw.trim();
    if (!trimmed) throw new Error("Имя не может быть пустым");
    await db.settings.put({ id: SETTINGS_ID, userName: trimmed } as Settings);
    setName(trimmed);
    return trimmed;
  }, []);

  return { name, isLoading, error, saveName };
}
