export type Slot = 'top' | 'bottom' | 'fullbody' | 'outerwear' | 'shoes' | 'accessory';
export type Occasion = 'home' | 'work' | 'walk' | 'sport' | 'evening' | 'sleep';
export type Texture = 'cotton' | 'linen' | 'denim' | 'knit' | 'wool' | 'fleece' | 'leather' | 'suede' | 'silk' | 'chiffon' | 'synthetic' | 'tweed' | 'velvet';
export type Pattern = 'solid' | 'stripes' | 'check' | 'print' | 'dots';
export type Warmth = 1 | 2 | 3 | 4 | 5;
export type Formality = 1 | 2 | 3;
export type ItemStatus = 'available' | 'laundry' | 'archived';

export interface ItemColor {
  family: string;
  hex: string;
  label: string;
}

export interface Item {
  id: string;
  type: string;
  slot: Slot;
  label?: string;
  color: ItemColor;
  pattern: Pattern;
  texture: Texture;
  warmth: Warmth;
  tempMin: number;
  tempMax: number;
  waterResistance: 0 | 1 | 2;
  windproof: boolean;
  formality: Formality;
  occasions: Occasion[];
  tags: string[];
  status: ItemStatus;
  favorite: boolean;
  photoId?: string;
  lastWornAt?: number;
  wearCount: number;
  source: 'manual' | 'import';
  createdAt: number;
  updatedAt: number;
}

export interface Photo {
  id: string;
  itemId: string;
  main: Blob;
  thumb: Blob;
  mime: string;
  width: number;
  height: number;
  bytes: number;
  /** Имя исходного файла: по нему пакетная загрузка пропускает дубликаты. */
  fileName?: string;
  createdAt: number;
}

export interface Settings {
  id: 'app';
  userName?: string;
  city: string;
  theme: string;
  updatedAt: number;
}

/**
 * Сохранённый образ: набор id вещей, из которых он был собран, плюс оценка
 * и время сохранения. Вещи храним по id, а не целиком — так образ «живёт»
 * вместе с гардеробом (удаление вещи не ломает остальные, а при чтении мы
 * просто пропускаем отсутствующие).
 */
export interface SavedOutfit {
  id: string;
  /** id вещей в порядке их отображения (top → bottom → shoes …). */
  items: string[];
  /** Итоговая оценка 0..100 на момент сохранения. */
  score: number;
  createdAt: number;
}

// --- Вспомогательные типы для справочников (references.ts) ---

export type IconKey = string; // Упрощаем, чтобы не было конфликтов

export interface ItemTypeDef {
  id: string;
  label: string;
  slot: Slot;
  warmth: Warmth;
  occasions: Occasion[];
  textures: Texture[];
  formality: Formality;
  waterResistance: 0 | 1 | 2;
  windproof: boolean;
  icon: IconKey;
}

export interface SlotDef {
  id: Slot;
  label: string;
  missingHint: string;
  required: boolean;
  order: number;
}

export interface OccasionDef {
  id: Occasion;
  label: string;
  shortLabel: string;
  formality: Formality;
  icon: IconKey;
}

export interface PatternDef {
  id: Pattern;
  label: string;
  busy: boolean;
}

export interface TextureDef {
  id: Texture;
  label: string;
  thermal: 'warm' | 'cool' | 'neutral';
  formality: Formality;
}

export interface WarmthDef {
  level: Warmth;
  label: string;
  tempMin: number;
  tempMax: number;
}
// --- Типы для цветов и профилей ---

export type ColorFamily =
  | 'red' | 'red-orange' | 'orange' | 'yellow-orange' | 'yellow' | 'yellow-green'
  | 'green' | 'blue-green' | 'blue' | 'blue-violet' | 'violet' | 'red-violet'
  | 'white' | 'beige' | 'brown' | 'gray' | 'black';

export interface ColorDef {
  family: ColorFamily;
  label: string;
  hex: string;
  tone: 'warm' | 'cool' | 'neutral';
  isNeutral: boolean;
  textOn: 'light' | 'dark';
}

export interface ComboProfile {
  id: string;
  name: string;
  scheme: 'monochromatic' | 'analogous' | 'complementary' | 'split-complementary' | 'triad' | 'neutral-accent';
  colorFamilies: [ColorFamily, ColorFamily, ColorFamily?];
  texturePairs: Array<[Texture, Texture]>;
  tempMin: number;
  tempMax: number;
  occasions: Occasion[];
  formality: Formality;
  weight: number;
  active: boolean;
  isBuiltIn: boolean;
  seedVersion?: number;
  userModified?: boolean;
}