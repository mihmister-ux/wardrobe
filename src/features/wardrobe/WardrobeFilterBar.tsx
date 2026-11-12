"use client";

import * as React from "react";
import { Search, X } from "lucide-react";

import { COLOR_MAP, SLOT_MAP } from "@/db/seed/references";
import type { ColorFamily, Slot } from "@/db/types";
import type { SeasonId } from "@/features/items/seasons";
import {
  hasActiveFilters,
  type WardrobeFilters,
} from "@/features/wardrobe/filterItems";
import type { FilterActions } from "@/features/wardrobe/useFilteredItems";
import { cn } from "@/lib/utils";

/**
 * Порядок сезонов — от холодного к тёплому: так чипы читаются как шкала,
 * а «Зима» стоит там, где её ищут первой.
 */
const SEASON_CHIPS: ReadonlyArray<{ id: SeasonId; label: string }> = [
  { id: "winter", label: "Зима" },
  { id: "demi", label: "Демисезон" },
  { id: "summer", label: "Лето" },
];

export interface WardrobeFilterBarProps {
  filters: WardrobeFilters;
  actions: FilterActions;
  /** Разделы, которые есть в гардеробе, в порядке коллажа. */
  slots: readonly Slot[];
  /** Цвета, которые есть у вещей, в порядке круга Иттена. */
  colors: readonly ColorFamily[];
  /** Сколько вещей осталось после отбора. */
  found: number;
  /** Сколько вещей в гардеробе всего. */
  total: number;
}

/**
 * Поиск и фильтры гардероба: строка поиска, затем три группы чипов —
 * раздел, сезон и цвет. Активный фильтр залит тёмным (тот же primary, что у
 * кнопок), поэтому выбор видно с одного взгляда, а «Сбросить» появляется
 * только когда есть что сбрасывать.
 */
export function WardrobeFilterBar({
  filters,
  actions,
  slots,
  colors,
  found,
  total,
}: WardrobeFilterBarProps) {
  const isFiltering = hasActiveFilters(filters);

  return (
    <section
      aria-label="Поиск и фильтры"
      className="rounded-3xl border border-border/70 bg-card/60 p-3 md:p-3.5"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <label className="relative min-w-0 flex-1 basis-52" htmlFor="wardrobe-search">
          <span className="sr-only">Поиск по названию вещи</span>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <input
            id="wardrobe-search"
            type="text"
            value={filters.search}
            onChange={(event) => actions.setSearch(event.target.value)}
            placeholder="Поиск по названию..."
            maxLength={80}
            autoComplete="off"
            enterKeyHint="search"
            className="h-10 w-full rounded-full border border-border bg-background pl-9 pr-9 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          {filters.search ? (
            <button
              type="button"
              onClick={() => actions.setSearch("")}
              aria-label="Очистить поиск"
              className="absolute right-1.5 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </label>

        <p className="shrink-0 font-mono text-[11px] uppercase tracking-wide text-muted-foreground tabular-nums">
          {isFiltering ? `Найдено: ${found} из ${total}` : `Всего: ${total}`}
        </p>

        {isFiltering ? (
          <button
            type="button"
            onClick={actions.reset}
            className="shrink-0 rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
          >
            Сбросить
          </button>
        ) : null}
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
        <Group label="Раздел">
          <Chip
            active={filters.category === "all"}
            onClick={() => actions.setCategory("all")}
            aria-label="Все разделы"
          >
            Все
          </Chip>
          {slots.map((slot) => (
            <Chip
              key={slot}
              active={filters.category === slot}
              onClick={() => actions.setCategory(slot)}
            >
              {SLOT_MAP[slot].label}
            </Chip>
          ))}
        </Group>

        <Group label="Сезон">
          <Chip
            active={filters.season === "all"}
            onClick={() => actions.setSeason("all")}
            aria-label="Все сезоны"
          >
            Все
          </Chip>
          {SEASON_CHIPS.map((season) => (
            <Chip
              key={season.id}
              active={filters.season === season.id}
              onClick={() => actions.setSeason(season.id)}
            >
              {season.label}
            </Chip>
          ))}
        </Group>

        <Group label="Цвет">
          <Chip
            active={filters.colors.length === 0}
            onClick={actions.clearColors}
            aria-label="Любой цвет"
          >
            Все
          </Chip>
          {colors.map((family) => {
            const color = COLOR_MAP[family];
            const active = filters.colors.includes(family);
            return (
              <button
                key={family}
                type="button"
                aria-pressed={active}
                aria-label={color.label}
                title={color.label}
                onClick={() => actions.toggleColor(family)}
                className={cn(
                  "size-6 shrink-0 rounded-full border transition",
                  active
                    ? "border-primary ring-2 ring-primary ring-offset-2 ring-offset-background"
                    : "border-border/80 hover:scale-110 hover:border-primary/50",
                )}
                style={{ backgroundColor: color.hex }}
              />
            );
          })}
        </Group>
      </div>
    </section>
  );
}

/** Группа чипов с крошечной mono-подписью: «Раздел», «Сезон», «Цвет». */
function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70">
        {label}
      </span>
      {children}
    </div>
  );
}

interface ChipProps {
  active: boolean;
  onClick: () => void;
  "aria-label"?: string;
  children: React.ReactNode;
}

function Chip({ active, onClick, children, ...rest }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium transition",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
