/**
 * explain.ts — человекочитаемое объяснение результата.
 *
 * Модуль намеренно не зависит от index.ts: на вход идёт структурный
 * RunSummary, а не сам результат пайплайна (иначе получился бы цикл импортов).
 */

import type { Rejection } from './filter';
import type { Score } from './score';

export const REJECTION_LABELS: Readonly<Record<string, string>> = {
  TAG_MISSING: 'не хватает метки',
  TAG_FORBIDDEN: 'метка запрещена',
  TRAIT_MISSING: 'нет числового признака',
  TRAIT_OUT_OF_RANGE: 'признак вне диапазона',
  KEY_LIMIT: 'исчерпан лимит на ключ',
  NEGATED: 'сработало запрещающее условие',
  ANY_EMPTY: 'не задано ни одного условия',
  ANY_FAILED: 'не выполнено ни одно из условий',
  SCORE_BELOW_MIN: 'балл ниже порога',
};

export function rejectionLabel(code: string): string {
  return REJECTION_LABELS[code] ?? `причина «${code}»`;
}

export function formatNumber(value: number, digits = 1): string {
  const factor = 10 ** digits;
  return String(Math.round(value * factor) / factor);
}

/* ---------------------------- один кандидат ------------------------------ */

export type Verdict = 'accepted' | 'rejected' | 'unknown';

export interface ExplainCandidateOptions {
  verdict?: Verdict;
  score?: Score;
  rejections?: readonly Rejection[];
  groups?: readonly string[];
  maxReasons?: number;
  maxScoreParts?: number;
}

export interface Explanation {
  id: string;
  verdict: Verdict;
  headline: string;
  reasons: string[];
  scoreLines: string[];
  groupLines: string[];
  text: string;
}

const VERDICT_LABEL: Readonly<Record<Verdict, string>> = {
  accepted: 'принят',
  rejected: 'отклонён',
  unknown: 'без вердикта',
};

export function explainCandidate(
  candidate: { readonly id: string; readonly tags: readonly string[] },
  options: ExplainCandidateOptions = {},
): Explanation {
  const verdict = options.verdict ?? 'unknown';
  const maxReasons = options.maxReasons ?? 5;
  const maxScoreParts = options.maxScoreParts ?? 3;

  const allReasons = (options.rejections ?? []).map(
    (r) => `${rejectionLabel(r.code)} — ${r.message}`,
  );
  const reasons = allReasons.slice(0, maxReasons);
  if (allReasons.length > maxReasons) {
    reasons.push(`…и ещё ${allReasons.length - maxReasons} причина(ы)`);
  }

  const scoreLines: string[] = [];
  if (options.score) {
    const score = options.score;
    const details = score.parts
      .filter((p) => !p.missing)
      .slice()
      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
      .slice(0, maxScoreParts)
      .map((p) => `${p.label} ${formatNumber(p.raw, 2)} × ${formatNumber(p.weight, 2)}`);
    scoreLines.push(
      `балл ${formatNumber(score.percent)}%${details.length > 0 ? ` (${details.join('; ')})` : ''}`,
    );
    if (score.missing.length > 0) {
      scoreLines.push(`нет данных по признакам: ${score.missing.join(', ')}`);
    }
  }

  const groupLines = (options.groups ?? []).map((g) => `группа ${g}`);

  const headline = `Кандидат «${candidate.id}»${
    candidate.tags.length > 0 ? ` [${candidate.tags.join(', ')}]` : ''
  }`;

  const lines: string[] = [`### ${headline} — ${VERDICT_LABEL[verdict]}`];
  for (const reason of reasons) lines.push(`- ${reason}`);
  for (const line of scoreLines) lines.push(`- ${line}`);
  for (const line of groupLines) lines.push(`- ${line}`);

  return {
    id: candidate.id,
    verdict,
    headline,
    reasons,
    scoreLines,
    groupLines,
    text: lines.join('\n'),
  };
}

export function renderExplanation(explanation: Explanation): string {
  return explanation.text;
}

/* ------------------------------- весь прогон ----------------------------- */

export interface RunSummaryAccepted {
  id: string;
  tags: readonly string[];
  score?: number;
  rank?: number;
}

export interface RunSummaryRejected {
  id: string;
  reasons: readonly Rejection[];
}

