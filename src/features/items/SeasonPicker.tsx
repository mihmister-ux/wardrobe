"use client";

import { Check } from "lucide-react";

import {
  SEASONS,
  formatRange,
  mergeSeasonRanges,
  type SeasonId,
} from "@/features/items/seasons";
import { cn } from "@/lib/utils";

export interface SeasonPickerProps {
  value: readonly SeasonId[];
  onChange: (next: SeasonId[]) => void;
  disabled?: boolean;
}

/**
 * Мультивыбор сезонов: галочки на карточках, объединённый диапазон под ними.
 * Один и тот же блок работает и в добавлении, и в редактировании вещи.
 */
export function SeasonPicker({
  value,
  onChange,
  disabled = false,
}: SeasonPickerProps) {
  const merged = mergeSeasonRanges(value);
  const hasGap =
    value.includes("summer") &&
    value.includes("winter") &&
    !value.includes("demi");

  const toggle = (season: SeasonId) => {
    if (disabled) return;
    onChange(
      value.includes(season)
        ? value.filter((item) => item !== season)
        : [...value, season],
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Сезоны</p>
        <span className="text-xs text-muted-foreground">можно несколько</span>
      </div>

      <div role="group" aria-label="Сезоны" className="grid grid-cols-3 gap-2">
        {SEASONS.map((season) => {
          const isSelected = value.includes(season.id);
          return (
            <button
              key={season.id}
              type="button"
              aria-label={`${season.label}, ${formatRange(season)}`}
              aria-pressed={isSelected}
              disabled={disabled}
              onClick={() => toggle(season.id)}
              className={cn(
                "relative flex flex-col items-center gap-0.5 rounded-2xl border px-1 py-2 text-xs transition disabled:opacity-60",
                isSelected
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40",
              )}
            >
              {isSelected ? (
                <Check
                  className="absolute right-1.5 top-1.5 size-3.5"
                  strokeWidth={3}
                />
              ) : null}
              <span className="text-lg leading-none" aria-hidden>
                {season.emoji}
              </span>
              <span className="font-medium leading-tight">{season.label}</span>
              <span className="text-xs leading-tight tabular-nums">
                {formatRange(season)}
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        {merged
          ? `В образы вещь попадёт при ${formatRange(merged)}, плотность ${merged.warmth} из 5.`
          : "Выберите хотя бы один сезон: от него зависят температура и плотность."}
      </p>

      {hasGap && merged ? (
        <p className="text-xs leading-relaxed text-amber-700 dark:text-amber-300">
          Лето и зима без демисезона дают сплошной диапазон{" "}
          {formatRange(merged)} — вещь будет подходить и весной, и осенью.
        </p>
      ) : null}
    </div>
  );
}
