"use client";

import * as React from "react";
import { AlertCircle, Plus, Shirt } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import type { Item } from "@/db/types";
import { itemsCountLabel } from "@/features/items/itemView";
import { DeleteItemDialog } from "@/features/wardrobe/DeleteItemDialog";
import { ItemCard } from "@/features/wardrobe/ItemCard";
import { useWardrobe } from "@/features/wardrobe/useWardrobe";

export interface WardrobePageProps {
  onAddItem?: () => void;
}

export default function WardrobePage({ onAddItem }: WardrobePageProps) {
  const {
    items,
    total,
    activeCount,
    archivedCount,
    isLoading,
    busyId,
    error,
    clearError,
    setArchived,
    remove,
  } = useWardrobe();

  // Открытое меню — только у одной карточки: два дропдауна одновременно
  // на телефоне перекрывают друг друга.
  const [openMenuId, setOpenMenuId] = React.useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = React.useState<Item | null>(null);

  const eyebrow = isLoading
    ? "Читаем гардероб"
    : total === 0
      ? "Пока пусто"
      : archivedCount > 0
        ? `${itemsCountLabel(total)} · ${archivedCount} убрано`
        : itemsCountLabel(total);

  const confirmDelete = React.useCallback(async () => {
    if (!pendingDelete) return;
    const removed = await remove(pendingDelete);
    if (removed) setPendingDelete(null);
  }, [pendingDelete, remove]);

  return (
    <>
      <PageHeader
        eyebrow={eyebrow}
        title="Гардероб"
        action={
          onAddItem ? (
            <Button
              variant="outline"
              className="gap-2 rounded-full"
              onClick={onAddItem}
              aria-label="Добавить вещь"
            >
              <Plus className="size-4" />
              <span className="hidden sm:inline">Добавить</span>
            </Button>
          ) : null
        }
      />

      <main className="space-y-4">
        {error ? (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-xs text-destructive"
          >
            <AlertCircle className="mt-px size-4 shrink-0" />
            <p className="flex-1">{error}</p>
            <button
              type="button"
              onClick={clearError}
              className="shrink-0 font-medium underline underline-offset-2"
            >
              Скрыть
            </button>
          </div>
        ) : null}

        {isLoading ? (
          <section aria-busy="true" aria-label="Загружаем вещи" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 6 }, (_, index) => (
              <div
                key={index}
                className="overflow-hidden rounded-3xl border border-border/60 bg-card"
              >
                <div className="aspect-square animate-pulse bg-muted" />
                <div className="space-y-2 px-3 py-3">
                  <div className="h-3.5 w-3/4 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </section>
        ) : total === 0 ? (
          <EmptyWardrobe onAddItem={onAddItem} />
        ) : (
          <>
            <section
              aria-label="Вещи"
              className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4"
            >
              {items.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  isMenuOpen={openMenuId === item.id}
                  isBusy={busyId === item.id}
                  onMenuOpenChange={(open) => setOpenMenuId(open ? item.id : null)}
                  onArchiveToggle={() =>
                    void setArchived(item, item.status !== "archived")
                  }
                  onRequestDelete={() => setPendingDelete(item)}
                />
              ))}
            </section>

            <p className="text-xs leading-relaxed text-muted-foreground">
              {activeCount > 0
                ? `${activeCount} ${activeCount === 1 ? "вещь участвует" : "вещи участвуют"} в подборе на главной. `
                : "Пока ни одна вещь не участвует в подборе. "}
              «Убрать из образов» прячет вещь из образов, но оставляет её здесь —
              вернуть можно тем же меню.
            </p>
          </>
        )}
      </main>

      {pendingDelete ? (
        <DeleteItemDialog
          item={pendingDelete}
          isDeleting={busyId === pendingDelete.id}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => void confirmDelete()}
        />
      ) : null}
    </>
  );
}

function EmptyWardrobe({ onAddItem }: { onAddItem?: () => void }) {
  return (
    <section className="rounded-3xl border border-dashed border-border bg-card/60 px-6 py-9 text-center">
      <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
        <Shirt className="size-7" />
      </div>

      <h2 className="mt-4 text-base font-semibold">Гардероб пока пуст</h2>
      <p className="mx-auto mt-1 max-w-[19rem] text-sm text-muted-foreground">
        Добавьте первую вещь: фото, тип, цвет и сезон. Она сразу появится здесь
        и в подборе образа на главной.
      </p>

      {onAddItem ? (
        <Button className="mt-4 rounded-full" onClick={onAddItem}>
          <Plus className="size-4" />
          Добавить вещь
        </Button>
      ) : null}
    </section>
  );
}
