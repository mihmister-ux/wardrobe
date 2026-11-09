"use client";

import * as React from "react";
import {
  AlertCircle,
  CheckCircle2,
  CheckSquare,
  Plus,
  Shirt,
  X,
} from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { db } from "@/db/db";
import { SLOT_MAP, typeForSlot } from "@/db/seed/references";
import type { Item, Slot } from "@/db/types";
import { itemsCountLabel } from "@/features/items/itemView";
import { BulkSlotDialog } from "@/features/wardrobe/BulkSlotDialog";
import { DeleteItemDialog } from "@/features/wardrobe/DeleteItemDialog";
import { EditItemSheet } from "@/features/wardrobe/EditItemSheet";
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
  const [editingItem, setEditingItem] = React.useState<Item | null>(null);

  /* ---------------------- массовое редактирование ---------------------- */

  const [isSelecting, setSelecting] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(
    () => new Set(),
  );
  const [isBulkOpen, setBulkOpen] = React.useState(false);
  const [isBulkApplying, setBulkApplying] = React.useState(false);
  const [bulkError, setBulkError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  const selectedCount = React.useMemo(
    () => items.reduce((count, item) => count + (selectedIds.has(item.id) ? 1 : 0), 0),
    [items, selectedIds],
  );
  const allSelected = total > 0 && selectedCount === total;

  const toggleSelecting = () => {
    setSelecting((value) => !value);
    setSelectedIds(new Set());
    setBulkOpen(false);
    setBulkError(null);
    setOpenMenuId(null);
    setNotice(null);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(items.map((item) => item.id)));
  const clearSelection = () => setSelectedIds(new Set());

  const applyBulkSlot = async (slot: Slot) => {
    const ids = items
      .filter((item) => selectedIds.has(item.id))
      .map((item) => item.id);
    if (ids.length === 0) return;

    setBulkApplying(true);
    setBulkError(null);
    try {
      await db.transaction("rw", db.items, async () => {
        for (const id of ids) {
          const current = await db.items.get(id);
          if (!current) continue;
          await db.items.update(id, {
            slot,
            // Тип подстраиваем под раздел: у импортированных вещей он unknown.
            type: typeForSlot(slot, current.type),
            updatedAt: Date.now(),
          });
        }
      });

      setNotice(
        `${itemsCountLabel(ids.length)}: раздел «${SLOT_MAP[slot].label}».`,
      );
      setBulkOpen(false);
      setSelecting(false);
      setSelectedIds(new Set());
    } catch (err) {
      setBulkError(
        err instanceof Error ? err.message : "Не удалось изменить раздел",
      );
    } finally {
      setBulkApplying(false);
    }
  };

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
          <div className="flex items-center gap-1.5">
            {total > 0 ? (
              <Button
                variant={isSelecting ? "secondary" : "outline"}
                className="gap-1.5 rounded-full px-3"
                onClick={toggleSelecting}
                aria-pressed={isSelecting}
                aria-label={
                  isSelecting ? "Закончить выбор" : "Выбрать несколько вещей"
                }
              >
                {isSelecting ? (
                  <X className="size-4" />
                ) : (
                  <CheckSquare className="size-4" />
                )}
                <span className="hidden sm:inline">
                  {isSelecting ? "Готово" : "Выбрать несколько"}
                </span>
              </Button>
            ) : null}

            {onAddItem ? (
              <Button
                variant="outline"
                className="gap-1.5 rounded-full px-3"
                onClick={onAddItem}
                aria-label="Добавить вещь"
              >
                <Plus className="size-4" />
                <span>Добавить вещь</span>
              </Button>
            ) : null}
          </div>
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

        {notice ? (
          <p
            role="status"
            className="flex items-start gap-2 rounded-2xl border border-emerald-600/30 bg-emerald-500/5 px-3 py-2.5 text-xs text-emerald-700 dark:text-emerald-300"
          >
            <CheckCircle2 className="mt-px size-4 shrink-0" />
            <span>{notice}</span>
          </p>
        ) : null}

        {isSelecting ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-secondary/70 px-3 py-2.5">
            <p className="text-sm font-medium">
              {selectedCount === 0
                ? "Отметьте вещи, которым нужен новый раздел"
                : `Выбрано ${itemsCountLabel(selectedCount)}`}
            </p>
            <button
              type="button"
              onClick={allSelected ? clearSelection : selectAll}
              className="ml-auto rounded-full px-2.5 py-1 text-xs font-medium text-primary transition hover:bg-primary/10"
            >
              {allSelected ? "Снять всё" : "Выбрать все"}
            </button>
          </div>
        ) : null}

        {isLoading ? (
          <section
            aria-busy="true"
            aria-label="Загружаем вещи"
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
          >
            {Array.from({ length: 6 }, (_, index) => (
              <div
                key={index}
                className="rounded-3xl bg-slate-100 p-2.5 dark:bg-slate-800"
              >
                <div className="aspect-square animate-pulse rounded-2xl bg-muted" />
                <div className="space-y-2 px-1 py-3">
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
                  selectionMode={isSelecting}
                  isSelected={selectedIds.has(item.id)}
                  onMenuOpenChange={(open) =>
                    setOpenMenuId(open ? item.id : null)
                  }
                  onEdit={() => setEditingItem(item)}
                  onToggleSelect={() => toggleSelect(item.id)}
                  onArchiveToggle={() =>
                    void setArchived(item, item.status !== "archived")
                  }
                  onRequestDelete={() => setPendingDelete(item)}
                />
              ))}
            </section>

            {isSelecting ? (
              <div aria-hidden className="h-28 md:h-20" />
            ) : null}

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

      {/* Панель выбора: висит над нижним доком и не перекрывает сетку. */}
      {isSelecting ? (
        <div className="fixed inset-x-0 bottom-[calc(6.25rem+env(safe-area-inset-bottom))] z-40 px-4 md:bottom-6 md:left-60 md:px-8">
          <div className="mx-auto flex w-full max-w-md items-center gap-2 rounded-3xl border border-border/60 bg-background/95 p-2 pl-4 shadow-2xl backdrop-blur md:max-w-2xl">
            <span className="text-sm font-medium">
              {selectedCount > 0
                ? `Выбрано ${itemsCountLabel(selectedCount)}`
                : "Ничего не выбрано"}
            </span>
            <Button
              className="ml-auto rounded-full"
              disabled={selectedCount === 0}
              onClick={() => {
                setBulkError(null);
                setBulkOpen(true);
              }}
            >
              Изменить раздел
            </Button>
          </div>
        </div>
      ) : null}

      {pendingDelete ? (
        <DeleteItemDialog
          item={pendingDelete}
          isDeleting={busyId === pendingDelete.id}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => void confirmDelete()}
        />
      ) : null}

      {editingItem ? (
        <EditItemSheet
          key={editingItem.id}
          item={editingItem}
          onClose={() => setEditingItem(null)}
        />
      ) : null}

      {isBulkOpen ? (
        <BulkSlotDialog
          count={selectedCount}
          isApplying={isBulkApplying}
          error={bulkError}
          onCancel={() => {
            if (isBulkApplying) return;
            setBulkOpen(false);
            setBulkError(null);
          }}
          onApply={(slot) => void applyBulkSlot(slot)}
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
