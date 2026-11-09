 /**
 * Все справочники приложения в одном месте: слоты, сценарии, цвета, фактуры,
 * узоры, уровни тепла, типы вещей, встроенные профили сочетаний.
 *
 * Данные иммутабельны и живут в коде (а не в IndexedDB): генератор обращается
 * к ним на каждый кадр, и они не должны требовать миграций.
 */
import type {
  ColorDef,
  ColorFamily,
  ComboProfile,
  Formality,
  IconKey,
  ItemTypeDef,
  Occasion,
  OccasionDef,
  PatternDef,
  Slot,
  SlotDef,
  Texture,
  TextureDef,
  Warmth,
  WarmthDef,
} from '../types';

/* ═══════════════ 1. Слоты ═══════════════ */

export const SLOTS: SlotDef[] = [
  { id: 'fullbody',  label: 'Платье / комбинезон', missingHint: 'платье или комбинезон', required: true,  order: 0 },
  { id: 'top',       label: 'Верх',                missingHint: 'футболка, рубашка, свитер', required: true, order: 1 },
  { id: 'bottom',    label: 'Низ',                 missingHint: 'джинсы, брюки, юбка', required: true, order: 2 },
  { id: 'outerwear', label: 'Верхняя одежда',      missingHint: 'куртка или пальто', required: false, order: 3 },
  { id: 'shoes',     label: 'Обувь',               missingHint: 'кроссовки или ботинки', required: true, order: 4 },
  { id: 'accessory', label: 'Аксессуар',           missingHint: 'сумка, шарф, украшения', required: false, order: 5 },
];

export const SLOT_MAP: Record<Slot, SlotDef> = Object.fromEntries(
  SLOTS.map((s) => [s.id, s]),
) as Record<Slot, SlotDef>;

/** Порядок отрисовки в коллаже: fullbody занимает место top+bottom. */
export const SLOT_ORDER: Slot[] = [...SLOTS]
  .sort((a, b) => a.order - b.order)
  .map((s) => s.id);

/* ═══════════════ 2. Сценарии ═══════════════ */

export const OCCASIONS: OccasionDef[] = [
  { id: 'home',    label: 'Дом',        shortLabel: 'Дом',     formality: 1, icon: 'generic' },
  { id: 'work',    label: 'Работа',     shortLabel: 'Работа',  formality: 2, icon: 'bag' },
  { id: 'walk',    label: 'Прогулка',   shortLabel: 'Прогулка',formality: 1, icon: 'shoe' },
  { id: 'sport',   label: 'Спорт',      shortLabel: 'Спорт',   formality: 1, icon: 'shoe' },
  { id: 'evening', label: 'Выход',      shortLabel: 'Выход',   formality: 3, icon: 'jewel' },
  { id: 'sleep',   label: 'Сон',        shortLabel: 'Сон',     formality: 1, icon: 'dress' },
];

export const OCCASION_MAP: Record<Occasion, OccasionDef> = Object.fromEntries(
  OCCASIONS.map((o) => [o.id, o]),
) as Record<Occasion, OccasionDef>;

/* ═══════════════ 3. Цвета (круг Иттена + нейтрали) ═══════════════ */

