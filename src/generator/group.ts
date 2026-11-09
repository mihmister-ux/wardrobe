/**
 * group.ts — раскладка принятых кандидатов по группам.
 *
 * Ничего не фильтрует и не скорит: только структурирует набор.
 */

import type { AnyCandidate } from './filter';

export function groupBy<T, K>(items: readonly T[], keyOf: (item: T) => K): Map<K, T[]> {
  const out = new Map<K, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    const bucket = out.get(key);
    if (bucket) bucket.push(item);
    else out.set(key, [item]);
  }
  return out;
}

/** Группировка по меткам: кандидат попадает во все свои группы. */
export function groupByTag<T extends AnyCandidate>(items: readonly T[]): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const item of items) {
    for (const tag of item.tags) {
      const bucket = out.get(tag);
      if (bucket) bucket.push(item);
      else out.set(tag, [item]);
    }
  }
  return out;
}

export function chunk<T>(items: readonly T[], size: number): T[][] {
  if (!Number.isInteger(size) || size <= 0) {
    throw new RangeError(`chunk: size должен быть целым > 0, получено ${size}`);
  }
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export function partition<T>(
  items: readonly T[],
  predicate: (item: T, index: number) => boolean,
): [T[], T[]] {
  const yes: T[] = [];
  const no: T[] = [];
  items.forEach((item, index) => (predicate(item, index) ? yes.push(item) : no.push(item)));
  return [yes, no];
}

/** Поровну и по кругу: сохраняет относительный порядок. */
export function roundRobinGroups<T>(items: readonly T[], groupCount: number): T[][] {
  const count = Math.max(1, Math.floor(groupCount));
  const out: T[][] = Array.from({ length: count }, () => []);
  items.forEach((item, index) => (out[index % count] as T[]).push(item));
  return out;
}

export interface BalancedGroupsOptions<T> {
  /** Вес элемента; по умолчанию 1. */
  weightOf?: (item: T) => number;
  /** Вернуть элементы внутри групп в исходном порядке (по умолчанию true). */
  preserveOrder?: boolean;
}

/**
 * Жадная балансировка (LPT): самый «тяжёлый» элемент уходит в самую
 * разгруженную группу. Стабильно и предсказуемо для планирования.
 */
export function balancedGroups<T>(
  items: readonly T[],
  groupCount: number,
  options: BalancedGroupsOptions<T> = {},
): T[][] {
  const count = Math.max(1, Math.floor(groupCount));
  const weightOf = options.weightOf ?? (() => 1);
  const preserveOrder = options.preserveOrder ?? true;

  const buckets = Array.from({ length: count }, () => ({
    entries: [] as { item: T; index: number }[],
    load: 0,
  }));

  const prepared = items.map((item, index) => ({
    item,
    index,
    weight: Math.max(0, weightOf(item)),
  }));

  prepared.sort((a, b) => b.weight - a.weight || a.index - b.index);

  for (const entry of prepared) {
    let target = buckets[0] as { entries: { item: T; index: number }[]; load: number };
    for (const bucket of buckets) {
      if (bucket.load < target.load) target = bucket;
    }
    target.entries.push({ item: entry.item, index: entry.index });
    target.load += entry.weight;
  }

  return buckets.map((bucket) => {
    const entries = preserveOrder
      ? bucket.entries.slice().sort((a, b) => a.index - b.index)
      : bucket.entries;
    return entries.map((e) => e.item);
  });
}

/** Склеивает группы мельче minSize в одну общую группу fallbackKey. */
export function mergeSmallGroups<K, V>(
  groups: ReadonlyMap<K, V[]>,
  minSize: number,
  fallbackKey: K,
): Map<K, V[]> {
  const out = new Map<K, V[]>();
  const merged: V[] = [];

  for (const [key, items] of groups) {
    if (items.length === 0) continue;
    if (items.length >= minSize && key !== fallbackKey) out.set(key, [...items]);
    else merged.push(...items);
  }

  if (merged.length > 0) out.set(fallbackKey, merged);
  return out;
}

export function sortGroupsBySize<K, V>(
  groups: ReadonlyMap<K, V[]>,
  direction: 'asc' | 'desc' = 'desc',
): Map<K, V[]> {
  const entries = [...groups.entries()];
  entries.sort((a, b) =>
    direction === 'asc' ? a[1].length - b[1].length : b[1].length - a[1].length,
  );
  return new Map(entries);
}

/** Группирует подряд идущие элементы с одинаковым ключом. */
export function groupConsecutiveBy<T, K>(items: readonly T[], keyOf: (item: T) => K): T[][] {
  const out: T[][] = [];
  let currentKey: K | undefined;
  let started = false;

  for (const item of items) {
    const key = keyOf(item);
    if (!started || key !== currentKey) {
      out.push([item]);
      currentKey = key;
      started = true;
    } else {
      (out[out.length - 1] as T[]).push(item);
    }
  }
  return out;
}
