 "use client";

import * as React from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { db } from "@/db/db";
import type { Item, ItemColor, ItemStatus, Slot, Warmth } from "@/db/types";
import {
  COLORS,
  PATTERNS,
  SLOTS,
  TYPES_BY_SLOT,
  TYPE_MAP,
  buildItemDefaults,
} from "@/db/seed/references";
import { cn } from "@/lib/utils";

/** Эмодзи на слот: в справочнике хранятся иконки, а не эмодзи. */
const SLOT_EMOJI: Record<Slot, string> = {
  fullbody: "👗",
  top: "👕",
  bottom: "👖",
  outerwear: "🧥",
  shoes: "👟",
  accessory: "🧣",
};

const DEFAULT_STATUS: ItemStatus = "available";

/* ── Сезон ──────────────────────────────────────────────────────────────
 * По фото плотность ткани не определить, поэтому сезон спрашиваем явно:
 * он задаёт и температурный диапазон, и уровень тепла (warmth 1/3/5).
 * ─────────────────────────────────────────────────────────────────────── */

type SeasonId = "summer" | "demi" | "winter";

interface SeasonDef {
  id: SeasonId;
  label: string;
  emoji: string;
  tempMin: number;
  tempMax: number;
  /** Уровень тепла вещи: лето — 1, демисезон — 3, зима — 5. */
  warmth: Warmth;
}

const SEASONS: readonly SeasonDef[] = [
  { id: "summer", label: "Лето", emoji: "☀️", tempMin: 15, tempMax: 35, warmth: 1 },
  { id: "demi", label: "Демисезон", emoji: "🍂", tempMin: -5, tempMax: 15, warmth: 3 },
  { id: "winter", label: "Зима", emoji: "❄️", tempMin: -20, tempMax: 5, warmth: 5 },
];

const SEASON_MAP: Record<SeasonId, SeasonDef> = Object.fromEntries(
  SEASONS.map((season) => [season.id, season]),
) as Record<SeasonId, SeasonDef>;

/** Минус типографский: −5 читается лучше, чем -5. */
const formatTemp = (value: number): string =>
  value < 0 ? `−${Math.abs(value)}` : String(value);

const formatRange = (season: Pick<SeasonDef, "tempMin" | "tempMax">): string =>
  `${formatTemp(season.tempMin)}…${formatTemp(season.tempMax)} °C`;

// Сжатие WebP
const MAX_DIMENSION = 800;
const THUMB_DIMENSION = 160;
const WEBP_QUALITY = 0.82;
const THUMB_QUALITY = 0.7;

interface CompressedImage { blob: Blob; thumb: Blob; width: number; height: number; }

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
    return { blob: main.blob, thumb: thumb.blob, width: main.width, height: main.height };
  } finally { URL.revokeObjectURL(url); }
}

export interface AddItemSheetProps { open: boolean; onOpenChange: (open: boolean) => void; onSaved?: (item: Item) => void; }

interface FormState { photo: CompressedImage | null; previewUrl: string | null; typeId: string | null; season: SeasonId | null; color: ItemColor | null; label: string; isSaving: boolean; error: string | null; }

const INITIAL: FormState = { photo: null, previewUrl: null, typeId: null, season: null, color: null, label: "", isSaving: false, error: null };

