/**
 * Определение цвета вещи по её названию.
 *
 * При пакетной загрузке фотографий у вещи нет явно выбранного цвета: раньше
 * всем ставился один и тот же «Чёрный», из-за чего палитра образа и фильтры
 * выглядели недостоверно. Теперь цвет угадывается по имени файла
 * («Синие джинсы.jpg» → Синий), а если знакомого слова в названии нет —
 * ставится нейтральный серый.
 */

import { COLOR_MAP } from "@/db/seed/references";
import type { ColorFamily, ItemColor } from "@/db/types";

/**
 * Порядок важен: более специфичные слова («терракотовый», «бирюзовый»)
 * проверяются раньше общих («красный», «синий»), чтобы не перепутать оттенки.
 */
const WORD_TO_FAMILY: ReadonlyArray<[RegExp, ColorFamily]> = [
  [/терракот/, "red-orange"],
  [/бирюз|turquoise/, "blue-green"],
  [/бордо|бордов|вишн|bordeaux/, "red-violet"],
  [/фиолет|лилов|сиренев|violet|purple/, "violet"],
  [/коричнев|brown/, "brown"],
  [/беж|beige/, "beige"],
  [/ч[её]рн|black/, "black"],
  [/бел\b|белы|white/, "white"],
  [/сер\b|серы|grey|gray/, "gray"],
  [/красн|алый|red/, "red"],
  [/оранж|orange/, "orange"],
  [/ж[её]лт|yellow/, "yellow"],
  [/зел[её]н|green/, "green"],
  [/голуб|син\b|сини|синя|blue/, "blue"],
];

/** Цвет по названию вещи; серый — безопасный нейтральный запасной вариант. */
export function guessItemColor(name: string): ItemColor {
  const normalized = name.trim().toLowerCase();

  if (normalized) {
    for (const [pattern, family] of WORD_TO_FAMILY) {
      if (pattern.test(normalized)) {
        const color = COLOR_MAP[family];
        return { family: color.family, hex: color.hex, label: color.label };
      }
    }
  }

  const gray = COLOR_MAP.gray;
  return { family: gray.family, hex: gray.hex, label: gray.label };
}

/**
 * Старый «цвет по умолчанию» у пакетной загрузки. По нему миграция понимает,
 * что цвет не выбирали вручную и его можно пересчитать из названия.
 */
export function isPlaceholderColor(color: ItemColor | undefined): boolean {
  if (!color) return true;
  return color.family === "black" || color.family === "gray";
}
