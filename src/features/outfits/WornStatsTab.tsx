"use client";

import { Shirt, Sparkles, Trophy } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { Item } from "@/db/types";
import { ColorDots } from "@/features/items/ColorDots";
import { itemColorLabel } from "@/features/items/itemColors";
import { itemName, itemsCountLabel, plural, slotLabel } from "@/features/items/itemView";
import { formatWornDay } from "@/features/outfits/useWornHistory";
import type { WornStats, WornTopItem } from "@/features/outfits/useWornStats";
import { ItemPhoto } from "@/features/wardrobe/ItemPhoto";

/** «3 раза», «1 раз». */
function wearCountLabel(count: number): string {
  return `${count} ${plural(count, ["раз", "раза", "раз"])}`;
}

/* ========================================================================== */
/*  Топ-5 любимых вещей                                                       */
/* ========================================================================== */

function TopItemRow({ entry, rank }: { entry: WornTopItem; rank: number }) {
  const { item, wearCount, lastWornAt } = entry;
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-3">
        <span
          aria-hidden="true"
          className="w-4 shrink-0 text-center font-mono text-xs tabular-nums text-muted-foreground"
        >
          {rank}
        </span>

        <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/40 bg-[#fbf8f1] p-1.5 dark:bg-card">
          <ItemPhotoThumb item={item} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{itemName(item)}</p>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ColorDots item={item} size="sm" className="shrink-0" />
            <span className="truncate">
              {slotLabel(item.slot)} · {itemColorLabel(item)}
            </span>
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="font-mono text-sm font-semibold tabular-nums">
            {wearCountLabel(wearCount)}
          </p>
          <p className="font-mono text-[11px] tabular-nums text-muted-foreground">
            {formatWornDay(lastWornAt)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/** Миниатюра вещи. Вынесена, чтобы не тянуть в этот файл лишние пропсы. */
function ItemPhotoThumb({ item }: { item: Item }) {
  return <ItemPhoto item={item} className="h-full w-full object-contain" />;
}

/* ========================================================================== */
/*  «Что не носили»                                                           */
/* ========================================================================== */

function UnwornCard({ item }: { item: Item }) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-2.5">
        <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-border/40 bg-[#fbf8f1] p-2.5 dark:bg-card">
          <ItemPhotoThumb item={item} />
        </div>
        <div className="mt-2 space-y-1 px-0.5">
          <p className="truncate text-sm font-medium">{itemName(item)}</p>
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <ColorDots item={item} size="sm" className="shrink-0" />
            <span className="truncate">{slotLabel(item.slot)}</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/* ========================================================================== */
/*  Пустые состояния                                                          */
/* ========================================================================== */

function EmptyTop() {
  return (
    <Card className="border-dashed bg-card/60">
      <CardContent className="flex flex-col items-center px-6 py-9 text-center">
        <div className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Trophy className="size-7" />
        </div>
        <h3 className="mt-4 font-serif text-lg font-semibold">Пока нет данных</h3>
        <p className="mt-1 max-w-[20rem] text-sm text-muted-foreground">
          Носите образы, и здесь появится статистика.
        </p>
      </CardContent>
    </Card>
  );
}

function AllWorn() {
  return (
    <Card className="border-dashed bg-card/60">
      <CardContent className="flex flex-col items-center px-6 py-8 text-center">
        <div className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Sparkles className="size-6" />
        </div>
        <p className="mt-3 font-serif text-base font-semibold">Все вещи в деле!</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Нет ни одной вещи, которую вы ещё не надевали.
        </p>
      </CardContent>
    </Card>
  );
}

/* ========================================================================== */
/*  Вкладка                                                                   */
/* ========================================================================== */

export interface WornStatsTabProps {
  stats: WornStats;
}

export function WornStatsTab({ stats }: WornStatsTabProps) {
  const { topItems, unwornItems, wornCount } = stats;

  return (
    <div className="space-y-6">
      <section aria-label="Любимые вещи" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h2 className="font-serif text-lg font-semibold tracking-tight">
            Любимые вещи
          </h2>
          <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground tabular-nums">
            Топ-5 · ношено {wornCount} {plural(wornCount, ["вещь", "вещи", "вещей"])}
          </p>
        </div>

        {topItems.length === 0 ? (
          <EmptyTop />
        ) : (
          <ol className="space-y-2.5">
            {topItems.map((entry, index) => (
              <li key={entry.item.id}>
                <TopItemRow entry={entry} rank={index + 1} />
              </li>
            ))}
          </ol>
        )}
      </section>

      <section aria-label="Что не носили" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h2 className="font-serif text-lg font-semibold tracking-tight">
            Что не носили
          </h2>
          <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
            Не носили: {itemsCountLabel(unwornItems.length)}
          </p>
        </div>

        {unwornItems.length === 0 ? (
          <AllWorn />
        ) : (
          <section
            aria-label="Вещи без ношений"
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4"
          >
            {unwornItems.map((item) => (
              <UnwornCard key={item.id} item={item} />
            ))}
          </section>
        )}
      </section>

      <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
        <Shirt aria-hidden="true" className="mt-px size-3.5 shrink-0" />
        <span>
          Статистика считается по журналу: одна запись «Носить сегодня» — один
          выход. Удалённые вещи из подсчёта исчезают.
        </span>
      </p>
    </div>
  );
}