export const COLORS: ColorDef[] = [
  { family: 'red',         label: 'Красный',        hex: '#C0392B', tone: 'warm',    isNeutral: false, textOn: 'light' },
  { family: 'red-orange',  label: 'Терракотовый',   hex: '#D35400', tone: 'warm',    isNeutral: false, textOn: 'light' },
  { family: 'orange',      label: 'Оранжевый',      hex: '#E67E22', tone: 'warm',    isNeutral: false, textOn: 'dark'  },
  { family: 'yellow-orange', label: 'Абрикосовый',  hex: '#F39C12', tone: 'warm',    isNeutral: false, textOn: 'dark'  },
  { family: 'yellow',      label: 'Жёлтый',         hex: '#F1C40F', tone: 'warm',    isNeutral: false, textOn: 'dark'  },
  { family: 'yellow-green',label: 'Лаймовый',       hex: '#A3B430', tone: 'warm',    isNeutral: false, textOn: 'dark'  },
  { family: 'green',       label: 'Зелёный',        hex: '#27AE60', tone: 'cool',    isNeutral: false, textOn: 'light' },
  { family: 'blue-green',  label: 'Бирюзовый',      hex: '#16A085', tone: 'cool',    isNeutral: false, textOn: 'light' },
  { family: 'blue',        label: 'Синий',          hex: '#2F6FBA', tone: 'cool',    isNeutral: false, textOn: 'light' },
  { family: 'blue-violet', label: 'Индиго',         hex: '#5B4B9E', tone: 'cool',    isNeutral: false, textOn: 'light' },
  { family: 'violet',      label: 'Фиолетовый',     hex: '#7D3C98', tone: 'cool',    isNeutral: false, textOn: 'light' },
  { family: 'red-violet',  label: 'Бордовый',       hex: '#A3437B', tone: 'cool',    isNeutral: false, textOn: 'light' },
  { family: 'white',       label: 'Белый',          hex: '#F7F7F5', tone: 'neutral', isNeutral: true,  textOn: 'dark'  },
  { family: 'beige',       label: 'Бежевый',        hex: '#D9C7A7', tone: 'warm',    isNeutral: true,  textOn: 'dark'  },
  { family: 'brown',       label: 'Коричневый',     hex: '#6E4B3A', tone: 'warm',    isNeutral: true,  textOn: 'light' },
  { family: 'gray',        label: 'Серый',          hex: '#9AA0A6', tone: 'neutral', isNeutral: true,  textOn: 'dark'  },
  { family: 'black',       label: 'Чёрный',         hex: '#1C1C1E', tone: 'neutral', isNeutral: true,  textOn: 'light' },
];

export const COLOR_MAP: Record<ColorFamily, ColorDef> = Object.fromEntries(
  COLORS.map((c) => [c.family, c]),
) as Record<ColorFamily, ColorDef>;

export const NEUTRAL_COLORS: ColorFamily[] = COLORS.filter((c) => c.isNeutral).map(
  (c) => c.family,
);

export const isNeutralColor = (c: ColorFamily): boolean => COLOR_MAP[c].isNeutral;

export const getColorHex = (c: ColorFamily): string => COLOR_MAP[c].hex;

export const getColorLabel = (c: ColorFamily): string => COLOR_MAP[c].label;

/* ═══════════════ 4. Фактуры ═══════════════ */

export const TEXTURES: TextureDef[] = [
  { id: 'cotton',    label: 'Хлопок',       thermal: 'cool',    formality: 1 },
  { id: 'linen',     label: 'Лён',          thermal: 'cool',    formality: 1 },
  { id: 'denim',     label: 'Деним',        thermal: 'neutral', formality: 1 },
  { id: 'knit',      label: 'Трикотаж',     thermal: 'warm',    formality: 1 },
  { id: 'wool',      label: 'Шерсть',       thermal: 'warm',    formality: 2 },
  { id: 'fleece',    label: 'Флис',         thermal: 'warm',    formality: 1 },
  { id: 'leather',   label: 'Кожа',         thermal: 'neutral', formality: 2 },
  { id: 'suede',     label: 'Замша',        thermal: 'warm',    formality: 2 },
  { id: 'silk',      label: 'Шёлк',         thermal: 'cool',    formality: 3 },
  { id: 'chiffon',   label: 'Шифон',        thermal: 'cool',    formality: 2 },
  { id: 'synthetic', label: 'Синтетика',    thermal: 'neutral', formality: 1 },
  { id: 'tweed',     label: 'Твид',         thermal: 'warm',    formality: 3 },
  { id: 'velvet',    label: 'Вельвет/бархат', thermal: 'warm',  formality: 3 },
];

export const TEXTURE_MAP: Record<Texture, TextureDef> = Object.fromEntries(
  TEXTURES.map((t) => [t.id, t]),
) as Record<Texture, TextureDef>;

export const getTextureLabel = (t: Texture): string => TEXTURE_MAP[t].label;

/* ═══════════════ 5. Узоры ═══════════════ */

export const PATTERNS: PatternDef[] = [
  { id: 'solid',   label: 'Однотонный', busy: false },
  { id: 'stripes', label: 'Полоска',    busy: true  },
  { id: 'check',   label: 'Клетка',     busy: true  },
  { id: 'print',   label: 'Принт',      busy: true  },
  { id: 'dots',    label: 'Горошек',    busy: true  },
];

export const getPatternLabel = (p: PatternDef['id']): string =>
  PATTERNS.find((x) => x.id === p)?.label ?? 'Однотонный';

/* ═══════════════ 6. Уровни тепла ═══════════════ */