export default function AddItemSheet({ open, onOpenChange, onSaved }: AddItemSheetProps) {
  const [form, setForm] = React.useState<FormState>(INITIAL);
  const fileRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open) { if (form.previewUrl) URL.revokeObjectURL(form.previewUrl); setForm(INITIAL); }
  }, [open]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((s) => ({ ...s, [key]: value, error: null }));

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      const previewUrl = URL.createObjectURL(compressed.blob);
      setForm((s) => { if (s.previewUrl) URL.revokeObjectURL(s.previewUrl); return { ...s, photo: compressed, previewUrl, error: null }; });
    } catch (err) { setField("error", err instanceof Error ? err.message : "Ошибка фото"); }
  };

  const canSave = form.photo !== null && form.typeId !== null && form.season !== null && form.color !== null && !form.isSaving;

  const handleSave = async () => {
    if (!canSave || !form.photo || !form.typeId || !form.season || !form.color) return;
    const type = TYPE_MAP[form.typeId];
    const defaults = buildItemDefaults(form.typeId);
    if (!type || !defaults) return;
    const season = SEASON_MAP[form.season];
    setForm((s) => ({ ...s, isSaving: true, error: null }));
    try {
      const now = Date.now();
      const itemId = crypto.randomUUID();
      const photoId = crypto.randomUUID();

      await db.photos.add({ id: photoId, itemId, main: form.photo.blob, thumb: form.photo.thumb, mime: "image/webp", width: form.photo.width, height: form.photo.height, bytes: form.photo.blob.size, createdAt: now });

      const item: Item = {
        id: itemId, type: defaults.type, slot: defaults.slot,
        label: form.label.trim() || `${type.label} · ${form.color.label}`,
        color: form.color, pattern: PATTERNS[0].id, texture: defaults.texture,
        warmth: season.warmth, tempMin: season.tempMin, tempMax: season.tempMax,
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
      <div className="w-full max-w-md rounded-t-3xl bg-white p-5 sm:rounded-3xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Новая вещь</h2>
          <Button variant="outline" size="icon" onClick={() => onOpenChange(false)}><X className="size-4" /></Button>
        </div>

        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Фото</p>
            <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={(e) => void handleFile(e.target.files?.[0])} />
            {form.previewUrl ? (
              <div className="relative">
                <img src={form.previewUrl} alt="Превью" className="aspect-square w-full rounded-2xl object-cover" />
                <Button variant="outline" size="icon" className="absolute top-2 right-2 size-8 rounded-full bg-white/80" onClick={() => setForm((s) => ({ ...s, photo: null, previewUrl: null }))}><X className="size-4" /></Button>
              </div>
            ) : (
              <button type="button" onClick={() => fileRef.current?.click()} className="grid aspect-square w-full place-items-center rounded-2xl border-2 border-dashed border-border text-muted-foreground hover:border-primary">
                <span className="flex flex-col items-center gap-1.5"><ImagePlus className="size-8" /><span className="text-sm">Загрузить фото</span></span>
              </button>
            )}
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Тип</p>
            {SLOTS.map((slot) => (
              <div key={slot.id} className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">{slot.label}</p>
                <div className="grid grid-cols-3 gap-2">
                  {TYPES_BY_SLOT[slot.id].map((type) => (
                    <button key={type.id} type="button" onClick={() => setField("typeId", type.id)} className={cn("flex flex-col items-center gap-1 rounded-2xl border p-2 text-xs transition", form.typeId === type.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground")}>
                      <span className="text-2xl">{SLOT_EMOJI[type.slot]}</span>
                      <span className="text-center leading-tight">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Сезон</p>
            <div className="grid grid-cols-3 gap-2">
              {SEASONS.map((season) => {
                const isSelected = form.season === season.id;
                return (
                  <button
                    key={season.id}
                    type="button"
                    onClick={() => setField("season", season.id)}
                    aria-pressed={isSelected}
                    className={cn("flex flex-col items-center gap-0.5 rounded-2xl border px-1 py-2 text-xs transition", isSelected ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40")}
                  >
                    <span className="text-lg leading-none" aria-hidden>{season.emoji}</span>
                    <span className="font-medium leading-tight">{season.label}</span>
                    <span className="text-xs leading-tight tabular-nums">{formatRange(season)}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              {form.season
                ? `В образы вещь попадёт при ${formatRange(SEASON_MAP[form.season])}, плотность ${SEASON_MAP[form.season].warmth} из 5.`
                : "Выберите сезон: от него зависят и температура, при которой вещь попадёт в образ, и её плотность."}
            </p>
          </div>

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

        {form.error && <p className="mt-2 text-sm text-red-500">{form.error}</p>}

        <Button onClick={() => void handleSave()} disabled={!canSave} className="mt-4 w-full rounded-full">
          {form.isSaving ? <><Loader2 className="mr-2 size-4 animate-spin" /> Сохраняем…</> : "Сохранить"}
        </Button>
      </div>
    </div>
  );
}
