/**
 * colors.ts — правила сочетаемости цветов.
 *
 * Модуль не знает, откуда пришла палитра: на вход — «роль вещи → цвет»,
 * на выход — оценка 0..100 и короткая подпись для карточки образа.
 * Правила простые и объяснимые: за каждое начисление есть причина, которую
 * можно показать человеку. Логика намеренно не зависит от db/ и redux-подобных
 * слоёв, поэтому её легко покрыть тестами.
 */

export type PieceRole = 'top' | 'bottom' | 'fullbody' | 'outerwear' | 'shoes' | 'accessory';

export interface PaletteColor {
  /** Семейство цвета: по нему определяется монохром. */
  family: string;
  /** HEX: позволяет отличить «тот же цвет» от «другого оттенка». */
  hex: string;
  label?: string;
}

export interface PalettePiece {
  role: PieceRole;
  /**
   * Все цвета вещи: основной и, если он есть, дополнительный. Одноцветная
   * вещь даёт массив из одного элемента, двухцветная — из двух.
   */
  colors: PaletteColor[];
}

export type HarmonyId =
  | 'monochrome'
  | 'monochrome-shades'
  | 'neutral-accent'
  | 'neutral-only'
  | 'analogous'
  | 'contrast'
  | 'busy'
  | 'mixed';

export interface HarmonyBonus {
  id: string;
  /** Короткая подпись правила. */
  label: string;
  /** Что это значит для образа. */
  detail: string;
  /** Вклад в балл: плюс или минус. */
  points: number;
}

export interface HarmonyAssessment {
  /** Итоговый балл 0..100. */
  score: number;
  /** Главное правило — оно же подпись на карточке. */
  id: HarmonyId;
  label: string;
  detail: string;
  /** Все сработавшие правила, от сильнейшего к слабейшему. */
  bonuses: HarmonyBonus[];
}

/* ------------------------------ палитра ---------------------------------- */

/**
 * Нейтральные семейства: сочетаются между собой и с любым цветом.
 * Совпадает с `isNeutral` в справочнике цветов (white/beige/brown/gray/black).
 */
const NEUTRAL_FAMILIES: ReadonlySet<string> = new Set([
  'white',
  'black',
  'beige',
  'gray',
  'brown',
]);

export const isNeutralFamily = (family: string): boolean => NEUTRAL_FAMILIES.has(family);

/** Цветовой круг в порядке оттенков: соседи — родственные, через шесть — контраст. */
const WHEEL = [
  'red',
  'red-orange',
  'orange',
  'yellow-orange',
  'yellow',
  'yellow-green',
  'green',
  'blue-green',
  'blue',
  'blue-violet',
  'violet',
  'red-violet',
] as const;

/** Расстояние по кругу в шагах: 0 — тот же оттенок, 6 — комплементарный. */
export function hueDistance(a: string, b: string): number {
  const left = WHEEL.indexOf(a as (typeof WHEEL)[number]);
  const right = WHEEL.indexOf(b as (typeof WHEEL)[number]);
  if (left < 0 || right < 0) return Number.POSITIVE_INFINITY;
  const diff = Math.abs(left - right);
  return Math.min(diff, WHEEL.length - diff);
}

function hexToRgb(hex: string): [number, number, number] | null {
  const value = hex.trim().replace(/^#/, '');
  if (!/^[0-9a-f]{6}$/i.test(value)) return null;
  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16),
  ];
}

/** Насколько далеко два оттенка: 0 — один и тот же цвет. */
export function hexDistance(a: string, b: string): number {
  const left = hexToRgb(a);
  const right = hexToRgb(b);
  if (!left || !right) return a === b ? 0 : 99;
  return Math.hypot(left[0] - right[0], left[1] - right[1], left[2] - right[2]);
}

/* -------------------------------- оценка --------------------------------- */

const BASE_SCORE = 56;
const MIN_SCORE = 35;
const MAX_SCORE = 99;

/**
 * Пара «верх + низ» и пары для цельного образа: где ищем монохром.
 * На вход — сами вещи: у каждой может быть до двух цветов.
 */
function monochromePairs(pieces: readonly PalettePiece[]) {
  const byRole = (role: PieceRole): PalettePiece | undefined =>
    pieces.find((piece) => piece.role === role);
  return [
    [byRole('top'), byRole('bottom')],
    [byRole('fullbody'), byRole('shoes')],
    [byRole('fullbody'), byRole('outerwear')],
  ] as const;
}

/** Пересечение цветов двух вещей: общая гамма — это уже гармония. */
function sharedFamilies(
  left: readonly PaletteColor[],
  right: readonly PaletteColor[],
): string[] {
  const rightFamilies = new Set(right.map((color) => color.family));
  const shared: string[] = [];
  for (const color of left) {
    if (rightFamilies.has(color.family) && !shared.includes(color.family)) {
      shared.push(color.family);
    }
  }
  return shared;
}

/** Общая гамма разошлась по оттенкам: «чёрный» и «графит» — это не одно и то же. */
function isShadeSplit(
  left: readonly PaletteColor[],
  right: readonly PaletteColor[],
  family: string,
): boolean {
  const leftHexes = left.filter((color) => color.family === family).map((color) => color.hex);
  const rightHexes = right.filter((color) => color.family === family).map((color) => color.hex);
  return leftHexes.some((a) => rightHexes.some((b) => hexDistance(a, b) > 10));
}

