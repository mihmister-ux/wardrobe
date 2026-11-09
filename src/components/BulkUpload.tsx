"use client";

import * as React from "react";
import {
  AlertCircle,
  CheckCircle2,
  FolderOpen,
  ImagePlus,
  Upload,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { db } from "@/db/db";
import type { Item, Photo } from "@/db/types";
import { itemsCountLabel } from "@/features/items/itemView";
import { cn } from "@/lib/utils";

const THUMB_SIZE = 320;
const THUMB_QUALITY = 0.82;

interface Thumb {
  blob: Blob;
  width: number;
  height: number;
}

interface Notice {
  kind: "success" | "error";
  text: string;
}

/**
 * Миниатюра — WebP, а не JPEG: у PNG-фотографий с прозрачным фоном JPEG
 * закрашивает прозрачность чёрным, и вещи выглядят «чёрным на чёрном».
 */
function renderThumb(file: File): Promise<Thumb> {
  return new Promise<Thumb>((resolve, reject) => {
    const url = URL.createObjectURL(file);
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

interface BulkProgress {
  current: number;
  total: number;
}

export function BulkUpload() {
  const [isUploading, setUploading] = React.useState(false);
  const [progress, setProgress] = React.useState<BulkProgress>({
    current: 0,
    total: 0,
  });
  const [notice, setNotice] = React.useState<Notice | null>(null);

  const folderRef = React.useRef<HTMLInputElement>(null);
  const filesRef = React.useRef<HTMLInputElement>(null);

  // Атрибут нестандартный, поэтому ставим его руками: React его не знает.
  React.useEffect(() => {
    folderRef.current?.setAttribute("webkitdirectory", "");
  }, []);

  const processFiles = async (files: File[]) => {
    const images = files.filter((file) => file.type.startsWith("image/"));
    if (images.length === 0) {
      setNotice({
        kind: "error",
        text: "Среди выбранных файлов нет изображений.",
      });
      return;
    }

    setNotice(null);
    setUploading(true);
    setProgress({ current: 0, total: images.length });

    let added = 0;
    let failed = 0;

    for (const file of images) {
      try {
        const thumb = await renderThumb(file);
        const itemId = crypto.randomUUID();
        const photoId = crypto.randomUUID();
        const now = Date.now();

        const item: Item = {
          id: itemId,
          type: "unknown",
          slot: "top",
          label: cleanLabel(file.name),
          color: { family: "gray", hex: "#9AA0A6", label: "Серый" },
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

      setProgress((previous) => ({
        ...previous,
        current: previous.current + 1,
      }));
    }

    setUploading(false);
    setNotice(
      failed === 0
        ? {
            kind: "success",
            text: `Готово: ${itemsCountLabel(added)} в гардеробе. Раздел можно назначить сразу всем — кнопкой «Выбрать несколько».`,
          }
        : {
            kind: "error",
            text: `Добавлено: ${added}, не получилось: ${failed}. Подробности — в консоли браузера.`,
          },
    );
  };

  const handleInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    event.target.value = "";
    if (files) void processFiles(Array.from(files));
  };

  const percent =
    progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : 0;

  return (
    <section
      aria-labelledby="bulk-title"
      className="space-y-3 rounded-3xl border border-border/60 bg-card p-4 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Upload className="size-5" />
        </div>
        <div className="min-w-0">
          <h2 id="bulk-title" className="text-base font-semibold">
            Пакетная загрузка
          </h2>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Каждая фотография станет отдельной вещью. Раздел, цвет и узор потом
            можно назначить массово в гардеробе.
          </p>
        </div>
      </div>

      <input
        ref={folderRef}
        type="file"
        multiple
        accept="image/*"
        className="sr-only"
        aria-label="Выбрать папку с фотографиями"
        onChange={handleInput}
      />
      <input
        ref={filesRef}
        type="file"
        multiple
        accept="image/*"
        className="sr-only"
        aria-label="Выбрать фотографии"
        onChange={handleInput}
      />

      {isUploading ? (
        <div className="space-y-2 rounded-2xl bg-muted/50 px-3 py-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">Добавляем вещи…</span>
            <span className="tabular-nums text-muted-foreground">
              {progress.current} из {progress.total}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            variant="outline"
            className="gap-2 rounded-xl"
            onClick={() => folderRef.current?.click()}
          >
            <FolderOpen className="size-4" />
            Выбрать папку
          </Button>
          <Button
            variant="outline"
            className="gap-2 rounded-xl"
            onClick={() => filesRef.current?.click()}
          >
            <ImagePlus className="size-4" />
            Выбрать файлы
          </Button>
        </div>
      )}

      {notice ? (
        <p
          role={notice.kind === "error" ? "alert" : "status"}
          className={cn(
            "flex items-start gap-2 rounded-2xl border px-3 py-2 text-xs",
            notice.kind === "error"
              ? "border-destructive/30 bg-destructive/5 text-destructive"
              : "border-emerald-600/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300",
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
    </section>
  );
}