export interface RunSummaryGroup {
  key: string;
  ids: readonly string[];
}

export interface RunSummary {
  seed: string;
  totalIn: number;
  accepted: readonly RunSummaryAccepted[];
  rejected: readonly RunSummaryRejected[];
  groups?: readonly RunSummaryGroup[];
  notes?: readonly string[];
}

export interface RejectionStat {
  code: string;
  label: string;
  count: number;
  example: string;
}

export function rejectionHistogram(reasons: readonly Rejection[]): RejectionStat[] {
  const buckets = new Map<string, RejectionStat>();

  for (const reason of reasons) {
    const existing = buckets.get(reason.code);
    if (existing) existing.count += 1;
    else
      buckets.set(reason.code, {
        code: reason.code,
        label: rejectionLabel(reason.code),
        count: 1,
        example: reason.message,
      });
  }

  return [...buckets.values()].sort((a, b) => b.count - a.count || a.code.localeCompare(b.code));
}

export interface ExplainRunOptions {
  maxLeaders?: number;
  maxRejected?: number;
  includeGroups?: boolean;
}

export function explainRun(summary: RunSummary, options: ExplainRunOptions = {}): string {
  const maxLeaders = options.maxLeaders ?? 5;
  const maxRejected = options.maxRejected ?? 5;
  const includeGroups = options.includeGroups ?? true;

  const lines: string[] = ['# Отчёт генерации', ''];
  lines.push(`- seed: \`${summary.seed}\``);
  lines.push(`- на входе: ${summary.totalIn}`);
  lines.push(`- принято: ${summary.accepted.length}`);
  lines.push(`- отклонено: ${summary.rejected.length}`);
  if (summary.groups && summary.groups.length > 0) {
    lines.push(`- групп: ${summary.groups.length}`);
  }
  lines.push('');

  if (summary.accepted.length > 0) {
    lines.push('## Лидеры');
    for (const item of summary.accepted.slice(0, maxLeaders)) {
      const bits: string[] = [];
      if (item.rank !== undefined) bits.push(`ранг ${item.rank}`);
      if (item.score !== undefined) bits.push(`балл ${formatNumber(item.score * 100)}%`);
      const tags = item.tags.length > 0 ? ` [${item.tags.join(', ')}]` : '';
      lines.push(`- \`${item.id}\`${tags}${bits.length > 0 ? ` — ${bits.join(', ')}` : ''}`);
    }
    const rest = summary.accepted.length - maxLeaders;
    if (rest > 0) lines.push(`- …и ещё ${rest}`);
    lines.push('');
  }

  if (includeGroups && summary.groups && summary.groups.length > 0) {
    lines.push('## Группы');
    for (const group of summary.groups) {
      const shown = group.ids.slice(0, 8).map((id) => `\`${id}\``).join(', ');
      const tail = group.ids.length > 8 ? ', …' : '';
      lines.push(`- **${group.key}** (${group.ids.length}): ${shown}${tail}`);
    }
    lines.push('');
  }

  if (summary.rejected.length > 0) {
    lines.push('## Отклонённые');
    for (const item of summary.rejected.slice(0, maxRejected)) {
      const text =
        item.reasons.length > 0
          ? item.reasons.map((r) => `${rejectionLabel(r.code)} — ${r.message}`).join('; ')
          : 'без указания причины';
      lines.push(`- \`${item.id}\` — ${text}`);
    }
    const rest = summary.rejected.length - maxRejected;
    if (rest > 0) lines.push(`- …и ещё ${rest}`);
    lines.push('');
  }

  const allReasons: Rejection[] = [];
  for (const item of summary.rejected) allReasons.push(...item.reasons);
  const histogram = rejectionHistogram(allReasons);

  if (histogram.length > 0) {
    lines.push('## Причины отказов');
    for (const stat of histogram) {
      lines.push(`- ${stat.label} (\`${stat.code}\`): ${stat.count}× — например: ${stat.example}`);
    }
    lines.push('');
  }

  if (summary.notes && summary.notes.length > 0) {
    lines.push('## Примечания');
    for (const note of summary.notes) lines.push(`- ${note}`);
    lines.push('');
  }

  return lines.join('\n').trimEnd();
}