function collectBonuses(pieces: readonly PalettePiece[]): HarmonyBonus[] {
  if (pieces.length === 0) return [];

  const bonuses: HarmonyBonus[] = [];

  // 1. Монохром: верх и низ делят хотя бы одно семейство. Если у вещей
  //    несколько общих цветов, достаточно одного: вещи уже перекликаются.
  let monochrome: HarmonyBonus | null = null;
  for (const [left, right] of monochromePairs(pieces)) {
    if (!left || !right) continue;
    const shared = sharedFamilies(left.colors, right.colors);
    if (shared.length === 0) continue;
    const isShades = shared.some((family) => isShadeSplit(left.colors, right.colors, family));
    const hit: HarmonyBonus = isShades
      ? {
          id: 'monochrome-shades',
          label: 'Монохром разных оттенков',
          detail: 'Одна гамма в нескольких оттенках — образ выглядит собранным.',
          points: 20,
        }
      : {
          id: 'monochrome',
          label: 'Монохромный образ',
          detail: 'Верх и низ в одном цвете — спокойная, вытянутая по вертикали подача.',
          points: 16,
        };
    if (!monochrome || hit.points > monochrome.points) monochrome = hit;
  }
  if (monochrome) bonuses.push(monochrome);

  // 2. Нейтральная база: белый, чёрный, бежевый, серый или коричневый
  //    сочетаются со всем, поэтому рядом с цветом они работают опорой.
  //    Считаем по каждому цвету отдельно: у двухцветной вещи вторая половина
  //    тоже участвует в палитре.
  const entries = pieces.flatMap((piece) =>
    piece.colors.map((color) => ({ role: piece.role, color })),
  );
  const neutrals = entries.filter((entry) => isNeutralFamily(entry.color.family));
  const accents = entries.filter((entry) => !isNeutralFamily(entry.color.family));

  if (neutrals.length > 0 && accents.length > 0) {
    bonuses.push({
      id: 'neutral-accent',
      label: 'Нейтральная база + акцент',
      detail: 'Нейтральная основа, цвет работает акцентом — самый безопасный ход.',
      points: 14,
    });
  } else if (neutrals.length > 0 && accents.length === 0) {
    bonuses.push({
      id: 'neutral-only',
      label: 'Сдержанная нейтраль',
      detail: 'Только нейтральные цвета — легко сочетать с любыми аксессуарами.',
      points: 11,
    });
  }

  // 3. Родственные оттенки: все акценты стоят рядом на цветовом круге.
  if (accents.length >= 2) {
    let analogous = true;
    for (let i = 0; i < accents.length && analogous; i += 1) {
      for (let j = i + 1; j < accents.length; j += 1) {
        if (hueDistance(accents[i]!.color.family, accents[j]!.color.family) > 2) {
          analogous = false;
          break;
        }
      }
    }
    if (analogous) {
      bonuses.push({
        id: 'analogous',
        label: 'Родственные оттенки',
        detail: 'Соседние цвета на круге — мягкое, «природное» сочетание.',
        points: 9,
      });
    } else {
      const complementary = accents.some((entry, i) =>
        accents.some(
          (other, j) => j > i && hueDistance(entry.color.family, other.color.family) === 6,
        ),
      );
      if (complementary) {
        bonuses.push({
          id: 'contrast',
          label: 'Контрастная пара',
          detail: 'Комплементарные цвета дают образ с характером.',
          points: 6,
        });
      }
    }

    // 4. Слишком много акцентов: четыре разных цвета уже спорят друг с другом.
    const distinct = new Set(accents.map((entry) => entry.color.family));
    if (distinct.size >= 4) {
      bonuses.push({
        id: 'busy',
        label: 'Пёстрая палитра',
        detail: 'Четыре и больше активных цвета — взгляду не за что зацепиться.',
        points: -12,
      });
    }
  }

  return bonuses.sort((a, b) => b.points - a.points);
}

const MIXED: HarmonicCase = {
  id: 'mixed',
  label: 'Смешанная палитра',
  detail: 'Цвета не спорят, но и не поддерживают друг друга — можно спокойнее.',
};

interface HarmonicCase {
  id: HarmonyId;
  label: string;
  detail: string;
}

/**
 * Оценка палитры образа. Возвращает балл и главную подпись: приоритет у
 * монохрома и нейтральной базы, затем родственные/контрастные оттенки;
 * «пёстрая палитра» перебивает только слабые бонусы.
 */
export function assessPalette(pieces: readonly PalettePiece[]): HarmonyAssessment {
  const bonuses = collectBonuses(pieces);
  const points = bonuses.reduce((sum, bonus) => sum + bonus.points, 0);
  const score = Math.max(MIN_SCORE, Math.min(MAX_SCORE, BASE_SCORE + points));

  const positives = bonuses.filter((bonus) => bonus.points > 0);
  const busy = bonuses.find((bonus) => bonus.id === 'busy');
  const primary: HarmonyBonus | null =
    busy && (!positives[0] || positives[0].points < 12) ? busy : positives[0] ?? null;

  if (!primary) {
    return { score, ...MIXED, bonuses };
  }

  return {
    score,
    id: primary.id as HarmonyId,
    label: primary.label,
    detail: primary.detail,
    bonuses,
  };
}
