/**
 * combine.ts — комбинирование кандидатов.
 *
 * Оператор решает, совместима ли пара: null — «не комбинируется»,
 * одиночный кандидат или массив — что получилось.
 */

import { dedupeById, type Candidate } from './filter';
import type { Rng } from './rng';

export type CombineOperator<V> = (
  left: Candidate<V>,
  right: Candidate<V>,
  rng: Rng,
) => Candidate<V> | readonly Candidate<V>[] | null;

export interface CombineOptions {
  rng: Rng;
  /** Бюджет: сколько комбинаций максимум вернуть. */
  maxResults?: number;
  /** Убрать дубли по id (по умолчанию true). */
  dedupe?: boolean;
  /** Оставить исходных кандидатов рядом с комбинациями. */
  keepOriginals?: boolean;
}

function toList<V>(produced: Candidate<V> | readonly Candidate<V>[] | null): readonly Candidate<V>[] {
  if (produced === null) return [];
  return Array.isArray(produced) ? produced : [produced as Candidate<V>];
}

export function pairCount(size: number): number {
  return size > 1 ? (size * (size - 1)) / 2 : 0;
}

/** Стабильный id комбинации: порядок аргументов не важен. */
export function combineId(left: Candidate<unknown>, right: Candidate<unknown>, sep = '+'): string {
  return left.id <= right.id ? `${left.id}${sep}${right.id}` : `${right.id}${sep}${left.id}`;
}

/* ------------------------------ операторы ------------------------------- */

export type TraitMerge = 'sum' | 'avg' | 'max' | 'min' | 'left' | 'right';

