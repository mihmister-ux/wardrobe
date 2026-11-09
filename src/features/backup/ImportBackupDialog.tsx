"use client";

import * as React from "react";
import { Loader2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { BackupDraft } from "@/features/backup/backup";
import { formatBytes } from "@/features/backup/backup";
import { itemsCountLabel } from "@/features/items/itemView";

export interface ImportBackupDialogProps {
  draft: BackupDraft;
  currentItems: number;
  currentPhotos: number;
  isImporting: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

const DATE_FORMATTER = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

function exportedAtLabel(value: number | null): string {
  return value === null ? "дата неизвестна" : DATE_FORMATTER.format(new Date(value));
}

/**
 * Импорт заменяет базу целиком, поэтому показываем, что именно приедет из
 * файла и что будет стёрто. Скачать текущую базу можно, не закрывая диалог.
 */
export function ImportBackupDialog({
  draft,
  currentItems,
  currentPhotos,
  isImporting,
  error,
  onCancel,
  onConfirm,
}: ImportBackupDialogProps) {
  const titleId = React.useId();
  const descriptionId = React.useId();

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isImporting) onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isImporting, onCancel]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-[2px]"
    >
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-5 shadow-2xl">
        <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Upload className="size-6" />
        </div>

        <h2 id={titleId} className="mt-3 text-center text-lg font-semibold">
          Загрузить базу?
        </h2>
        <p id={descriptionId} className="mt-1 text-center text-sm text-muted-foreground">
          Текущие вещи и фото будут удалены и заменены данными из файла. Это
          действие нельзя отменить.
        </p>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Если не уверены — отмените и сначала скачайте текущую базу.
        </p>

        <div className="mt-4 space-y-2 rounded-2xl border border-border/70 bg-muted/40 p-3 text-xs">
          <p className="truncate font-medium" title={draft.fileName}>
            {draft.fileName}
          </p>
          <p className="text-muted-foreground">
            {formatBytes(draft.fileSize)} · сохранено {exportedAtLabel(draft.exportedAt)}
          </p>

          <dl className="grid grid-cols-2 gap-2 pt-1">
            <div>
              <dt className="text-muted-foreground">В файле</dt>
              <dd className="font-medium">
                {itemsCountLabel(draft.counts.items)} · {draft.counts.photos} фото
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Сейчас в базе</dt>
              <dd className="font-medium">
                {itemsCountLabel(currentItems)} · {currentPhotos} фото
              </dd>
            </div>
          </dl>

          {draft.skipped > 0 ? (
            <p className="text-muted-foreground">
              Повреждённых записей будет пропущено: {draft.skipped}.
            </p>
          ) : null}
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
            disabled={isImporting}
            autoFocus
          >
            Отмена
          </Button>
          <Button className="rounded-full" onClick={onConfirm} disabled={isImporting}>
            {isImporting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Загружаем…
              </>
            ) : (
              "Заменить"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
