"use client";

import { db } from "@/db/db";

/**
 * Индекс уже загруженных файлов.
 *
 * У новых записей есть `Photo.fileName` — сравниваем полное имя. У старых
 * пакетных импортов имени в фото не было: там единственный след файла —
 * `Item.label`, который старый импорт делал из имени без расширения. Поэтому
 * для них храним отдельный набор базовых имён.
 */
export interface FileIndex {
  /** Полные имена файлов (в нижнем регистре) из новых загрузок. */
  exact: Set<string>;
  /** Базовые имена старых импортов: «img 1234» из «IMG_1234.png». */
  legacy: Set<string>;
  /** Базовое имя → id фото, чтобы дописать настоящее имя при совпадении. */
  legacyPhoto: Map<string, string>;
}

export interface DuplicateMatch {
  kind: "exact" | "legacy";
  /** Ключ, который нашёлся в индексе. */
  key: string;
}

/** Имя без пути, регистр и Unicode-форма не важны. */
export function normalizeFileName(name: string): string {
  return name.normalize("NFC").trim().toLowerCase();
}

/**
 * Имя без расширения, с `_` и `-` вместо пробелов: так выглядит label,
 * который старый пакетный импорт делал из имени файла.
 */
const IMAGE_EXTENSION = /\.(?:png|jpe?g|webp|gif|bmp|avif|heic|heif)$/;

export function baseFileName(name: string): string {
  return normalizeFileName(name)
    .replace(IMAGE_EXTENSION, "")
    .replace(/[_\-\s]+/g, " ")
    .trim();
}

export async function readFileIndex(): Promise<FileIndex> {
  const [photos, items] = await Promise.all([
    db.photos.toArray(),
    db.items.toArray(),
  ]);

  const itemsById = new Map(items.map((item) => [item.id, item]));
  const index: FileIndex = {
    exact: new Set<string>(),
    legacy: new Set<string>(),
    legacyPhoto: new Map<string, string>(),
  };

  for (const photo of photos) {
    if (photo.fileName) {
      index.exact.add(normalizeFileName(photo.fileName));
      continue;
    }

    const item = itemsById.get(photo.itemId);
    // Ручные вещи не считаем: их label — не имя файла.
    if (!item || item.source !== "import" || !item.label) continue;

    const key = baseFileName(item.label);
    if (!key) continue;

    index.legacy.add(key);
    if (!index.legacyPhoto.has(key)) index.legacyPhoto.set(key, photo.id);
  }

  return index;
}

export function findDuplicate(
  fileName: string,
  index: FileIndex,
): DuplicateMatch | null {
  const exact = normalizeFileName(fileName);
  if (index.exact.has(exact)) return { kind: "exact", key: exact };

  const base = baseFileName(fileName);
  if (index.legacy.has(base)) return { kind: "legacy", key: base };

  return null;
}
