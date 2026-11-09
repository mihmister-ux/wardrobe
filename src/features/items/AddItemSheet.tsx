 "use client";

import * as React from "react";
import { Camera, ImagePlus, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { db } from "@/db/db";
import type { Item, ItemColor, ItemStatus } from "@/db/types";
import {
  COLORS,
  PATTERNS,
  SLOTS,
  TYPES_BY_SLOT,
  TYPE_MAP,
  buildItemDefaults,
} from "@/db/seed/references";
import { SeasonPicker } from "@/features/items/SeasonPicker";
import { SLOT_EMOJI } from "@/features/items/itemView";
import { mergeSeasonRanges, type SeasonId } from "@/features/items/seasons";
import { cn } from "@/lib/utils";

const DEFAULT_STATUS: ItemStatus = "available";

// Сжатие WebP
const MAX_DIMENSION = 800;
const THUMB_DIMENSION = 160;
const WEBP_QUALITY = 0.82;
const THUMB_QUALITY = 0.7;

interface CompressedImage { blob: Blob; thumb: Blob; width: number; height: number; fileName: string; }

function renderToWebP(source: HTMLImageElement | ImageBitmap, maxDimension: number, quality: number) {
  const scale = Math.min(1, maxDimension / Math.max(source.width, source.height));
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas недоступен");
  ctx.drawImage(source, 0, 0, width, height);
  return new Promise<{ blob: Blob; width: number; height: number }>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve({ blob, width, height }) : reject(new Error("Ошибка WebP")), "image/webp", quality);
  });
}

async function compressImage(file: File): Promise<CompressedImage> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const main = await renderToWebP(img, MAX_DIMENSION, WEBP_QUALITY);
    const thumb = await renderToWebP(img, THUMB_DIMENSION, THUMB_QUALITY);
    return { blob: main.blob, thumb: thumb.blob, width: main.width, height: main.height, fileName: file.name };
  } finally { URL.revokeObjectURL(url); }
}

export interface AddItemSheetProps { open: boolean; onOpenChange: (open: boolean) => void; onSaved?: (item: Item) => void; }

interface FormState { photo: CompressedImage | null; previewUrl: string | null; typeId: string | null; seasons: SeasonId[]; color: ItemColor | null; label: string; isSaving: boolean; error: string | null; }

const INITIAL: FormState = { photo: null, previewUrl: null, typeId: null, seasons: [], color: null, label: "", isSaving: false, error: null };

