/**
 * rng.ts — детерминированный генератор псевдослучайных чисел.
 *
 * Зачем: любой прогон должен воспроизводиться по seed.
 * Алгоритм: FNV-1a (хэш seed) + mulberry32 (поток чисел).
 */

export type Seed = number | string;

export interface Rng {
  /** Нормализованный seed, с которым создан генератор. */
  readonly seed: string;
  /** Сколько чисел уже выдано — удобно писать в отчёт/лог. */
  readonly cursor: number;

  /** Равномерное число в [0, 1). */
  next(): number;
  /** Целое в [min, max] включительно (порядок аргументов не важен). */
  int(min: number, max: number): number;
  /** Вещественное в [min, max). */
  float(min: number, max: number): number;
  /** true с вероятностью probability (по умолчанию 0.5). */
  bool(probability?: number): boolean;

  pick<T>(items: readonly T[]): T;
  /** Индекс с учётом весов; нулевые веса допустимы, сумма должна быть > 0. */
  pickIndex(weights: readonly number[]): number;
  weighted<T>(items: readonly T[], weightOf: (item: T) => number): T;

  shuffle<T>(items: readonly T[]): T[];
  /** count элементов без повторов, порядок случайный. */
  sample<T>(items: readonly T[], count: number): T[];

  /** Дочерний генератор — независимая ветка для подзадачи. */
  fork(label: string): Rng;
}

function hashSeed(seed: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return (h >>> 0) || 0x9e3779b9;
}

function mulberry32(state: number): () => number {
  let a = state;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomSeed(): string {
  const maybeCrypto = (globalThis as {
    crypto?: { getRandomValues?: (arr: Uint32Array) => Uint32Array };
  }).crypto;

  if (maybeCrypto?.getRandomValues) {
    const arr = new Uint32Array(2);
    maybeCrypto.getRandomValues(arr);
    return `${(arr[0] as number).toString(16)}${(arr[1] as number).toString(16)}`;
  }
  return `${Date.now().toString(16)}${Math.floor(Math.random() * 0x100000000).toString(16)}`;
}

export function createRng(seed: Seed = randomSeed()): Rng {
  const raw = String(seed).trim();
  const normalized = raw === '' ? 'empty-seed' : raw;
  const rand = mulberry32(hashSeed(normalized));
  let cursor = 0;

  const next = (): number => {
    cursor += 1;
    return rand();
  };

  const int = (min: number, max: number): number => {
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      throw new RangeError(`int: границы должны быть конечными числами (${min}, ${max})`);
    }
    const lo = Math.ceil(Math.min(min, max));
    const hi = Math.floor(Math.max(min, max));
    if (hi < lo) throw new RangeError(`int: пустой диапазон [${min}, ${max}]`);
    return lo + Math.floor(next() * (hi - lo + 1));
  };

  const float = (min: number, max: number): number => min + next() * (max - min);

  const bool = (probability = 0.5): boolean => next() < probability;

  const pick = <T>(items: readonly T[]): T => {
    if (items.length === 0) throw new RangeError('pick: массив пуст');
    return items[Math.floor(next() * items.length)] as T;
  };

  const pickIndex = (weights: readonly number[]): number => {
    if (weights.length === 0) throw new RangeError('pickIndex: массив весов пуст');
    let total = 0;
    for (let i = 0; i < weights.length; i++) {
      const w = weights[i] as number;
      if (!Number.isFinite(w) || w < 0) {
        throw new RangeError(`pickIndex: некорректный вес в позиции ${i}: ${String(w)}`);
      }
      total += w;
    }
    if (total <= 0) throw new RangeError('pickIndex: сумма весов должна быть > 0');

    let threshold = next() * total;
    for (let i = 0; i < weights.length; i++) {
      threshold -= weights[i] as number;
      if (threshold < 0) return i;
    }
    return weights.length - 1;
  };

  const weighted = <T>(items: readonly T[], weightOf: (item: T) => number): T => {
    if (items.length === 0) throw new RangeError('weighted: массив пуст');
    return items[pickIndex(items.map(weightOf))] as T;
  };

  const shuffle = <T>(items: readonly T[]): T[] => {
    const out = items.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      const tmp = out[i] as T;
      out[i] = out[j] as T;
      out[j] = tmp;
    }
    return out;
  };

  const sample = <T>(items: readonly T[], count: number): T[] => {
    const n = Math.max(0, Math.min(Math.floor(count), items.length));
    const pool = items.slice();
    for (let i = 0; i < n; i++) {
      const j = i + Math.floor(next() * (pool.length - i));
      const tmp = pool[i] as T;
      pool[i] = pool[j] as T;
      pool[j] = tmp;
    }
    return pool.slice(0, n);
  };

  const fork = (label: string): Rng =>
    createRng(`${normalized}|${label}|${Math.floor(next() * 0x100000000).toString(16)}`);

  return {
    seed: normalized,
    get cursor() {
      return cursor;
    },
    next,
    int,
    float,
    bool,
    pick,
    pickIndex,
    weighted,
    shuffle,
    sample,
    fork,
  };
}
