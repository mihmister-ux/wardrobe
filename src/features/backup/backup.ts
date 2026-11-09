"use client";

/**
 * Резервная копия всей базы в один JSON-файл.
 *
 * IndexedDB живёт внутри браузера: очистка кэша, «очистить данные сайта»
 * или смена устройства стирают гардероб без предупреждения. Поэтому экспорт
 * сериализует всё, что нужно для полного восстановления:
 *   - вещи (как есть, без ссылок на DOM-объекты);
 *   - фото — Blob'ы превращаются в data URL, формат остаётся прежним;
 *   - настройки.
 *
 * Импорт работает в режиме замены: сначала валидируем весь файл, потом одной
 * транзакцией чистим таблицы и записываем данные. Если что-то пойдёт не так,
 * Dexie откатит транзакцию, и текущая база останется целой.
 */

import { db } from "@/db/db";
import type {
  Formality,
  Item,
  ItemColor,
  ItemStatus,
  Occasion,
  Pattern,
  Photo,
  Settings,
  Slot,
  Texture,
  Warmth,
} from "@/db/types";

export const BACKUP_APP = "wardrobe";
export const BACKUP_VERSION = 1;

/** Фото в файле: те же метаданные, но Blob'ы заменены на data URL. */
export interface SerializedPhoto extends Omit<Photo, "main" | "thumb"> {
  main: string;
  thumb: string;
}

export interface BackupPayload {
  app: typeof BACKUP_APP;
  version: number;
  exportedAt: number;
  counts: BackupCounts;
  items: Item[];
  photos: SerializedPhoto[];
  settings: Settings[];
}

export interface BackupCounts {
  items: number;
  photos: number;
  settings: number;
}

/** Разобранный, но ещё не применённый файл — его показываем в диалоге. */
export interface BackupDraft {
  fileName: string;
  fileSize: number;
  exportedAt: number | null;
  counts: BackupCounts;
  /** Сколько записей отбросили как повреждённые. */
  skipped: number;
  items: Item[];
  photos: SerializedPhoto[];
  settings: Settings[];
}

export interface BackupSummary extends BackupCounts {
  fileName: string;
  bytes: number;
}

export interface ImportResult extends BackupCounts {
  skipped: number;
}

/* ----------------------------- сериализация ------------------------------ */

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Не удалось прочитать фото"));
    reader.readAsDataURL(blob);
  });
}

function dataUrlToBlob(dataUrl: string, fallbackMime: string): Blob {
  const match = /^data:([^;,]*)(;base64)?,([\s\S]*)$/.exec(dataUrl);
  if (!match) throw new Error("Фото в файле повреждено");

  const mime = match[1] || fallbackMime || "application/octet-stream";
  const data = match[3] ?? "";

  if (!match[2]) {
    return new Blob([decodeURIComponent(data)], { type: mime });
  }

  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mime });
}

/** Собирает файл со всеми данными базы. Ничего не скачивает — это отдельный шаг. */
export async function exportBackup(): Promise<BackupPayload> {
  const [items, photoRecords, settings] = await Promise.all([
    db.items.toArray(),
    db.photos.toArray(),
    db.settings.toArray(),
  ]);

  const photos: SerializedPhoto[] = await Promise.all(
    photoRecords.map(async ({ main, thumb, ...meta }) => ({
      ...meta,
      main: await blobToDataUrl(main),
      thumb: await blobToDataUrl(thumb),
    })),
  );

  const counts: BackupCounts = {
    items: items.length,
    photos: photos.length,
    settings: settings.length,
  };

  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: Date.now(),
    counts,
    items,
    photos,
    settings,
  };
}

