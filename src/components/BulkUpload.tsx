"use client";

import * as React from "react";
import {
  AlertCircle,
  CheckCircle2,
  FolderOpen,
  ImagePlus,
  Loader2,
  RefreshCw,
  Upload,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { db } from "@/db/db";
import type { Item, Photo } from "@/db/types";
import { guessItemColorFamily } from "@/features/items/guessColor";
import { itemsCountLabel, plural } from "@/features/items/itemView";
import {
  findDuplicate,
  normalizeFileName,
  readFileIndex,
} from "@/features/wardrobe/uploadDedup";
import { cn } from "@/lib/utils";

// Увеличиваем размер и качество миниатюр для четкости на ПК
const THUMB_SIZE = 600;
const THUMB_QUALITY = 0.9;

type Phase = "idle" | "checking" | "uploading" | "regenerating";

interface Thumb {
  blob: Blob;
  width: number;
  height: number;
}

interface Notice {
  kind: "success" | "error";
  text: string;
}

interface BulkProgress {
  current: number;
  total: number;
  skipped: number;
}

function renderThumb(source: File | Blob): Promise<Thumb> {
  return new Promise<Thumb>((resolve, reject) => {
    const url = URL.createObjectURL(source);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);

      const naturalWidth = image.naturalWidth || 1;
      const naturalHeight = image.naturalHeight || 1;
      const scale = Math.min(1, THUMB_SIZE / Math.max(naturalWidth, naturalHeight));
      const width = Math.max(1, Math.round(naturalWidth * scale));
      const height = Math.max(1, Math.round(naturalHeight * scale));

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("Canvas недоступен"));
        return;
      }

      context.drawImage(image, 0, 0, width, height);
      canvas.toBlob(
        (blob) =>
          blob
            ? resolve({ blob, width: naturalWidth, height: naturalHeight })
            : reject(new Error("Не удалось сжать фото")),
        "image/webp",
        THUMB_QUALITY,
      );
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Файл не похож на изображение"));
    };

    image.src = url;
  });
}

function cleanLabel(fileName: string): string {
  const base = fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!base) return "Новая вещь";
  return base.charAt(0).toUpperCase() + base.slice(1);
}

