/**
 * index.ts — публичный API генератора и сам пайплайн.
 *
 * Порядок шагов: кандидаты → дедупликация → фильтры → группы →
 * комбинирование → скоринг → отбор → объяснение.
 */

import { createRng, randomSeed, type Rng, type Seed } from './rng';
import {
  applyFilters,
  dedupeById,
  type Candidate,
  type Filter,
  type Rejection,
} from './filter';
import { balancedGroups, groupBy, mergeSmallGroups } from './group';
import { combinePairs, combineWithinGroups, type CombineOperator } from './combine';
import { emptyScore, rank, scoreStats, type Scorecard, type ScoreStats, type Scored } from './score';
import {
  explainCandidate,
  explainRun,
  type Explanation,
  type RunSummary,
  type RunSummaryGroup,
} from './explain';

export * from './rng';
export * from './filter';
export * from './group';
export * from './combine';
export * from './score';
export * from './explain';

/* ------------------------------- спецификация ---------------------------- */

export interface GroupSpec<T> {
  /** По умолчанию — первая метка, иначе 'default'. */
  keyOf?: (candidate: Candidate<T>) => string;
  /** Альтернатива keyOf: разбить на N сбалансированных групп. */
  count?: number;
  /** Вес для балансировки при count. */
  balanceBy?: (candidate: Candidate<T>) => number;
  /** Группы меньше minSize слить в 'other'. */
  minSize?: number;
}

export interface CombineSpec<T> {
  operator: CombineOperator<T>;
  /** 'all' — пары по всему набору, 'group' — внутри каждой группы. */
  scope?: 'all' | 'group';
  maxResults?: number;
  dedupe?: boolean;
  keepOriginals?: boolean;
}

export interface GenerateSpec<T> {
  seed?: Seed;
  /** Готовый набор или фабрика (получит rng — можно генерировать данные). */
  candidates: readonly Candidate<T>[] | ((rng: Rng) => readonly Candidate<T>[]);
  /** Массив или фабрика: нужно для правил с состоянием (maxPerKey). */
  filters?: readonly Filter[] | ((rng: Rng) => readonly Filter[]);
  groups?: GroupSpec<T>;
  combine?: CombineSpec<T>;
  scoring?: Scorecard;
  /** Отсечка по итоговому баллу (0..1). */
  minScore?: number;
  /** Сколько кандидатов оставить в итоговом отборе. */
  limit?: number;
  /** Собрать объяснения и markdown-отчёт. */
  explain?: boolean;
  maxExplain?: number;
}

export interface RunStats {
  totalIn: number;
  uniqueIn: number;
  afterFilter: number;
  afterCombine: number;
  selected: number;
  rejected: number;
  score: ScoreStats | null;
  durationMs: number;
}

export interface RunResult<T> {
  seed: string;
  rngCursor: number;
  accepted: Candidate<T>[];
  rejected: { candidate: Candidate<T>; reasons: Rejection[] }[];
  groups: Map<string, Candidate<T>[]>;
  ranked: Scored<T>[];
  selected: Candidate<T>[];
  explanations: Explanation[];
  summary: RunSummary;
  report: string | null;
  stats: RunStats;
}

/* -------------------------------- хелперы -------------------------------- */

function flattenGroups<T>(groups: ReadonlyMap<string, Candidate<T>[]>): Candidate<T>[] {
  const out: Candidate<T>[] = [];
  for (const bucket of groups.values()) out.push(...bucket);
  return out;
}

export function buildGroups<T>(
  items: readonly Candidate<T>[],
  spec: GroupSpec<T>,
): Map<string, Candidate<T>[]> {
  if (spec.count !== undefined && spec.count > 0) {
    const buckets = balancedGroups(items, spec.count, {
      weightOf: spec.balanceBy ?? (() => 1),
    });
    const out = new Map<string, Candidate<T>[]>();
    buckets.forEach((bucket, index) => {
      if (bucket.length > 0) out.set(`group-${index + 1}`, bucket);
    });
    return out;
  }

  const keyOf = spec.keyOf ?? ((candidate: Candidate<T>) => candidate.tags[0] ?? 'default');
  const grouped = groupBy(items, keyOf);
  return spec.minSize !== undefined && spec.minSize > 1
    ? mergeSmallGroups(grouped, spec.minSize, 'other')
    : grouped;
}

export function toRunSummary<T>(result: RunResult<T>): RunSummary {
  const groups: RunSummaryGroup[] = Array.from(result.groups.entries()).map(([key, items]) => ({
    key,
    ids: items.map((c) => c.id),
  }));

  return {
    seed: result.seed,
    totalIn: result.stats.totalIn,
    accepted: result.ranked.map((entry) => ({
      id: entry.candidate.id,
      tags: entry.candidate.tags,
      score: entry.score.total,
      rank: entry.rank,
    })),
    rejected: result.rejected.map((item) => ({ id: item.candidate.id, reasons: item.reasons })),
    groups,
  };
}