/* -------------------------------- скачивание ------------------------------ */

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** `wardrobe-2026-11-09-1402.json` — сортируется по имени и не перезаписывает старый. */
export function backupFileName(now = new Date()): string {
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}`;
  return `wardrobe-${date}-${time}.json`;
}

function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.rel = "noopener";
  document.body.append(link);
  link.click();
  link.remove();
  // Браузеру нужно время прочитать объект — мгновенный revoke обрывает загрузку.
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Собирает базу и сразу отдаёт её браузеру как файл. */
export async function downloadBackup(): Promise<BackupSummary> {
  const payload = await exportBackup();
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const fileName = backupFileName();
  saveBlob(blob, fileName);
  return { ...payload.counts, fileName, bytes: blob.size };
}

/* ------------------------------- разбор файла ----------------------------- */

const VALID_SLOTS: readonly Slot[] = [
  "top",
  "bottom",
  "fullbody",
  "outerwear",
  "shoes",
  "accessory",
];

const VALID_OCCASIONS: readonly Occasion[] = [
  "home",
  "work",
  "walk",
  "sport",
  "evening",
  "sleep",
];

const VALID_STATUSES: readonly ItemStatus[] = ["available", "laundry", "archived"];

const VALID_PATTERNS: readonly Pattern[] = ["solid", "stripes", "check", "print", "dots"];

const VALID_TEXTURES: readonly Texture[] = [
  "cotton",
  "linen",
  "denim",
  "knit",
  "wool",
  "fleece",
  "leather",
  "suede",
  "silk",
  "chiffon",
  "synthetic",
  "tweed",
  "velvet",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function asWarmth(value: unknown): Warmth {
  return Math.min(5, Math.max(1, Math.round(asNumber(value, 3)))) as Warmth;
}

function asFormality(value: unknown): Formality {
  return Math.min(3, Math.max(1, Math.round(asNumber(value, 2)))) as Formality;
}

function asWaterResistance(value: unknown): 0 | 1 | 2 {
  return Math.min(2, Math.max(0, Math.round(asNumber(value, 0)))) as 0 | 1 | 2;
}

function sanitizeColor(value: unknown): ItemColor | null {
  if (!isRecord(value)) return null;
  const family = asString(value.family);
  const hex = asString(value.hex);
  const label = asString(value.label);
  if (!family || !hex || !label) return null;
  return { family, hex, label };
}

function sanitizeItem(value: unknown): Item | null {
  if (!isRecord(value)) return null;

  const id = asString(value.id);
  const type = asString(value.type);
  const slot = VALID_SLOTS.find((candidate) => candidate === value.slot);
  const color = sanitizeColor(value.color);
  if (!id || !type || !slot || !color) return null;

  const now = Date.now();
  return {
    id,
    type,
    slot,
    label: asString(value.label) ?? undefined,
    color,
    pattern: asEnum(value.pattern, VALID_PATTERNS, "solid"),
    texture: asEnum(value.texture, VALID_TEXTURES, "cotton"),
    warmth: asWarmth(value.warmth),
    tempMin: Math.round(asNumber(value.tempMin, 0)),
    tempMax: Math.round(asNumber(value.tempMax, 25)),
    waterResistance: asWaterResistance(value.waterResistance),
    windproof: value.windproof === true,
    formality: asFormality(value.formality),
    occasions: Array.isArray(value.occasions)
      ? VALID_OCCASIONS.filter((occasion) => (value.occasions as unknown[]).includes(occasion))
      : [],
    tags: Array.isArray(value.tags)
      ? value.tags.filter((tag): tag is string => typeof tag === "string")
      : [],
    status: asEnum(value.status, VALID_STATUSES, "available"),
    favorite: value.favorite === true,
    photoId: asString(value.photoId) ?? undefined,
    lastWornAt:
      typeof value.lastWornAt === "number" && Number.isFinite(value.lastWornAt)
        ? value.lastWornAt
        : undefined,
    wearCount: Math.max(0, Math.round(asNumber(value.wearCount, 0))),
    source: value.source === "import" ? "import" : "manual",
    createdAt: Math.round(asNumber(value.createdAt, now)),
    updatedAt: Math.round(asNumber(value.updatedAt, now)),
  };
}

function sanitizePhoto(value: unknown): SerializedPhoto | null {
  if (!isRecord(value)) return null;

  const id = asString(value.id);
  const itemId = asString(value.itemId);
  const main = asString(value.main);
  if (!id || !itemId || !main || !main.startsWith("data:")) return null;

  const thumb = asString(value.thumb) ?? main;
  return {
    id,
    itemId,
    main,
    thumb,
    mime: asString(value.mime) ?? "image/webp",
    width: Math.max(0, Math.round(asNumber(value.width, 0))),
    height: Math.max(0, Math.round(asNumber(value.height, 0))),
    bytes: Math.max(0, Math.round(asNumber(value.bytes, 0))),
    fileName: asString(value.fileName) ?? undefined,
    createdAt: Math.round(asNumber(value.createdAt, Date.now())),
  };
}

function sanitizeSettings(value: unknown): Settings | null {
  if (!isRecord(value) || value.id !== "app") return null;
  return {
    id: "app",
    userName: asString(value.userName) ?? undefined,
    city: asString(value.city) ?? "",
    theme: asString(value.theme) ?? "system",
    updatedAt: Math.round(asNumber(value.updatedAt, Date.now())),
  };
}

interface ParsedBackup {
  exportedAt: number | null;
  counts: BackupCounts;
  skipped: number;
  items: Item[];
  photos: SerializedPhoto[];
  settings: Settings[];
}

function parseBackup(raw: unknown): ParsedBackup {
  if (!isRecord(raw)) throw new Error("Это не файл базы Wardrobe");
  if (raw.app !== BACKUP_APP) throw new Error("Это не файл базы Wardrobe");

  const version = asNumber(raw.version, 0);
  if (version > BACKUP_VERSION) {
    throw new Error(
      `Файл создан в более новой версии приложения (${version}). Обновите приложение и попробуйте снова.`,
    );
  }

  if (!Array.isArray(raw.items)) throw new Error("В файле нет списка вещей");
  if (raw.photos !== undefined && !Array.isArray(raw.photos)) {
    throw new Error("Фотографии в файле повреждены");
  }
  if (raw.settings !== undefined && !Array.isArray(raw.settings)) {
    throw new Error("Настройки в файле повреждены");
  }

  let skipped = 0;

  const itemsById = new Map<string, Item>();
  for (const candidate of raw.items) {
    const item = sanitizeItem(candidate);
    if (!item) {
      skipped += 1;
      continue;
    }
    itemsById.set(item.id, item);
  }

  const photos: SerializedPhoto[] = [];
  const photoIds = new Set<string>();
  for (const candidate of raw.photos ?? []) {
    const photo = sanitizePhoto(candidate);
    // Фото без своей вещи бесполезно: не воскрешаем «сирот».
    if (!photo || photoIds.has(photo.id) || !itemsById.has(photo.itemId)) {
      skipped += 1;
      continue;
    }
    photoIds.add(photo.id);
    photos.push(photo);
  }

  // Если ссылка на фото в вещи битая — просто покажем эмодзи слота.
  for (const item of itemsById.values()) {
    if (item.photoId && !photoIds.has(item.photoId)) item.photoId = undefined;
    if (!item.photoId) {
      const linked = photos.find((photo) => photo.itemId === item.id);
      if (linked) item.photoId = linked.id;
    }
  }

  const settings: Settings[] = [];
  for (const candidate of raw.settings ?? []) {
    const record = sanitizeSettings(candidate);
    if (record) settings.push(record);
    else skipped += 1;
  }

  const exportedAt = asNumber(raw.exportedAt, 0);

  return {
    exportedAt: exportedAt > 0 ? exportedAt : null,
    counts: {
      items: itemsById.size,
      photos: photos.length,
      settings: settings.length,
    },
    skipped,
    items: [...itemsById.values()],
    photos,
    settings,
  };
}

/** Читает выбранный файл и проверяет его — без записи в базу. */
export async function readBackupFile(file: File): Promise<BackupDraft> {
  let raw: unknown;
  try {
    raw = JSON.parse(await file.text());
  } catch {
    throw new Error("Не удалось прочитать файл: это не JSON");
  }

  const parsed = parseBackup(raw);
  return {
    fileName: file.name,
    fileSize: file.size,
    exportedAt: parsed.exportedAt,
    counts: parsed.counts,
    skipped: parsed.skipped,
    items: parsed.items,
    photos: parsed.photos,
    settings: parsed.settings,
  };
}

/* --------------------------------- импорт --------------------------------- */

/**
 * Заменяет текущую базу содержимым файла.
 *
 * Blob'ы собираем до транзакции: если data URL окажется битым, база останется
 * нетронутой. Затем одна транзакция на items/photos/settings — либо всё,
 * либо ничего.
 */
export async function applyBackup(draft: BackupDraft): Promise<ImportResult> {
  const photos: Photo[] = await Promise.all(
    draft.photos.map(async (photo) => {
      const main = dataUrlToBlob(photo.main, photo.mime);
      const thumb = photo.thumb === photo.main ? main : dataUrlToBlob(photo.thumb, photo.mime);
      return {
        id: photo.id,
        itemId: photo.itemId,
        main,
        thumb,
        mime: photo.mime,
        width: photo.width,
        height: photo.height,
        // Размер считаем по факту: в старых файлах метаданные могут врать.
        bytes: main.size,
        fileName: photo.fileName,
        createdAt: photo.createdAt,
      };
    }),
  );

  await db.transaction("rw", db.items, db.photos, db.settings, async () => {
    await Promise.all([db.items.clear(), db.photos.clear(), db.settings.clear()]);
    await db.items.bulkPut(draft.items);
    if (photos.length > 0) await db.photos.bulkPut(photos);
    if (draft.settings.length > 0) await db.settings.bulkPut(draft.settings);
  });

  return {
    items: draft.items.length,
    photos: photos.length,
    settings: draft.settings.length,
    skipped: draft.skipped,
  };
}

/* -------------------------------- утилиты --------------------------------- */

/** 1,4 МБ — для подписи под кнопкой скачивания. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 Б";
  const units = ["Б", "КБ", "МБ", "ГБ"];
  const exponent = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / 1024 ** exponent;
  const rounded = value >= 10 || exponent === 0 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded} ${units[exponent]}`;
}