export function BulkUpload() {
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [progress, setProgress] = React.useState<BulkProgress>({
    current: 0,
    total: 0,
    skipped: 0,
  });
  const [notice, setNotice] = React.useState<Notice | null>(null);

  const folderRef = React.useRef<HTMLInputElement>(null);
  const filesRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    folderRef.current?.setAttribute("webkitdirectory", "");
  }, []);

  const processFiles = async (files: File[]) => {
    const images = files.filter((file) => file.type.startsWith("image/"));
    if (images.length === 0) {
      setNotice({ kind: "error", text: "Среди выбранных файлов нет изображений." });
      return;
    }

    setNotice(null);
    setPhase("checking");
    setProgress({ current: 0, total: images.length, skipped: 0 });

    try {
      const existing = await readFileIndex();
      const pending: File[] = [];
      const backfill: Array<{ id: string; fileName: string }> = [];
      let skipped = 0;

      for (let index = 0; index < images.length; index += 1) {
        const file = images[index];
        const duplicate = findDuplicate(file.name, existing);

        if (duplicate) {
          skipped += 1;
          if (duplicate.kind === "legacy") {
            const photoId = existing.legacyPhoto.get(duplicate.key);
            if (photoId) {
              backfill.push({ id: photoId, fileName: file.name });
              existing.legacy.delete(duplicate.key);
              existing.legacyPhoto.delete(duplicate.key);
              existing.exact.add(normalizeFileName(file.name));
            }
          }
        } else {
          existing.exact.add(normalizeFileName(file.name));
          pending.push(file);
        }
        setProgress({ current: index + 1, total: images.length, skipped });
      }

      if (backfill.length > 0) {
        await db.transaction("rw", db.photos, async () => {
          for (const row of backfill) {
            await db.photos.update(row.id, { fileName: row.fileName });
          }
        });
      }

      if (pending.length === 0) {
        setPhase("idle");
        const filesLabel = `${skipped} ${plural(skipped, ["файл", "файла", "файлов"])}`;
        setNotice({
          kind: "success",
          text: skipped === 1
              ? "Этот файл уже есть в гардеробе — дубликат не создан."
              : `Все ${filesLabel} уже есть в гардеробе — дубликаты не созданы.`,
        });
        return;
      }

      setPhase("uploading");
      setProgress({ current: 0, total: pending.length, skipped });

      let added = 0;
      let failed = 0;

      for (const file of pending) {
        try {
          const thumb = await renderThumb(file);
          const itemId = crypto.randomUUID();
          const photoId = crypto.randomUUID();
          const now = Date.now();
          const label = cleanLabel(file.name);

          const item: Item = {
            id: itemId,
            type: "unknown",
            slot: "top",
            label,
            colors: [guessItemColorFamily(label)],
            pattern: "solid",
            texture: "cotton",
            warmth: 3,
            tempMin: 5,
            tempMax: 20,
            waterResistance: 0,
            windproof: false,
            formality: 2,
            occasions: ["walk", "home"],
            tags: [],
            status: "available",
            favorite: false,
            photoId,
            wearCount: 0,
            source: "import",
            createdAt: now,
            updatedAt: now,
          };

          const photo: Photo = {
            id: photoId,
            itemId,
            main: file,
            thumb: thumb.blob,
            mime: file.type || "image/png",
            width: thumb.width,
            height: thumb.height,
            bytes: file.size,
            fileName: file.name,
            createdAt: now,
          };

          await db.transaction("rw", db.items, db.photos, async () => {
            await db.items.add(item);
            await db.photos.add(photo);
          });

          added += 1;
        } catch (err) {
          failed += 1;
          console.error(`Не удалось загрузить ${file.name}:`, err);
        }

        setProgress((previous) => ({ ...previous, current: previous.current + 1 }));
      }

      setPhase("idle");

      const skippedLabel = `${skipped} ${plural(skipped, ["файл", "файла", "файлов"])}`;

      if (failed > 0) {
        setNotice({
          kind: "error",
          text: `Добавлено ${itemsCountLabel(added)}. Уже было: ${skippedLabel}. Не удалось: ${failed}.`,
        });
      } else if (added === 0) {
        setNotice({ kind: "success", text: `Все ${skippedLabel} уже есть в гардеробе — дубликаты не созданы.` });
      } else {
        setNotice({ kind: "success", text: `Добавлено ${itemsCountLabel(added)}. Уже было: ${skippedLabel}.` });
      }
    } catch (err) {
      setPhase("idle");
      setNotice({
        kind: "error",
        text: err instanceof Error ? err.message : "Не удалось проверить или загрузить файлы",
      });
    }
  };

  // Функция для пересоздания четких миниатюр для уже загруженных фото
  const regenerateThumbnails = async () => {
    setPhase("regenerating");
    setNotice(null);

    try {
      const photos = await db.photos.toArray();
      if (photos.length === 0) {
        setNotice({ kind: "error", text: "В базе пока нет фотографий." });
        setPhase("idle");
        return;
      }

      setProgress({ current: 0, total: photos.length, skipped: 0 });
      let updated = 0;

      for (const photo of photos) {
        try {
          // Берем оригинал (main), генерируем четкую миниатюру и обновляем только thumb
          const thumb = await renderThumb(photo.main);
          await db.photos.update(photo.id, { thumb: thumb.blob });
          updated += 1;
        } catch (err) {
          console.error(`Не удалось обновить миниатюру для фото ${photo.id}:`, err);
        }
        setProgress((prev) => ({ ...prev, current: prev.current + 1 }));
      }

      setNotice({ kind: "success", text: `Обновлено ${updated} миниатюр!` });
    } catch {
      setNotice({ kind: "error", text: "Ошибка при обновлении миниатюр." });
    } finally {
      setPhase("idle");
    }
  };

  const handleInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    event.target.value = "";
    if (files.length > 0) void processFiles(files);
  };

  const isBusy = phase !== "idle";
  const percent = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <section aria-labelledby="bulk-title" className="space-y-3 rounded-3xl border border-border/60 bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Upload className="size-5" />
        </div>
        <div className="min-w-0">
          <h2 id="bulk-title" className="text-base font-semibold">Пакетная загрузка</h2>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Повторный выбор папки безопасен: уже загруженные файлы пропускаются.
          </p>
        </div>
      </div>

      <input ref={folderRef} type="file" multiple accept="image/*" className="sr-only" onChange={handleInput} />
      <input ref={filesRef} type="file" multiple accept="image/*" className="sr-only" onChange={handleInput} />

      {isBusy ? (
        <div className="space-y-2 rounded-2xl bg-muted/50 px-3 py-3">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="flex items-center gap-1.5 font-medium">
              {phase === "checking" && <><Loader2 className="size-3.5 animate-spin" /> Проверяем…</>}
              {phase === "uploading" && "Добавляем вещи…"}
              {phase === "regenerating" && <><RefreshCw className="size-3.5 animate-spin" /> Обновляем миниатюры…</>}
            </span>
            <span className="tabular-nums text-muted-foreground">{progress.current} из {progress.total}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${percent}%` }} />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <Button variant="outline" className="gap-2 rounded-xl" onClick={() => folderRef.current?.click()}>
              <FolderOpen className="size-4" /> Загрузить папку
            </Button>
            <Button variant="outline" className="gap-2 rounded-xl" onClick={() => filesRef.current?.click()}>
              <ImagePlus className="size-4" /> Загрузить файлы
            </Button>
          </div>
          
          <Button variant="secondary" className="w-full gap-2 rounded-xl mt-2" onClick={() => void regenerateThumbnails()}>
            <RefreshCw className="size-4" /> Обновить качество миниатюр
          </Button>
        </div>
      )}

      {notice ? (
        <p role={notice.kind === "error" ? "alert" : "status"} className={cn(
          "flex items-start gap-2 rounded-2xl border px-3 py-2 text-xs",
          notice.kind === "error" ? "border-destructive/30 bg-destructive/5 text-destructive" : "border-emerald-600/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300",
        )}>
          {notice.kind === "error" ? <AlertCircle className="mt-px size-4 shrink-0" /> : <CheckCircle2 className="mt-px size-4 shrink-0" />}
          <span>{notice.text}</span>
        </p>
      ) : null}
    </section>
  );
}