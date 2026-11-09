"use client";

import * as React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  AlertCircle,
  CheckCircle2,
  Database,
  Download,
  Loader2,
  Pencil,
  Upload,
} from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { db } from "@/db/db";
import {
  applyBackup,
  downloadBackup,
  formatBytes,
  readBackupFile,
  type BackupDraft,
} from "@/features/backup/backup";
import { ImportBackupDialog } from "@/features/backup/ImportBackupDialog";
import { itemsCountLabel } from "@/features/items/itemView";
import { useUserName } from "@/features/settings/useUserName";
import { cn } from "@/lib/utils";

interface BackupStats {
  items: number;
  photos: number;
  bytes: number;
}

/** Счётчики для карточки бэкапа. Подписка на таблицы — для живого обновления. */
async function readBackupStats(): Promise<BackupStats> {
  const [items, photos] = await Promise.all([db.items.count(), db.photos.toArray()]);
  return {
    items,
    photos: photos.length,
    bytes: photos.reduce(
      (sum, photo) => sum + (Number.isFinite(photo.bytes) ? photo.bytes : 0),
      0,
    ),
  };
}

type Notice = { kind: "success" | "error"; text: string };

export default function ProfilePage() {
  const { name, isLoading: isNameLoading, saveName } = useUserName();
  const stats = useLiveQuery(readBackupStats, []);

  /* ------------------------------ имя ------------------------------ */

  const [isEditingName, setEditingName] = React.useState(false);
  const [nameDraft, setNameDraft] = React.useState("");
  const [isSavingName, setSavingName] = React.useState(false);
  const [nameError, setNameError] = React.useState<string | null>(null);
  const nameInputId = React.useId();

  const startEditName = () => {
    setNameDraft(name ?? "");
    setNameError(null);
    setEditingName(true);
  };

  const cancelEditName = () => {
    setEditingName(false);
    setNameError(null);
  };

  const submitName = async () => {
    setSavingName(true);
    setNameError(null);
    try {
      await saveName(nameDraft);
      setEditingName(false);
    } catch (err) {
      setNameError(err instanceof Error ? err.message : "Не удалось сохранить имя");
    } finally {
      setSavingName(false);
    }
  };

  /* ----------------------------- бэкап ----------------------------- */

  const fileRef = React.useRef<HTMLInputElement>(null);
  const [isExporting, setExporting] = React.useState(false);
  const [draft, setDraft] = React.useState<BackupDraft | null>(null);
  const [isImporting, setImporting] = React.useState(false);
  const [importError, setImportError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<Notice | null>(null);

  const handleExport = async () => {
    setExporting(true);
    setNotice(null);
    try {
      const summary = await downloadBackup();
      setNotice({
        kind: "success",
        text: `Файл ${summary.fileName} скачан: ${itemsCountLabel(summary.items)}, ${summary.photos} фото, ${formatBytes(summary.bytes)}.`,
      });
    } catch (err) {
      setNotice({
        kind: "error",
        text: err instanceof Error ? err.message : "Не удалось скачать базу",
      });
    } finally {
      setExporting(false);
    }
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setNotice(null);
    setImportError(null);
    try {
      setDraft(await readBackupFile(file));
    } catch (err) {
      setNotice({
        kind: "error",
        text: err instanceof Error ? err.message : "Не удалось прочитать файл",
      });
    }
  };

  const confirmImport = async () => {
    if (!draft) return;
    setImporting(true);
    setImportError(null);
    try {
      const result = await applyBackup(draft);
      setDraft(null);
      const skipped =
        result.skipped > 0
          ? ` Повреждённых записей пропущено: ${result.skipped}.`
          : "";
      setNotice({
        kind: "success",
        text: `База восстановлена: ${itemsCountLabel(result.items)}, ${result.photos} фото.${skipped}`,
      });
    } catch (err) {
      setImportError(
        err instanceof Error ? err.message : "Не удалось загрузить базу",
      );
    } finally {
      setImporting(false);
    }
  };

  const displayName = name ?? "Гость";
  const initial = isNameLoading ? "…" : (name ?? "Г").charAt(0).toUpperCase();

  return (
    <>
      <PageHeader eyebrow="Настройки" title="Профиль" />

      <main className="space-y-6">
        <section
          aria-labelledby="profile-name-title"
          className="rounded-3xl border border-border/60 bg-card p-4 shadow-sm"
        >
          <h2 id="profile-name-title" className="sr-only">
            Профиль
          </h2>

          <div className="flex items-start gap-3">
            <div className="grid size-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-amber-300 to-rose-300 text-lg font-semibold text-white shadow-sm">
              {initial}
            </div>

            <div className="min-w-0 flex-1">
              {isEditingName ? (
                <div className="space-y-2">
                  <label
                    htmlFor={nameInputId}
                    className="text-xs text-muted-foreground"
                  >
                    Как вас зовут
                  </label>
                  <input
                    id={nameInputId}
                    autoFocus
                    value={nameDraft}
                    maxLength={40}
                    disabled={isSavingName}
                    onChange={(event) => {
                      setNameDraft(event.target.value);
                      setNameError(null);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") void submitName();
                      if (event.key === "Escape") cancelEditName();
                    }}
                    className="h-10 w-full rounded-xl border border-border bg-transparent px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                  <div className="flex gap-2">
                    <Button
                      className="rounded-full"
                      onClick={() => void submitName()}
                      disabled={isSavingName}
                    >
                      {isSavingName ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        "Сохранить"
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      className="rounded-full"
                      onClick={cancelEditName}
                      disabled={isSavingName}
                    >
                      Отмена
                    </Button>
                  </div>
                  {nameError ? (
                    <p role="alert" className="text-xs text-destructive">
                      {nameError}
                    </p>
                  ) : null}
                </div>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">Имя</p>
                  <p className="truncate text-base font-semibold">
                    {isNameLoading ? "…" : displayName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Так к вам обращается главный экран.
                  </p>
                </>
              )}
            </div>

            {!isEditingName ? (
              <Button
                variant="outline"
                size="icon"
                className="rounded-full"
                aria-label={name ? "Изменить имя" : "Назвать себя"}
                onClick={startEditName}
                disabled={isNameLoading}
              >
                <Pencil className="size-4" />
              </Button>
            ) : null}
          </div>
        </section>

        <section
          aria-labelledby="backup-title"
          className="space-y-4 rounded-3xl border border-border/60 bg-card p-4 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Database className="size-5" />
            </div>
            <div className="min-w-0">
              <h2 id="backup-title" className="text-base font-semibold">
                Резервная копия
              </h2>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Гардероб хранится в этом браузере. Очистка кэша или новое
                устройство сотрут его — сохраните файл заранее.
              </p>
            </div>
          </div>

          <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-border/60 bg-border/40 text-center">
            <div className="bg-card px-2 py-2.5">
              <dt className="text-[11px] text-muted-foreground">Вещи</dt>
              <dd className="text-sm font-semibold tabular-nums">
                {stats ? stats.items : "…"}
              </dd>
            </div>
            <div className="bg-card px-2 py-2.5">
              <dt className="text-[11px] text-muted-foreground">Фото</dt>
              <dd className="text-sm font-semibold tabular-nums">
                {stats ? stats.photos : "…"}
              </dd>
            </div>
            <div className="bg-card px-2 py-2.5">
              <dt className="text-[11px] text-muted-foreground">Размер</dt>
              <dd className="text-sm font-semibold tabular-nums">
                {stats ? formatBytes(stats.bytes) : "…"}
              </dd>
            </div>
          </dl>

          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              className="w-full gap-2 rounded-xl"
              onClick={() => void handleExport()}
              disabled={isExporting || isImporting}
            >
              {isExporting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              {isExporting ? "Собираем файл…" : "Скачать базу"}
            </Button>

            <Button
              variant="outline"
              className="w-full gap-2 rounded-xl"
              onClick={() => fileRef.current?.click()}
              disabled={isExporting || isImporting}
            >
              <Upload className="size-4" />
              Загрузить базу
            </Button>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            aria-label="Файл резервной копии"
            onChange={(event) => {
              const file = event.target.files?.[0];
              // Сбрасываем значение: иначе повторный выбор того же файла
              // не вызовет change и диалог не откроется.
              event.target.value = "";
              void handleFile(file);
            }}
          />

          {notice ? (
            <p
              role={notice.kind === "error" ? "alert" : "status"}
              className={cn(
                "flex items-start gap-2 rounded-2xl border px-3 py-2 text-xs",
                notice.kind === "error"
                  ? "border-destructive/30 bg-destructive/5 text-destructive"
                  : "border-emerald-600/30 bg-emerald-500/5 text-emerald-700",
              )}
            >
              {notice.kind === "error" ? (
                <AlertCircle className="mt-px size-4 shrink-0" />
              ) : (
                <CheckCircle2 className="mt-px size-4 shrink-0" />
              )}
              <span>{notice.text}</span>
            </p>
          ) : null}

          <p className="text-[11px] leading-relaxed text-muted-foreground">
            В файл попадают вещи, фото и имя. «Загрузить базу» заменяет всё, что
            сейчас в гардеробе, данными из файла.
          </p>
        </section>
      </main>

      {draft ? (
        <ImportBackupDialog
          draft={draft}
          currentItems={stats?.items ?? 0}
          currentPhotos={stats?.photos ?? 0}
          isImporting={isImporting}
          error={importError}
          onCancel={() => {
            if (isImporting) return;
            setDraft(null);
            setImportError(null);
          }}
          onConfirm={() => void confirmImport()}
        />
      ) : null}
    </>
  );
}
