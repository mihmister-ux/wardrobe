"use client";

import * as React from "react";
import { Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Item } from "@/db/types";
import { itemName } from "@/features/items/itemView";

export interface DeleteItemDialogProps {
  item: Item;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Удаление необратимо, поэтому спрашиваем подтверждение — но только здесь,
 * «убрать из образов» обратимо и подтверждения не требует.
 */
export function DeleteItemDialog({
  item,
  isDeleting,
  onCancel,
  onConfirm,
}: DeleteItemDialogProps) {
  const titleId = React.useId();
  const descriptionId = React.useId();

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isDeleting) onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isDeleting, onCancel]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-[2px]"
    >
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-5 shadow-2xl">
        <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-destructive/10 text-destructive">
          <Trash2 className="size-6" />
        </div>

        <h2 id={titleId} className="mt-3 text-center text-lg font-semibold">
          Удалить вещь?
        </h2>
        <p id={descriptionId} className="mt-1 text-center text-sm text-muted-foreground">
          «{itemName(item)}» пропадёт из гардероба вместе с фотографией. Это действие
          нельзя отменить.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            className="rounded-full"
            onClick={onCancel}
            disabled={isDeleting}
            autoFocus
          >
            Отмена
          </Button>
          <Button
            className="rounded-full bg-destructive text-white hover:bg-destructive/90"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Удаляем…
              </>
            ) : (
              "Удалить"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