export const WARMTH_LEVELS: WarmthDef[] = [
  { level: 1, label: 'Жарко (лето)',       tempMin: 22, tempMax: 35 },
  { level: 2, label: 'Тепло',              tempMin: 16, tempMax: 26 },
  { level: 3, label: 'Прохладно',          tempMin: 8,  tempMax: 18 },
  { level: 4, label: 'Холодно',            tempMin: -2, tempMax: 10 },
  { level: 5, label: 'Мороз',              tempMin: -20, tempMax: 2 },
];

export const WARMTH_RANGE: Record<Warmth, { min: number; max: number }> = {
  1: { min: 22, max: 35 },
  2: { min: 16, max: 26 },
  3: { min: 8, max: 18 },
  4: { min: -2, max: 10 },
  5: { min: -20, max: 2 },
};

export const tempRangeForWarmth = (w: Warmth): { min: number; max: number } =>
  WARMTH_RANGE[w];

export const warmthLabel = (w: Warmth): string =>
  WARMTH_LEVELS.find((x) => x.level === w)?.label ?? '';

/* ═══════════════ 7. Типы вещей (40) ═══════════════ */

export const TYPES: ItemTypeDef[] = [
  /* ── Верх ── */
  {
    id: 'tshirt', label: 'Футболка', slot: 'top', warmth: 1,
    occasions: ['home', 'walk', 'sport'], textures: ['cotton', 'synthetic'],
    formality: 1, waterResistance: 0, windproof: false, icon: 'top',
  },
  {
    id: 'tank', label: 'Майка / топ', slot: 'top', warmth: 1,
    occasions: ['home', 'walk', 'sport', 'sleep'], textures: ['cotton', 'silk', 'synthetic'],
    formality: 1, waterResistance: 0, windproof: false, icon: 'top',
  },
  {
    id: 'longsleeve', label: 'Лонгслив', slot: 'top', warmth: 2,
    occasions: ['home', 'walk', 'work', 'sport'], textures: ['cotton', 'knit', 'synthetic'],
    formality: 1, waterResistance: 0, windproof: false, icon: 'top',
  },
  {
    id: 'shirt', label: 'Рубашка', slot: 'top', warmth: 2,
    occasions: ['work', 'walk', 'evening'], textures: ['cotton', 'linen', 'denim'],
    formality: 2, waterResistance: 0, windproof: false, icon: 'top',
  },
  {
    id: 'blouse', label: 'Блузка', slot: 'top', warmth: 2,
    occasions: ['work', 'evening', 'walk'], textures: ['silk', 'chiffon', 'cotton'],
    formality: 3, waterResistance: 0, windproof: false, icon: 'top',
  },
  {
    id: 'sweater', label: 'Свитер', slot: 'top', warmth: 4,
    occasions: ['home', 'walk', 'work'], textures: ['knit', 'wool', 'tweed'],
    formality: 2, waterResistance: 0, windproof: false, icon: 'top',
  },
  {
    id: 'hoodie', label: 'Худи', slot: 'top', warmth: 3,
    occasions: ['home', 'walk', 'sport'], textures: ['fleece', 'knit', 'cotton'],
    formality: 1, waterResistance: 0, windproof: false, icon: 'top',
  },
  {
    id: 'cardigan', label: 'Кардиган', slot: 'top', warmth: 3,
    occasions: ['home', 'work', 'walk'], textures: ['knit', 'wool', 'velvet'],
    formality: 2, waterResistance: 0, windproof: false, icon: 'top',
  },

  /* ── Цельнокроеное ── */
  {
    id: 'dress', label: 'Платье', slot: 'fullbody', warmth: 2,
    occasions: ['evening', 'work', 'walk'], textures: ['silk', 'chiffon', 'knit', 'velvet'],
    formality: 3, waterResistance: 0, windproof: false, icon: 'dress',
  },
  {
    id: 'sundress', label: 'Сарафан', slot: 'fullbody', warmth: 1,
    occasions: ['walk', 'home', 'evening'], textures: ['cotton', 'linen', 'chiffon'],
    formality: 2, waterResistance: 0, windproof: false, icon: 'dress',
  },
  {
    id: 'jumpsuit', label: 'Комбинезон', slot: 'fullbody', warmth: 2,
    occasions: ['work', 'evening', 'walk'], textures: ['cotton', 'linen', 'synthetic'],
    formality: 2, waterResistance: 0, windproof: false, icon: 'dress',
  },
  {
    id: 'pajama', label: 'Пижама', slot: 'fullbody', warmth: 2,
    occasions: ['sleep'], textures: ['cotton', 'knit', 'silk', 'fleece'],
    formality: 1, waterResistance: 0, windproof: false, icon: 'dress',
  },
  {
    id: 'robe', label: 'Халат', slot: 'fullbody', warmth: 2,
    occasions: ['sleep', 'home'], textures: ['fleece', 'cotton', 'knit'],
    formality: 1, waterResistance: 0, windproof: false, icon: 'dress',
  },

  /* ── Низ ── */
  {
    id: 'jeans', label: 'Джинсы', slot: 'bottom', warmth: 2,
    occasions: ['walk', 'home', 'work'], textures: ['denim'],
    formality: 1, waterResistance: 0, windproof: true, icon: 'pants',
  },
  {
    id: 'trousers', label: 'Брюки', slot: 'bottom', warmth: 2,
    occasions: ['work', 'evening', 'walk'], textures: ['wool', 'cotton', 'tweed'],
    formality: 3, waterResistance: 0, windproof: false, icon: 'pants',
  },
  {
    id: 'skirt', label: 'Юбка', slot: 'bottom', warmth: 2,
    occasions: ['work', 'walk', 'evening'], textures: ['denim', 'knit', 'leather', 'chiffon'],
    formality: 2, waterResistance: 0, windproof: false, icon: 'pants',
  },
  {
    id: 'shorts', label: 'Шорты', slot: 'bottom', warmth: 1,
    occasions: ['walk', 'home', 'sport'], textures: ['denim', 'cotton', 'linen'],
    formality: 1, waterResistance: 0, windproof: false, icon: 'pants',
  },
  {
    id: 'leggings', label: 'Леггинсы', slot: 'bottom', warmth: 2,
    occasions: ['sport', 'home', 'walk'], textures: ['synthetic', 'cotton'],
    formality: 1, waterResistance: 0, windproof: false, icon: 'pants',
  },
  {
    id: 'sweatpants', label: 'Спортивные штаны', slot: 'bottom', warmth: 3,
    occasions: ['sport', 'home'], textures: ['fleece', 'knit', 'synthetic'],
    formality: 1, waterResistance: 0, windproof: false, icon: 'pants',
  },

  /* ── Верхняя одежда ── */
  {
    id: 'jacket', label: 'Куртка', slot: 'outerwear', warmth: 4,
    occasions: ['walk', 'work'], textures: ['leather', 'synthetic', 'suede'],
    formality: 2, waterResistance: 1, windproof: true, icon: 'coat',
  },
  {
    id: 'coat', label: 'Пальто', slot: 'outerwear', warmth: 4,
    occasions: ['work', 'evening', 'walk'], textures: ['wool', 'tweed', 'velvet'],
    formality: 3, waterResistance: 0, windproof: false, icon: 'coat',
  },
  {
    id: 'puffer', label: 'Пуховик', slot: 'outerwear', warmth: 5,
    occasions: ['walk', 'work', 'home'], textures: ['synthetic'],
    formality: 1, waterResistance: 1, windproof: true, icon: 'coat',
  },
  {
    id: 'raincoat', label: 'Дождевик', slot: 'outerwear', warmth: 3,
    occasions: ['walk', 'work'], textures: ['synthetic'],
    formality: 1, waterResistance: 2, windproof: true, icon: 'coat',
  },
  {
    id: 'trench', label: 'Тренч', slot: 'outerwear', warmth: 3,
    occasions: ['work', 'evening', 'walk'], textures: ['cotton', 'synthetic'],
    formality: 2, waterResistance: 1, windproof: true, icon: 'coat',
  },
  {
    id: 'windbreaker', label: 'Ветровка', slot: 'outerwear', warmth: 3,
    occasions: ['walk', 'sport', 'home'], textures: ['synthetic'],
    formality: 1, waterResistance: 1, windproof: true, icon: 'coat',
  },
  {
    id: 'vest', label: 'Жилет', slot: 'outerwear', warmth: 3,
    occasions: ['work', 'walk', 'home'], textures: ['knit', 'suede', 'synthetic'],
    formality: 2, waterResistance: 0, windproof: false, icon: 'coat',
  },

  /* ── Обувь ── */
  {
    id: 'sneakers', label: 'Кроссовки', slot: 'shoes', warmth: 2,
    occasions: ['walk', 'sport', 'home', 'work'], textures: ['leather', 'synthetic', 'cotton'],
    formality: 1, waterResistance: 0, windproof: false, icon: 'shoe',
  },
  {
    id: 'boots', label: 'Ботинки', slot: 'shoes', warmth: 3,
    occasions: ['walk', 'work', 'evening'], textures: ['leather', 'suede'],
    formality: 2, waterResistance: 1, windproof: false, icon: 'shoe',
  },
  {
    id: 'winter-boots', label: 'Зимние сапоги', slot: 'shoes', warmth: 5,
    occasions: ['walk', 'work'], textures: ['leather', 'suede'],
    formality: 1, waterResistance: 2, windproof: true, icon: 'shoe',
  },
  {
    id: 'sandals', label: 'Сандалии', slot: 'shoes', warmth: 1,
    occasions: ['walk', 'home', 'evening'], textures: ['leather', 'suede'],
    formality: 1, waterResistance: 0, windproof: false, icon: 'shoe',
  },
  {
    id: 'loafers', label: 'Лоферы', slot: 'shoes', warmth: 2,
    occasions: ['work', 'evening', 'walk'], textures: ['leather', 'suede'],
    formality: 2, waterResistance: 0, windproof: false, icon: 'shoe',
  },
  {
    id: 'heels', label: 'Туфли', slot: 'shoes', warmth: 2,
    occasions: ['evening', 'work'], textures: ['leather', 'suede', 'velvet'],
    formality: 3, waterResistance: 0, windproof: false, icon: 'shoe',
  },
  {
    id: 'slippers', label: 'Тапочки', slot: 'shoes', warmth: 1,
    occasions: ['home', 'sleep'], textures: ['fleece', 'cotton', 'synthetic'],
    formality: 1, waterResistance: 0, windproof: false, icon: 'shoe',
  },

  /* ── Аксессуары (в образе только один) ── */
  {
    id: 'bag', label: 'Сумка', slot: 'accessory', warmth: 2,
    occasions: ['work', 'walk', 'evening'], textures: ['leather', 'suede', 'synthetic'],
    formality: 2, waterResistance: 0, windproof: false, icon: 'bag',
  },
  {
    id: 'backpack', label: 'Рюкзак', slot: 'accessory', warmth: 2,
    occasions: ['walk', 'sport', 'work', 'home'], textures: ['synthetic', 'cotton'],
    formality: 1, waterResistance: 1, windproof: false, icon: 'bag',
  },
  {
    id: 'scarf', label: 'Шарф', slot: 'accessory', warmth: 4,
    occasions: ['walk', 'work', 'evening'], textures: ['knit', 'wool', 'silk'],
    formality: 2, waterResistance: 0, windproof: false, icon: 'scarf',
  },
  {
    id: 'hat', label: 'Шапка', slot: 'accessory', warmth: 5,
    occasions: ['walk', 'sport'], textures: ['knit', 'wool', 'fleece'],
    formality: 1, waterResistance: 0, windproof: true, icon: 'hat',
  },
  {
    id: 'gloves', label: 'Перчатки', slot: 'accessory', warmth: 5,
    occasions: ['walk', 'work'], textures: ['leather', 'knit', 'wool'],
    formality: 2, waterResistance: 0, windproof: true, icon: 'gloves',
  },
  {
    id: 'belt', label: 'Ремень', slot: 'accessory', warmth: 2,
    occasions: ['work', 'evening', 'walk'], textures: ['leather', 'suede'],
    formality: 3, waterResistance: 0, windproof: false, icon: 'belt',
  },
  {
    id: 'jewelry', label: 'Украшения', slot: 'accessory', warmth: 1,
    occasions: ['evening', 'work', 'walk'], textures: ['silk', 'leather'],
    formality: 3, waterResistance: 0, windproof: false, icon: 'jewel',
  },
];

