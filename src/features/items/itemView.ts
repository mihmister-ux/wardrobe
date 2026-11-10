"use client";

/**
 * Как вещь выглядит в интерфейсе: имя, тип, эмодзи слота, температурный
 * диапазон. Общие подписи для главной, гардероба и формы добавления —
 * чтобы «Свитер · Серый» везде читался одинаково.
 */

import type { Item, Slot } from "@/db/types";
import { SLOT_MAP, TYPE_MAP } from "@/db/seed/references";

export const SLOT_EMOJI: Record<Slot, string> = {
  fullbody: "👗",
  top: "👕",
  bottom: "👖",
  outerwear: "🧥",
  shoes: "👟",
  accessory: "🧣",
};

/**
 * Название вещи для показа: пользовательское имя с заглавной буквы, иначе —
 * тип или раздел из справочника.
 *
 * Пакетная загрузка берёт имя из имени файла фотографии, поэтому название
 * может быть похоже на дату («20261107 131845»). Такое служебное имя заменяем
 * на тип вещи, чтобы вместо «сырого ID» пользователь видел «Верх» или «Обувь».
 */
const TIMESTAMP_LABEL = /^\d{4,8}(?:[ _-]\d{4,6})?$/u;

export function itemName(item: Pick<Item, "label" | "type" | "slot">): string {
  const raw = item.label?.trim();
  if (!raw || TIMESTAMP_LABEL.test(raw)) return itemTypeLabel(item);
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

/** Тип из справочника — без пользовательского названия. */
export function itemTypeLabel(item: Pick<Item, "type" | "slot">): string {
  // У вещей из пакетной загрузки type = "unknown": показываем раздел,
  // а не английское служебное слово.
  return TYPE_MAP[item.type]?.label ?? slotLabel(item.slot);
}

export function slotLabel(slot: Slot): string {
  return SLOT_MAP[slot]?.label ?? slot;
}

/** Минус типографский: −5 читается лучше, чем -5. */
export function formatTemp(value: number): string {
  return value < 0 ? `−${Math.abs(value)}` : String(value);
}

export function formatItemRange(item: Pick<Item, "tempMin" | "tempMax">): string {
  return `${formatTemp(item.tempMin)}…${formatTemp(item.tempMax)} °C`;
}

const PLURAL: [string, string, string] = ["вещь", "вещи", "вещей"];

/** 1 вещь, 2 вещи, 5 вещей. */
export function plural(count: number, forms: [string, string, string]): string {
  const mod100 = Math.abs(count) % 100;
  const mod10 = mod100 % 10;
  if (mod100 > 10 && mod100 < 20) return forms[2];
  if (mod10 === 1) return forms[0];
  if (mod10 >= 2 && mod10 <= 4) return forms[1];
  return forms[2];
}

export function itemsCountLabel(count: number): string {
  return `${count} ${plural(count, PLURAL)}`;
}
