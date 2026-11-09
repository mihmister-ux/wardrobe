"use client";

import * as React from "react";

import { db } from "@/db/db";
import type { Item } from "@/db/types";
import { itemName, SLOT_EMOJI } from "@/features/items/itemView";
import { cn } from "@/lib/utils";

/**
 * Фото вещи лежит в IndexedDB блобом, поэтому показываем его через
 * object URL: создаём при монтировании, отзываем при размонтировании
 * (иначе браузер копит десятки мегабайт на длинной ленте).
 */
function usePhotoUrl(photoId: string | undefined): string | null {
  const [loaded, setLoaded] = React.useState<{ id: string; url: string } | null>(null);

  React.useEffect(() => {
    if (!photoId) return;

    let cancelled = false;
    let objectUrl: string | null = null;

    db.photos
      .get(photoId)
      .then((photo) => {
        if (cancelled || !photo) return;
        objectUrl = URL.createObjectURL(photo.thumb);
        setLoaded({ id: photoId, url: objectUrl });
      })
      .catch(() => {
        // Нет фото — покажем эмодзи слота, вещь останется в списке.
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      // Ссылка уже невалидна: не отдаём её следующему фото до загрузки нового.
      setLoaded((current) => (current && current.id === photoId ? null : current));
    };
  }, [photoId]);

  return loaded && loaded.id === photoId ? loaded.url : null;
}

export interface ItemPhotoProps {
  item: Item;
  className?: string;
  /** Убранные вещи приглушаем, но не скрываем. */
  dimmed?: boolean;
}

export function ItemPhoto({ item, className, dimmed = false }: ItemPhotoProps) {
  const url = usePhotoUrl(item.photoId);

  if (!url) {
    return (
      <span
        aria-hidden
        className={cn(
          "grid h-full w-full place-items-center text-4xl",
          dimmed && "opacity-50",
          className,
        )}
      >
        {SLOT_EMOJI[item.slot]}
      </span>
    );
  }

  return (
    <img
      src={url}
      alt={itemName(item)}
      loading="lazy"
      draggable={false}
      className={cn(
        "h-full w-full object-cover transition-opacity",
        dimmed && "opacity-55",
        className,
      )}
    />
  );
}