/* -------------------------------- пайплайн ------------------------------- */

export function generate<T>(spec: GenerateSpec<T>): RunResult<T> {
  const startedAt = Date.now();
  const rng = createRng(spec.seed ?? randomSeed());

  // 1. Источник + дедупликация.
  const source = typeof spec.candidates === 'function' ? spec.candidates(rng) : spec.candidates;
  const unique = dedupeById(source);

  // 2. Фильтры.
  const filters = typeof spec.filters === 'function' ? spec.filters(rng) : spec.filters ?? [];
  const filtered = applyFilters(unique, filters, rng);

  // 3. Группы (до комбинирования: combine.scope = 'group' работает внутри них).
  let groups: Map<string, Candidate<T>[]> = spec.groups
    ? buildGroups(filtered.accepted, spec.groups)
    : new Map<string, Candidate<T>[]>();

  // 4. Комбинирование.
  let pool: Candidate<T>[] = filtered.accepted;
  const notes: string[] = [];

  if (spec.combine) {
    const options = {
      rng,
      maxResults: spec.combine.maxResults,
      dedupe: spec.combine.dedupe ?? true,
      keepOriginals: spec.combine.keepOriginals ?? false,
    };

    if (spec.combine.scope === 'group' && groups.size > 0) {
      groups = combineWithinGroups(groups, spec.combine.operator, options);
      pool = flattenGroups(groups);
    } else {
      pool = combinePairs(filtered.accepted, spec.combine.operator, options);
    }
    pool = dedupeById(pool);
    notes.push(`после комбинирования: ${pool.length} (было ${filtered.accepted.length})`);
  }

  // 5. Скоринг.
  const card: Scorecard = spec.scoring ?? [];
  const ranked: Scored<T>[] =
    card.length > 0
      ? rank(pool, card)
      : pool.map((candidate, index) => ({
          candidate,
          score: emptyScore(candidate.id),
          rank: index + 1,
          percentile:
            pool.length <= 1 ? 100 : Math.round(((pool.length - index - 1) / (pool.length - 1)) * 100),
        }));

  // 6. Отбор.
  let chosen = ranked;
  if (spec.minScore !== undefined) {
    const threshold = spec.minScore;
    chosen = chosen.filter((entry) => entry.score.total >= threshold);
    notes.push(`порог балла: ${Math.round(threshold * 1000) / 10}%`);
  }
  if (spec.limit !== undefined) chosen = chosen.slice(0, Math.max(0, Math.floor(spec.limit)));

  const selected = chosen.map((entry) => entry.candidate);

  // 7. Итоговая раскладка и объяснения.
  if (spec.groups) groups = buildGroups(selected, spec.groups);

  const explanations: Explanation[] = [];
  if (spec.explain) {
    const maxExplain = spec.maxExplain ?? 5;
    const groupsById = new Map<string, string[]>();
    for (const [key, items] of groups) {
      for (const candidate of items) {
        const list = groupsById.get(candidate.id) ?? [];
        list.push(key);
        groupsById.set(candidate.id, list);
      }
    }

    for (const entry of chosen.slice(0, maxExplain)) {
      explanations.push(
        explainCandidate(entry.candidate, {
          verdict: 'accepted',
          score: entry.score,
          groups: groupsById.get(entry.candidate.id) ?? [],
        }),
      );
    }
    for (const item of filtered.rejected.slice(0, maxExplain)) {
      explanations.push(
        explainCandidate(item.candidate, { verdict: 'rejected', rejections: item.reasons }),
      );
    }
  }

  const stats: RunStats = {
    totalIn: source.length,
    uniqueIn: unique.length,
    afterFilter: filtered.accepted.length,
    afterCombine: pool.length,
    selected: selected.length,
    rejected: filtered.rejected.length,
    score: card.length > 0 ? scoreStats(ranked.map((entry) => entry.score)) : null,
    durationMs: Date.now() - startedAt,
  };

  const hasResult = { seed: rng.seed, rngCursor: rng.cursor, groups } as const;

  const summary: RunSummary = {
    seed: hasResult.seed,
    totalIn: stats.totalIn,
    accepted: chosen.map((entry) => ({
      id: entry.candidate.id,
      tags: entry.candidate.tags,
      score: entry.score.total,
      rank: entry.rank,
    })),
    rejected: filtered.rejected.map((item) => ({
      id: item.candidate.id,
      reasons: item.reasons,
    })),
    groups: Array.from(groups.entries()).map(([key, items]) => ({
      key,
      ids: items.map((c) => c.id),
    })),
    notes,
  };

  return {
    seed: hasResult.seed,
    rngCursor: hasResult.rngCursor,
    accepted: filtered.accepted,
    rejected: filtered.rejected,
    groups,
    ranked,
    selected,
    explanations,
    summary,
    report: spec.explain ? explainRun(summary) : null,
    stats,
  };
}

/** Синоним, чтобы вызывать пайплайн «по смыслу». */
export const runPipeline = generate;
