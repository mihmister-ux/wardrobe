"use client";

import * as React from "react";
import { Loader2, Layers } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SLOTS } from "@/db/seed/references";
import type { Slot } from "@/db/types";
import { SLOT_EMOJI, plural } from "@/features/items/itemView";
import { cn } from "@/lib/utils";

export interface BulkSlotDialogProps {
  count: number;
  isApplying: boolean;
  error: string | null;
  onCancel: () => void;
  onApply: (slot: Slot) => void;
}

/**
 * Массовая смена раздела: одна операция для десятков вещей. Названия, цвета
 * и фотографии не меняются — только слот, по которому работает подбор.
 */
export function BulkSlotDialog({
  count,
  isApplying,
  error,
  onCancel,
  onApply,
}: BulkSlotDialogProps) {
  const [slot, setSlot] = React.useState<Slot | null>(null);
  const titleId = React.useId();
  const descriptionId = React.useId();

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isApplying) onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isApplying, onCancel]);

  const selected = slot ? SLOTS.find((item) => item.id === slot) : undefined;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/50 p-4 backdrop-blur-[2px]"
    >
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-5 shadow-2xl">
        <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Layers className="size-6" />
        </div>

        <h2 id={titleId} className="mt-3 text-center text-lg font-semibold">
          Изменить раздел
        </h2>
        <p id={descriptionId} className="mt-1 text-center text-sm text-muted-foreground">
          У {plural(count, ["вещи", "вещей", "вещей"])} раздел станет одним и
          тем же. Названия, цвета и фото не изменятся.
        </p>

        <div
          role="group"
          aria-label="Новый раздел"
          className="mt-4 grid grid-cols-2 gap-2"
        >
          {SLOTS.map((option) => {
            const isSelected = slot === option.id;
            return (
              <button
                key={option.id}
                type="button"
                aria-label={option.label}
                aria-pressed={isSelected}
                disabled={isApplying}
                onClick={() => setSlot(option.id)}
                className={cn(
                  "flex items-center gap-2 rounded-2xl border px-3 py-2.5 text-left text-sm transition disabled:opacity-60",
                  isSelected
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border text-muted-foreground hover:border-primary/40",
                )}
              >
                <span className="text-xl leading-none" aria-hidden>
                  {SLOT_EMOJI[option.id]}
                </span>
                <span className="font-medium leading-tight">{option.label}</span>
              </button>
            );
          })}
        </div>

        {error ? (
          <p
            role="alert"
            className="mt-3 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive"
          >
            {error}
          </p>
        ) : null}

        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            className="rounded-full"
            onClick={onCancel}
            disabled={isApplying}
          >
            Отмена
          </Button>
          <Button
            className="rounded-full"
            disabled={!selected || isApplying}
            onClick={() => {
              if (slot) onApply(slot);
            }}
          >
            {isApplying ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Применяем…
              </>
            ) : selected ? (
              `Сделать «${selected.label}»`
            ) : (
              "Применить"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