export const TYPE_MAP: Record<string, ItemTypeDef> = Object.fromEntries(
  TYPES.map((t) => [t.id, t]),
);

/** Группировка для UI формы: сначала самое частое. */
export const TYPES_BY_SLOT: Record<Slot, ItemTypeDef[]> = SLOTS.reduce(
  (acc, slot) => {
    acc[slot.id] = TYPES.filter((t) => t.slot === slot.id);
    return acc;
  },
  {} as Record<Slot, ItemTypeDef[]>,
);

export const getTypeDef = (typeId: string): ItemTypeDef | undefined => TYPE_MAP[typeId];

export const getTypeLabel = (typeId: string): string =>
  TYPE_MAP[typeId]?.label ?? typeId;

export const slotForType = (typeId: string): Slot | undefined =>
  TYPE_MAP[typeId]?.slot;

export const iconForType = (typeId: string): IconKey =>
  TYPE_MAP[typeId]?.icon ?? 'generic';

/**
 * Дефолты для формы добавления: пользователь получает 90 % полей
 * уже заполненными и правит только исключения.
 */
export function buildItemDefaults(typeId: string): {
  type: string;
  slot: Slot;
  warmth: Warmth;
  tempMin: number;
  tempMax: number;
  occasions: Occasion[];
  texture: Texture;
  formality: Formality;
  waterResistance: 0 | 1 | 2;
  windproof: boolean;
} | null {
  const def = TYPE_MAP[typeId];
  if (!def) return null;

  const range = tempRangeForWarmth(def.warmth);
  return {
    type: def.id,
    slot: def.slot,
    warmth: def.warmth,
    tempMin: range.min,
    tempMax: range.max,
    occasions: [...def.occasions],
    texture: def.textures[0],
    formality: def.formality,
    waterResistance: def.waterResistance,
    windproof: def.windproof,
  };
}/* ═══════════════ 8. Встроенные профили сочетаний (20) ═══════════════ */
/**
 * Покрытие температур, чтобы зимой и летом всегда находилось ≥ 3 профиля:
 *  −20…−14 : mono-black, analog-blue, classic-bw
 *  −14…−2  : + mono-gray, complement-green-red, evening-black-bordeaux
 *  −2…+10  : + denim-blue, analog-green, sport-tech
 *  +10…+22 : + mono-beige, navy-white, beige-navy, triad-primary, split-violet,
 *              complement-blue-orange, earth-safari, sleep-cozy
 *  +22…+35 : + mono-white, analog-warm
 */
