/**
 * filter.ts — модель кандидата и правила отбора.
 *
 * Правило (Filter) — чистая функция, возвращающая либо {ok:true},
 * либо отказ с машинным кодом и человекочитаемым сообщением.
 * Коды нужны explain.ts, сообщения — для логов и UI.
 */

import type { Rng } from './rng';

export interface Candidate<T = unknown> {
  /** Стабильный идентификатор: дедупликация, ссылки в объяснении. */
  readonly id: string;
  /** Полезная нагрузка (что именно сгенерировали). */
  readonly value: T;
  /** Метки: по ним фильтруем и группируем. */
  readonly tags: readonly string[];
  /** Числовые признаки: по ним считаем score. */
  readonly traits: Readonly<Record<string, number>>;
  readonly meta: Readonly<Record<string, unknown>>;
}

export interface CandidateInit<T> {
  id: string;
  value: T;
  tags?: readonly string[];
  traits?: Readonly<Record<string, number>>;
  meta?: Readonly<Record<string, unknown>>;
}

export function candidate<T>(init: CandidateInit<T>): Candidate<T> {
  return {
    id: init.id,
    value: init.value,
    tags: init.tags ? [...init.tags] : [],
    traits: init.traits ?? {},
    meta: init.meta ?? {},
  };
}

/** Любой кандидат: правила читают только id/tags/traits. */
export type AnyCandidate = Candidate<unknown>;

export interface Rejection {
  readonly ok: false;
  readonly code: string;
  readonly message: string;
}

export type FilterOutcome = { readonly ok: true } | Rejection;

export interface FilterContext {
  readonly rng: Rng;
  readonly index: number;
  readonly total: number;
}

export type Filter = (candidate: AnyCandidate, ctx: FilterContext) => FilterOutcome;

export const pass = (): FilterOutcome => ({ ok: true });
export const reject = (code: string, message: string): FilterOutcome => ({ ok: false, code, message });

/* ------------------------------- комбинаторы ------------------------------ */

/** Все правила должны пройти; возвращается первый отказ. */
export function all(...filters: readonly Filter[]): Filter {
  return (c, ctx) => {
    for (const filter of filters) {
      const result = filter(c, ctx);
      if (!result.ok) return result;
    }
    return pass();
  };
}

/** Достаточно одного правила; если не прошло ни одно — собираем причины. */
export function any(...filters: readonly Filter[]): Filter {
  return (c, ctx) => {
    if (filters.length === 0) return reject('ANY_EMPTY', 'Не задано ни одного условия');
    const reasons: Rejection[] = [];
    for (const filter of filters) {
      const result = filter(c, ctx);
      if (result.ok) return pass();
      reasons.push(result);
    }
    return reject(
      'ANY_FAILED',
      `Не выполнено ни одно из ${filters.length} условий: ${reasons.map((r) => r.message).join('; ')}`,
    );
  };
}

/** Инверсия правила. */
export function not(inner: Filter, code = 'NEGATED', message = 'Условие не должно выполняться'): Filter {
  return (c, ctx) => (inner(c, ctx).ok ? reject(code, message) : pass());
}

/* -------------------------------- предикаты ------------------------------- */

export function hasTag(tag: string): Filter {
  return (c) => (c.tags.includes(tag) ? pass() : reject('TAG_MISSING', `Нет метки «${tag}»`));
}

export function hasAnyTag(tags: readonly string[]): Filter {
  return (c) => {
    const hit = c.tags.find((t) => tags.includes(t));
    return hit ? pass() : reject('TAG_MISSING', `Нет ни одной из меток: ${tags.join(', ')}`);
  };
}

export function hasAllTags(tags: readonly string[]): Filter {
  return (c) => {
    const missing = tags.filter((t) => !c.tags.includes(t));
    return missing.length === 0 ? pass() : reject('TAG_MISSING', `Отсутствуют метки: ${missing.join(', ')}`);
  };
}

export function hasNoTag(tag: string): Filter {
  return (c) => (c.tags.includes(tag) ? reject('TAG_FORBIDDEN', `Метка «${tag}» запрещена`) : pass());
}

export function traitInRange(name: string, min: number, max: number): Filter {
  return (c) => {
    const value = c.traits[name];
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return reject('TRAIT_MISSING', `Нет числового признака «${name}»`);
    }
    if (value < min || value > max) {
      return reject('TRAIT_OUT_OF_RANGE', `«${name}» = ${value}, ожидалось [${min}, ${max}]`);
    }
    return pass();
  };
}

export const traitAtLeast = (name: string, min: number): Filter =>
  traitInRange(name, min, Number.POSITIVE_INFINITY);

export const traitAtMost = (name: string, max: number): Filter =>
  traitInRange(name, Number.NEGATIVE_INFINITY, max);

/**
 * Ограничение «не больше limit кандидатов на ключ».
 * ВНИМАНИЕ: правило хранит состояние — создавай новый экземпляр на каждый прогон.
 */
export function maxPerKey(
  keyOf: (c: AnyCandidate) => string | number,
  limit: number,
  code = 'KEY_LIMIT',
): Filter {
  if (!Number.isFinite(limit) || limit <= 0) {
    throw new RangeError(`maxPerKey: limit должен быть > 0, получено ${limit}`);
  }
  const used = new Map<string | number, number>();
  return (c) => {
    const key = keyOf(c);
    const count = used.get(key) ?? 0;
    if (count >= limit) {
      return reject(code, `Ключ «${String(key)}» уже набрал ${count} из ${limit}`);
    }
    used.set(key, count + 1);
    return pass();
  };
}

/* ------------------------------- применение ------------------------------- */

/** Прогоняет кандидата через все правила и возвращает все отказы (а не первый). */
export function evaluate(c: AnyCandidate, filters: readonly Filter[], ctx: FilterContext): Rejection[] {
  const failures: Rejection[] = [];
  for (const filter of filters) {
    const result = filter(c, ctx);
    if (!result.ok) failures.push(result);
  }
  return failures;
}

export interface FilterReport<T> {
  accepted: Candidate<T>[];
  rejected: { candidate: Candidate<T>; reasons: Rejection[] }[];
  totalIn: number;
  totalOut: number;
}

export function applyFilters<T>(
  candidates: readonly Candidate<T>[],
  filters: readonly Filter[],
  rng: Rng,
): FilterReport<T> {
  const accepted: Candidate<T>[] = [];
  const rejected: { candidate: Candidate<T>; reasons: Rejection[] }[] = [];

  candidates.forEach((c, index) => {
    const reasons = evaluate(c, filters, { rng, index, total: candidates.length });
    if (reasons.length === 0) accepted.push(c);
    else rejected.push({ candidate: c, reasons });
  });

  return { accepted, rejected, totalIn: candidates.length, totalOut: accepted.length };
}

/** Дедупликация по id (первое вхождение побеждает). */
export function dedupeById<T>(candidates: readonly Candidate<T>[]): Candidate<T>[] {
  const seen = new Set<string>();
  const out: Candidate<T>[] = [];
  for (const c of candidates) {
    if (seen.has(c.id)) continue;
    seen.add(c.id);
    out.push(c);
  }
  return out;
}