export interface MergeOptions {
  traitMerge?: TraitMerge;
  /** Разделитель в id комбинации. */
  separator?: string;
  /** Отбрасывать пару, если у неё нет общих меток. */
  requireSharedTag?: boolean;
  /** Отбрасывать пару, если совпадает хотя бы одна из этих меток. */
  forbidTag?: (left: Candidate<unknown>, right: Candidate<unknown>) => string | null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mergeValues<V>(left: V, right: V): V {
  if (Array.isArray(left) && Array.isArray(right)) {
    return [...(left as unknown[]), ...(right as unknown[])] as unknown as V;
  }
  if (isPlainObject(left) && isPlainObject(right)) {
    return { ...left, ...right } as unknown as V;
  }
  return [left, right] as unknown as V;
}

function mergeTraits(
  a: Readonly<Record<string, number>>,
  b: Readonly<Record<string, number>>,
  mode: TraitMerge,
): Record<string, number> {
  const out: Record<string, number> = {};
  const keys = new Set<string>([...Object.keys(a), ...Object.keys(b)]);

  for (const key of keys) {
    const left = a[key];
    const right = b[key];
    if (left === undefined) {
      if (right !== undefined) out[key] = right;
      continue;
    }
    if (right === undefined) {
      out[key] = left;
      continue;
    }
    switch (mode) {
      case 'avg':
        out[key] = (left + right) / 2;
        break;
      case 'max':
        out[key] = Math.max(left, right);
        break;
      case 'min':
        out[key] = Math.min(left, right);
        break;
      case 'left':
        out[key] = left;
        break;
      case 'right':
        out[key] = right;
        break;
      default:
        out[key] = left + right;
    }
  }
  return out;
}

function partsOf(item: Candidate<unknown>): string[] {
  const stored = item.meta.parts;
  return Array.isArray(stored) ? stored.filter((p): p is string => typeof p === 'string') : [item.id];
}

/** Оператор по умолчанию: склеивает значение, объединяет метки, сливает признаки. */
export function mergeCandidates<V>(
  left: Candidate<V>,
  right: Candidate<V>,
  options: MergeOptions = {},
): Candidate<V> | null {
  if (options.requireSharedTag && !left.tags.some((t) => right.tags.includes(t))) return null;
  if (options.forbidTag && options.forbidTag(left, right) !== null) return null;

  const parts = [...partsOf(left), ...partsOf(right)];
  const uniqueParts = parts.filter((p, i) => parts.indexOf(p) === i);

  return {
    id: combineId(left, right, options.separator ?? '+'),
    value: mergeValues(left.value, right.value),
    tags: [...new Set([...left.tags, ...right.tags])],
    traits: mergeTraits(left.traits, right.traits, options.traitMerge ?? 'sum'),
    meta: { ...left.meta, ...right.meta, parts: uniqueParts, combined: true },
  };
}

/* ------------------------------ комбинаторы ------------------------------ */

/** Все неупорядоченные пары: O(n²), с бюджетом maxResults. */
export function combinePairs<V>(
  items: readonly Candidate<V>[],
  operator: CombineOperator<V>,
  options: CombineOptions,
): Candidate<V>[] {
  const { rng, maxResults, dedupe = true, keepOriginals = false } = options;
  const combos: Candidate<V>[] = [];
  const budget = maxResults ?? Number.POSITIVE_INFINITY;

  outer: for (let i = 0; i < items.length; i++) {
    const left = items[i] as Candidate<V>;
    for (let j = i + 1; j < items.length; j++) {
      const right = items[j] as Candidate<V>;
      for (const item of toList(operator(left, right, rng))) {
        if (combos.length >= budget) break outer;
        combos.push(item);
      }
    }
  }

  const result = keepOriginals ? [...items, ...combos] : combos;
  return dedupe ? dedupeById(result) : result;
}

/** Комбинирование внутри каждой группы; ключи групп сохраняются. */
export function combineWithinGroups<V>(
  groups: ReadonlyMap<string, Candidate<V>[]>,
  operator: CombineOperator<V>,
  options: CombineOptions,
): Map<string, Candidate<V>[]> {
  const out = new Map<string, Candidate<V>[]>();
  for (const [key, items] of groups) {
    out.set(key, combinePairs(items, operator, options));
  }
  return out;
}

/** Декартово произведение пулов: пул[0] × пул[1] × … с бюджетом. */
export function combineCartesian<V>(
  pools: readonly (readonly Candidate<V>[])[],
  operator: CombineOperator<V>,
  options: CombineOptions,
): Candidate<V>[] {
  const { rng, maxResults, dedupe = true, keepOriginals = false } = options;
  const budget = maxResults ?? Number.POSITIVE_INFINITY;
  const usable = pools.filter((pool) => pool.length > 0);
  if (usable.length === 0) return [];

  let acc: Candidate<V>[] = [...(usable[0] as readonly Candidate<V>[])];

  for (let p = 1; p < usable.length; p++) {
    const pool = usable[p] as readonly Candidate<V>[];
    const next: Candidate<V>[] = [];
    outer: for (const left of acc) {
      for (const right of pool) {
        for (const item of toList(operator(left, right, rng))) {
          if (next.length >= budget) break outer;
          next.push(item);
        }
      }
    }
    acc = next;
    if (acc.length === 0) break;
  }

  if (!keepOriginals) return dedupe ? dedupeById(acc) : acc;

  const all: Candidate<V>[] = [];
  for (const pool of usable) all.push(...pool);
  const result = [...all, ...acc];
  return dedupe ? dedupeById(result) : result;
}

/** Последовательная свёртка: a+b → r, r+c → … ; null разрывает цепочку. */
export function combineSequential<V>(
  items: readonly Candidate<V>[],
  operator: CombineOperator<V>,
  options: CombineOptions,
): Candidate<V>[] {
  const { rng, maxResults, dedupe = true, keepOriginals = false } = options;
  const budget = maxResults ?? Number.POSITIVE_INFINITY;
  const chain: Candidate<V>[] = [];

  let acc: Candidate<V> | null = null;
  for (const item of items) {
    if (acc === null) {
      acc = item;
      continue;
    }
    const produced: Candidate<V> | null = toList(operator(acc, item, rng))[0] ?? null;
    if (produced === null) {
      chain.push(acc);
      acc = item;
    } else {
      acc = produced;
    }
    if (chain.length >= budget) break;
  }
  if (acc !== null && chain.length < budget) chain.push(acc);

  const result = keepOriginals ? [...items, ...chain] : chain;
  return dedupe ? dedupeById(result) : result;
}