export const DEFAULT_PROFILE_SEED_VERSION = 1;

const P = (
  p: Omit<ComboProfile, 'active' | 'isBuiltIn' | 'seedVersion' | 'userModified'>,
): ComboProfile => ({
  ...p,
  active: true,
  isBuiltIn: true,
  seedVersion: DEFAULT_PROFILE_SEED_VERSION,
  userModified: false,
});

export const BUILT_IN_PROFILES: ComboProfile[] = [
  P({
    id: 'mono-black',
    name: 'Тотал-блэк',
    scheme: 'monochromatic',
    colorFamilies: ['black', 'black', 'gray'],
    texturePairs: [['leather', 'knit'], ['denim', 'cotton'], ['wool', 'leather'], ['velvet', 'silk']],
    tempMin: -20, tempMax: 22,
    occasions: ['work', 'evening', 'walk'],
    formality: 3, weight: 0.75,
  }),
  P({
    id: 'analog-blue',
    name: 'Синяя глубина',
    scheme: 'analogous',
    colorFamilies: ['blue', 'blue-violet', 'violet'],
    texturePairs: [['wool', 'knit'], ['denim', 'cotton'], ['silk', 'chiffon'], ['leather', 'wool']],
    tempMin: -18, tempMax: 16,
    occasions: ['work', 'walk', 'evening'],
    formality: 2, weight: 0.70,
  }),
  P({
    id: 'classic-bw',
    name: 'Классика ч/б',
    scheme: 'neutral-accent',
    colorFamilies: ['black', 'white', 'gray'],
    texturePairs: [['leather', 'silk'], ['wool', 'cotton'], ['tweed', 'leather'], ['knit', 'denim']],
    tempMin: -16, tempMax: 26,
    occasions: ['work', 'evening', 'walk'],
    formality: 3, weight: 0.85,
  }),
  P({
    id: 'mono-gray',
    name: 'Серый монохром',
    scheme: 'monochromatic',
    colorFamilies: ['gray', 'gray', 'white'],
    texturePairs: [['knit', 'denim'], ['wool', 'leather'], ['fleece', 'synthetic'], ['cotton', 'tweed']],
    tempMin: -14, tempMax: 18,
    occasions: ['work', 'walk', 'evening', 'home'],
    formality: 2, weight: 0.70,
  }),
  P({
    id: 'complement-green-red',
    name: 'Зелёный и бордо',
    scheme: 'complementary',
    colorFamilies: ['green', 'red', 'beige'],
    texturePairs: [['wool', 'knit'], ['tweed', 'leather'], ['velvet', 'knit'], ['suede', 'cotton']],
    tempMin: -14, tempMax: 14,
    occasions: ['walk', 'evening', 'home'],
    formality: 2, weight: 0.55,
  }),
  P({
    id: 'evening-black-bordeaux',
    name: 'Вечер: чёрный и бордо',
    scheme: 'neutral-accent',
    colorFamilies: ['black', 'red-violet', 'beige'],
    texturePairs: [['leather', 'silk'], ['velvet', 'leather'], ['tweed', 'silk'], ['suede', 'chiffon']],
    tempMin: -4, tempMax: 20,
    occasions: ['evening', 'work'],
    formality: 3, weight: 0.80,
  }),
  P({
    id: 'denim-blue',
    name: 'Деним-тотал',
    scheme: 'monochromatic',
    colorFamilies: ['blue', 'blue', 'white'],
    texturePairs: [['denim', 'denim'], ['denim', 'cotton'], ['denim', 'knit'], ['denim', 'leather']],
    tempMin: -2, tempMax: 24,
    occasions: ['walk', 'home', 'work'],
    formality: 1, weight: 0.80,
  }),
  P({
    id: 'analog-green',
    name: 'Зелёная гамма',
    scheme: 'analogous',
    colorFamilies: ['green', 'blue-green', 'yellow-green'],
    texturePairs: [['knit', 'wool'], ['cotton', 'linen'], ['fleece', 'synthetic'], ['silk', 'chiffon']],
    tempMin: 0, tempMax: 22,
    occasions: ['walk', 'home'],
    formality: 1, weight: 0.60,
  }),
  P({
    id: 'sport-tech',
    name: 'Спорт-техно',
    scheme: 'neutral-accent',
    colorFamilies: ['gray', 'blue', 'black'],
    texturePairs: [['synthetic', 'fleece'], ['synthetic', 'synthetic'], ['knit', 'synthetic'], ['cotton', 'synthetic']],
    tempMin: -10, tempMax: 26,
    occasions: ['sport', 'home', 'walk'],
    formality: 1, weight: 0.65,
  }),
  P({
    id: 'mono-beige',
    name: 'Бежевый монохром',
    scheme: 'monochromatic',
    colorFamilies: ['beige', 'beige', 'white'],
    texturePairs: [['linen', 'cotton'], ['knit', 'suede'], ['wool', 'leather'], ['silk', 'chiffon']],
    tempMin: 10, tempMax: 30,
    occasions: ['work', 'walk', 'evening', 'home'],
    formality: 2, weight: 0.80,
  }),
  P({
    id: 'navy-white',
    name: 'Морской: синий и белый',
    scheme: 'neutral-accent',
    colorFamilies: ['blue', 'white', 'beige'],
    texturePairs: [['denim', 'cotton'], ['wool', 'linen'], ['knit', 'denim'], ['leather', 'cotton']],
    tempMin: 4, tempMax: 26,
    occasions: ['work', 'walk', 'evening'],
    formality: 2, weight: 0.90,
  }),
  P({
    id: 'beige-navy',
    name: 'Беж и индиго',
    scheme: 'neutral-accent',
    colorFamilies: ['beige', 'blue', 'white'],
    texturePairs: [['linen', 'denim'], ['suede', 'cotton'], ['knit', 'denim'], ['silk', 'linen']],
    tempMin: 10, tempMax: 30,
    occasions: ['walk', 'work', 'evening'],
    formality: 2, weight: 0.85,
  }),
  P({
    id: 'triad-primary',
    name: 'Триада: синий, красный, жёлтый',
    scheme: 'triad',
    colorFamilies: ['blue', 'red', 'yellow'],
    texturePairs: [['denim', 'cotton'], ['knit', 'denim'], ['silk', 'cotton'], ['suede', 'linen']],
    tempMin: 10, tempMax: 28,
    occasions: ['home', 'walk', 'work'],
    formality: 1, weight: 0.50,
  }),
  P({
    id: 'split-violet',
    name: 'Сплит: фиолетовый и лайм',
    scheme: 'split-complementary',
    colorFamilies: ['violet', 'yellow-green', 'gray'],
    texturePairs: [['silk', 'chiffon'], ['knit', 'denim'], ['velvet', 'cotton'], ['chiffon', 'suede']],
    tempMin: 6, tempMax: 24,
    occasions: ['evening', 'walk', 'work'],
    formality: 2, weight: 0.45,
  }),
  P({
    id: 'complement-blue-orange',
    name: 'Синий и абрикос',
    scheme: 'complementary',
    colorFamilies: ['blue', 'orange', 'white'],
    texturePairs: [['denim', 'cotton'], ['linen', 'cotton'], ['knit', 'denim'], ['synthetic', 'cotton']],
    tempMin: 8, tempMax: 28,
    occasions: ['walk', 'home', 'sport'],
    formality: 1, weight: 0.60,
  }),
  P({
    id: 'earth-safari',
    name: 'Земляная гамма',
    scheme: 'neutral-accent',
    colorFamilies: ['beige', 'brown', 'green'],
    texturePairs: [['linen', 'cotton'], ['suede', 'denim'], ['leather', 'cotton'], ['knit', 'suede']],
    tempMin: 10, tempMax: 30,
    occasions: ['walk', 'work', 'home'],
    formality: 1, weight: 0.70,
  }),
  P({
    id: 'gray-pink',
    name: 'Серый и пудра',
    scheme: 'neutral-accent',
    colorFamilies: ['gray', 'red-violet', 'white'],
    texturePairs: [['knit', 'silk'], ['wool', 'chiffon'], ['denim', 'knit'], ['tweed', 'silk']],
    tempMin: 6, tempMax: 22,
    occasions: ['work', 'walk', 'evening'],
    formality: 2, weight: 0.70,
  }),
  P({
    id: 'analog-warm',
    name: 'Тёплая аналогия',
    scheme: 'analogous',
    colorFamilies: ['red', 'orange', 'yellow-orange'],
    texturePairs: [['cotton', 'linen'], ['knit', 'cotton'], ['silk', 'chiffon'], ['suede', 'linen']],
    tempMin: 14, tempMax: 34,
    occasions: ['walk', 'evening', 'home'],
    formality: 2, weight: 0.55,
  }),
  P({
    id: 'mono-white',
    name: 'Белое на белом',
    scheme: 'monochromatic',
    colorFamilies: ['white', 'white', 'beige'],
    texturePairs: [['linen', 'cotton'], ['silk', 'chiffon'], ['knit', 'cotton'], ['denim', 'cotton']],
    tempMin: 18, tempMax: 35,
    occasions: ['walk', 'evening', 'home'],
    formality: 2, weight: 0.60,
  }),
  P({
    id: 'sleep-cozy',
    name: 'Домашний уют',
    scheme: 'monochromatic',
    colorFamilies: ['beige', 'gray', 'white'],
    texturePairs: [['cotton', 'knit'], ['fleece', 'knit'], ['cotton', 'cotton'], ['silk', 'cotton']],
    tempMin: 16, tempMax: 30,
    occasions: ['sleep', 'home'],
    formality: 1, weight: 0.70,
  }),
];

