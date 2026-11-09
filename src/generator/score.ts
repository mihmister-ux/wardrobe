/**
 * score.ts — баллы и ранжирование.
 *
 * Каждый Scorer возвращает число в [0, 1] (или undefined — признака нет).
 * Итог = взвешенная сумма, нормированная на сумму весов.
 */

import { pass, reject, type AnyCandidate, type Candidate, type Filter } from './filter';

export interface Scorer {
  readonly id: string;
  readonly label: string;
  readonly weight: number;
  evaluate(candidate: AnyCandidate): number | undefined;
}

export type Scorecard = readonly Scorer[];

export interface ScorePart {
  id: string;
  label: string;
  weight: number;
  /** Что вернул scorer (0, если признак отсутствует). */
  raw: number;
  /** Вклад в сумму: raw * weight. */
  value: number;
  missing: boolean;
}

export interface Score {
  id: string;
  /** 0..1 при нормировке весов. */
  total: number;
  /** 0..100. */
  percent: number;
  parts: ScorePart[];
  missing: string[];
}

export interface ScoreStats {
  count: number;
  min: number;
  max: number;
  mean: number;
  median: number;
}

export interface ScoreOptions {
  normalizeWeights?: boolean;
}

export interface RankOptions extends ScoreOptions {
  limit?: number;
}

export interface Scored<V> {
  candidate: Candidate<V>;
  score: Score;
  rank: number;
  percentile: number;
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 1000) / 10}%`;
}

export function emptyScore(id: string): Score {
  return { id, total: 0, percent: 0, parts: [], missing: [] };
}

/* -------------------------------- scorers -------------------------------- */

export interface TraitScorerOptions {
  min?: number;
  max?: number;
  weight?: number;
  label?: string;
  /** 1 - x: чем меньше признак, тем лучше. */
  invert?: boolean;
  /** Обрезать значения в [0, 1] (по умолчанию true). */
  clamp?: boolean;
}

export function traitScorer(name: string, options: TraitScorerOptions = {}): Scorer {
  const min = options.min ?? 0;
  const max = options.max ?? 1;
  if (!(max > min)) throw new RangeError(`traitScorer(${name}): max должен быть > min`);
  const clamp = options.clamp ?? true;
  const invert = options.invert ?? false;

  return {
    id: `trait:${name}`,
    label: options.label ?? name,
    weight: options.weight ?? 1,
    evaluate(candidate) {
      const raw = candidate.traits[name];
      if (typeof raw !== 'number' || Number.isNaN(raw)) return undefined;
      let value = (raw - min) / (max - min);
      if (clamp) value = Math.min(1, Math.max(0, value));
      return invert ? 1 - value : value;
    },
  };
}

export interface TagScorerOptions {
  weight?: number;
  label?: string;
  present?: number;
  absent?: number;
}

export function tagScorer(tag: string, options: TagScorerOptions = {}): Scorer {
  const present = options.present ?? 1;
  const absent = options.absent ?? 0;
  return {
    id: `tag:${tag}`,
    label: options.label ?? `метка «${tag}»`,
    weight: options.weight ?? 1,
    evaluate: (candidate) => (candidate.tags.includes(tag) ? present : absent),
  };
}

/** Точка расширения: любая своя логика, но вернуть надо 0..1. */
export function customScorer(
  id: string,
  evaluate: (candidate: AnyCandidate) => number | undefined,
  options: { label?: string; weight?: number } = {},
): Scorer {
  return {
    id,
    label: options.label ?? id,
    weight: options.weight ?? 1,
    evaluate,
  };
}

/* -------------------------------- расчёт --------------------------------- */

export function scoreOf(
  candidate: AnyCandidate,
  card: Scorecard,
  options: ScoreOptions = {},
): Score {
  const normalize = options.normalizeWeights ?? true;
  const parts: ScorePart[] = [];
  const missing: string[] = [];
  let weighted = 0;
  let weightSum = 0;

  for (const scorer of card) {
    const raw = scorer.evaluate(candidate);
    const isMissing = raw === undefined || Number.isNaN(raw);
    if (isMissing) missing.push(scorer.id);
    const value = isMissing ? 0 : (raw as number) * scorer.weight;
    weighted += value;
    weightSum += Math.abs(scorer.weight);
    parts.push({
      id: scorer.id,
      label: scorer.label,
      weight: scorer.weight,
      raw: isMissing ? 0 : (raw as number),
      value,
      missing: isMissing,
    });
  }

  const total = normalize && weightSum > 0 ? weighted / weightSum : weighted;
  return {
    id: candidate.id,
    total,
    percent: Math.round(total * 1000) / 10,
    parts,
    missing,
  };
}

function percentileOf(rank: number, total: number): number {
  if (total <= 1) return 100;
  return Math.round(((total - rank) / (total - 1)) * 100);
}

/** Сортировка по убыванию балла; равные баллы — по id (детерминированно). */
export function rank<V>(
  candidates: readonly Candidate<V>[],
  card: Scorecard,
  options: RankOptions = {},
): Scored<V>[] {
  const scored: Scored<V>[] = candidates.map((candidate) => ({
    candidate,
    score: scoreOf(candidate, card, options),
    rank: 0,
    percentile: 0,
  }));

  scored.sort(
    (a, b) => b.score.total - a.score.total || a.candidate.id.localeCompare(b.candidate.id),
  );

  let currentRank = 0;
  let previous = Number.NaN;
  scored.forEach((entry, index) => {
    if (entry.score.total !== previous) {
      currentRank = index + 1;
      previous = entry.score.total;
    }
    entry.rank = currentRank;
  });

  const total = scored.length;
  for (const entry of scored) entry.percentile = percentileOf(entry.rank, total);

  return options.limit !== undefined ? scored.slice(0, Math.max(0, options.limit)) : scored;
}

export function topN<V>(scored: readonly Scored<V>[], count: number): Scored<V>[] {
  return scored.slice(0, Math.max(0, Math.floor(count)));
}

export function scoreStats(scores: readonly Score[]): ScoreStats {
  const values = scores.map((s) => s.total).sort((a, b) => a - b);
  if (values.length === 0) return { count: 0, min: 0, max: 0, mean: 0, median: 0 };

  const sum = values.reduce((acc, v) => acc + v, 0);
  const mid = Math.floor(values.length / 2);
  const median =
    values.length % 2 === 1
      ? (values[mid] as number)
      : ((values[mid - 1] as number) + (values[mid] as number)) / 2;

  return {
    count: values.length,
    min: values[0] as number,
    max: values[values.length - 1] as number,
    mean: sum / values.length,
    median,
  };
}

/** Порог как обычное правило фильтра — с кодом отказа для explain.ts. */
export function scoreFilter(
  card: Scorecard,
  minTotal: number,
  code = 'SCORE_BELOW_MIN',
): Filter {
  return (candidate) => {
    const score = scoreOf(candidate, card);
    return score.total >= minTotal
      ? pass()
      : reject(code, `Балл ${formatPercent(score.total)} ниже порога ${formatPercent(minTotal)}`);
  };
}
