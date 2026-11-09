 "use client";

import * as React from "react";
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

export function useHomeOutfits(): HomeOutfits {
  const [outfitOfTheDay, setOutfitOfTheDay] = React.useState<UiOutfit | null>(null);
  const [alternatives, setAlternatives] = React.useState<UiOutfit[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRegenerating, setIsRegenerating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const run = React.useCallback(async (regenerateMode: boolean) => {
    if (regenerateMode) setIsRegenerating(true);
    else setIsLoading(true);
    setError(null);

    try {
      const items = await db.items.where("status").notEqual("archived").toArray();

      if (items.length === 0) {
        setOutfitOfTheDay(null);
        setAlternatives([]);
        return;
      }

      // Заглушка для первого теста (берем первые 4 вещи)
      const fakeOutfit: UiOutfit = {
        id: "outfit-1",
        title: "Ваш первый образ",
        note: "Собран из реальных вещей в базе",
        score: 85,
        tags: ["Из базы"],
        items: items.slice(0, 4).map((item) => ({
          id: item.id,
          name: item.label || item.type,
          category: item.slot as any,
          emoji: slotEmoji(item.slot),
        })),
        gradient: "from-sky-200 via-indigo-200 to-violet-200",
      };

      setOutfitOfTheDay(fakeOutfit);
      setAlternatives([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
      setIsRegenerating(false);
    }
  }, []);

  React.useEffect(() => { void run(false); }, [run]);
  const regenerate = React.useCallback(() => run(true), [run]);

  return { outfitOfTheDay, alternatives, isLoading, isRegenerating, error, regenerate };
}