export const PROFILE_MAP: Record<string, ComboProfile> = Object.fromEntries(
  BUILT_IN_PROFILES.map((p) => [p.id, p]),
);

/* ═══════════════ 9. Прочее ═══════════════ */

export const FORMALITY_LABELS: Record<Formality, string> = {
  1: 'Casual',
  2: 'Smart casual',
  3: 'Выход',
};

export const STATUS_LABELS = {
  available: 'В гардеробе',
  laundry: 'В стирке',
  archived: 'Архив',
} as const;

export const SOURCE_LABELS = {
  manual: 'Добавлено вручную',
  import: 'Импорт',
} as const;

/** Санити-проверка справочников: ловит дубли id на старте приложения. */
export function validateReferences(): string[] {
  const errors: string[] = [];

  const typeIds = new Set<string>();
  for (const t of TYPES) {
    if (typeIds.has(t.id)) errors.push(`Дубль типа вещи: ${t.id}`);
    typeIds.add(t.id);
    if (t.occasions.length === 0) errors.push(`У типа ${t.id} нет ни одного сценария`);
    if (t.warmth < 1 || t.warmth > 5) errors.push(`У типа ${t.id} warmth вне 1..5`);
  }

  const profileIds = new Set<string>();
  for (const p of BUILT_IN_PROFILES) {
    if (profileIds.has(p.id)) errors.push(`Дубль профиля: ${p.id}`);
    profileIds.add(p.id);
    if (p.tempMin >= p.tempMax) errors.push(`У профиля ${p.id} пустой диапазон температур`);
    if (p.occasions.length === 0) errors.push(`У профиля ${p.id} нет сценариев`);
  }

  if (BUILT_IN_PROFILES.length !== 20) {
    errors.push(`Ожидалось 20 профилей, получено ${BUILT_IN_PROFILES.length}`);
  }

  return errors;
}