export default function AddItemSheet({ open, onOpenChange, onSaved }: AddItemSheetProps) {
  const [form, setForm] = React.useState<FormState>(INITIAL);
  const galleryRef = React.useRef<HTMLInputElement>(null);
  const cameraRef = React.useRef<HTMLInputElement>(null);
  const titleId = React.useId();

  React.useEffect(() => {
    if (open) return;
    if (form.previewUrl) URL.revokeObjectURL(form.previewUrl);
    setForm(INITIAL);
    // previewUrl намеренно не в зависимостях: чистим ссылку один раз при закрытии.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !form.isSaving) onOpenChange(false);
    };
    window.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, form.isSaving, onOpenChange]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((s) => ({ ...s, [key]: value, error: null }));

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      const previewUrl = URL.createObjectURL(compressed.blob);
      setForm((s) => { if (s.previewUrl) URL.revokeObjectURL(s.previewUrl); return { ...s, photo: compressed, previewUrl, error: null }; });
    } catch (err) { setField("error", err instanceof Error ? err.message : "Ошибка фото"); }
  };

  const canSave = form.photo !== null && form.typeId !== null && form.seasons.length > 0 && form.color !== null && !form.isSaving;

  const handleSave = async () => {
    if (!canSave || !form.photo || !form.typeId || !form.color) return;
    const type = TYPE_MAP[form.typeId];
    const defaults = buildItemDefaults(form.typeId);
    const range = mergeSeasonRanges(form.seasons);
    if (!type || !defaults || !range) return;
    setForm((s) => ({ ...s, isSaving: true, error: null }));
    try {
      const now = Date.now();
      const itemId = crypto.randomUUID();
      const photoId = crypto.randomUUID();

      await db.photos.add({ id: photoId, itemId, main: form.photo.blob, thumb: form.photo.thumb, mime: "image/webp", width: form.photo.width, height: form.photo.height, bytes: form.photo.blob.size, fileName: form.photo.fileName, createdAt: now });

      const item: Item = {
        id: itemId, type: defaults.type, slot: defaults.slot,
        label: form.label.trim() || `${type.label} · ${form.color.label}`,
        color: form.color, pattern: PATTERNS[0].id, texture: defaults.texture,
        warmth: range.warmth, tempMin: range.tempMin, tempMax: range.tempMax,
        waterResistance: defaults.waterResistance, windproof: defaults.windproof,
        formality: defaults.formality, occasions: defaults.occasions,
        tags: [], status: DEFAULT_STATUS, favorite: false,
        photoId, wearCount: 0, source: "manual", createdAt: now, updatedAt: now,
      };

      await db.items.add(item);
      onSaved?.(item);
      onOpenChange(false);
      setForm(INITIAL);
    } catch (err) {
      setForm((s) => ({ ...s, isSaving: false, error: err instanceof Error ? err.message : String(err) }));
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !form.isSaving) onOpenChange(false);
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-t-3xl bg-card shadow-2xl"
      >
        <div className="flex items-center justify-between px-5 pt-5">
          <h2 id={titleId} className="text-xl font-semibold">Новая вещь</h2>
          <Button variant="outline" size="icon" className="rounded-full" onClick={() => onOpenChange(false)} aria-label="Закрыть"><X className="size-4" /></Button>
        </div>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Фото</p>
            <input
              ref={galleryRef}
              type="file"
              accept="image/*"
              className="sr-only"
              aria-label="Выбрать фото из галереи"
              onChange={(event) => {
                void handleFile(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              aria-label="Сделать фото на камеру"
              onChange={(event) => {
                void handleFile(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
            {form.previewUrl ? (
              <div className="relative">
                <img src={form.previewUrl} alt="Превью вещи" className="aspect-square max-h-72 w-full rounded-2xl border border-border object-cover" />
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Убрать фото"
                  className="absolute top-2 right-2 size-8 rounded-full bg-background/85 backdrop-blur"
                  onClick={() => {
                    URL.revokeObjectURL(form.previewUrl!);
                    setForm((s) => ({ ...s, photo: null, previewUrl: null }));
                  }}
                >
                  <X className="size-4" />
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <PhotoSourceButton
                  icon={Camera}
                  title="Сделать фото"
                  hint="камера"
                  onClick={() => cameraRef.current?.click()}
                />
                <PhotoSourceButton
                  icon={ImagePlus}
                  title="Галерея"
                  hint="выбрать файл"
                  onClick={() => galleryRef.current?.click()}
                />
              </div>
            )}
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Тип</p>
            {SLOTS.map((slot) => (
              <div key={slot.id} className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">{slot.label}</p>
                <div className="grid grid-cols-3 gap-2">
                  {TYPES_BY_SLOT[slot.id].map((type) => (
                    <button key={type.id} type="button" aria-label={type.label} onClick={() => setField("typeId", type.id)} className={cn("flex flex-col items-center gap-1 rounded-2xl border p-2 text-xs transition", form.typeId === type.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground")}>
                      <span className="text-2xl">{SLOT_EMOJI[type.slot]}</span>
                      <span className="text-center leading-tight">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <SeasonPicker
            value={form.seasons}
            onChange={(seasons) => setField("seasons", seasons)}
            disabled={form.isSaving}
          />

          <div className="space-y-2">
            <p className="text-sm font-medium">Цвет</p>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((color) => (
                <button key={color.family} type="button" onClick={() => setField("color", color)} className={cn("flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs transition", form.color?.family === color.family ? "border-primary bg-primary/10" : "border-border")}>
                  <span className="size-4 rounded-full border border-border" style={{ backgroundColor: color.hex }} />{color.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Название (необязательно)</p>
            <input value={form.label} onChange={(e) => setField("label", e.target.value)} placeholder="Например: любимый тренч" className="h-10 w-full rounded-xl border border-border px-3 text-sm outline-none focus:border-primary" />
          </div>
        </div>

        <div className="space-y-2 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-1">
          {form.error && <p role="alert" className="text-sm text-destructive">{form.error}</p>}

          <Button
            onClick={() => void handleSave()}
            disabled={!canSave}
            className="w-full rounded-full"
          >
            {form.isSaving ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Сохраняем…
              </>
            ) : (
              "Сохранить"
            )}
          </Button>

          {!canSave && !form.isSaving ? (
            <p className="text-center text-xs text-muted-foreground">
              Нужны фото, тип, хотя бы один сезон и цвет — название можно не
              заполнять.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** Кнопка-источник фото: камера или галерея. */
function PhotoSourceButton({
  icon: Icon,
  title,
  hint,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${title}: ${hint}`}
      className="flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-border px-2 text-muted-foreground transition hover:border-primary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Icon className="size-7" />
      <span className="text-sm font-medium leading-tight">{title}</span>
      <span className="text-xs leading-tight">{hint}</span>
    </button>
  );
}
