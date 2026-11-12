"use client";

import * as React from "react";
import { Link } from "react-router-dom";
import { Clock, Heart, Plus, Trash2 } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ItemPhoto } from "@/features/wardrobe/ItemPhoto";
import type { Item } from "@/db/types";
import { itemName, slotLabel } from "@/features/items/itemView";
import { useSavedOutfits, type ResolvedSavedOutfit } from "@/features/outfits/useSavedOutfits";

/* ========================================================================== */
/*  Подписи                                                                   */
/* ========================================================================== */

const DATE_FORMATTER = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function formatDate(timestamp: number): string {
  return DATE_FORMATTER.format(new Date(timestamp));
}

/** Миниатюра образа: сетка 2×2 из до четырёх вещей, как на главной. */
function OutfitThumb({ items }: { items: Item[] }) {
  const shown = items.slice(0, 4);
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {shown.map((item) => (
        <div
          key={item.id}
          className="flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-border/40 bg-[#fbf8f1] p-2.5 dark:bg-card"
        >
          <ItemPhoto item={item} className="h-full w-full object-contain drop-shadow-sm" />
        </div>
      ))}
    </div>
  );
}

/* ========================================================================== */
/*  Карточка сохранённого образа                                              */
/* ========================================================================== */

function SavedOutfitCard({
  outfit,
  onOpen,
  onRemove,
}: {
  outfit: ResolvedSavedOutfit;
  onOpen: () => void;
  onRemove: () => void;
}) {
  return (
    <Card className="group overflow-hidden">
      <CardContent className="p-3">
        <div className="relative">
          <OutfitThumb items={outfit.items} />
          <button
            type="button"
            aria-label={`Удалить образ «${outfit.title}»`}
            onClick={onRemove}
            className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-background/80 text-muted-foreground opacity-0 shadow-sm backdrop-blur transition hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Trash2 className="size-4" />
          </button>
        </div>

        <div className="mt-3 space-y-1.5 px-0.5">
          <h3 className="truncate font-serif text-base font-semibold leading-tight">
            {outfit.title}
          </h3>
          <div className="flex items-center gap-2 font-mono text-xs tabular-nums text-muted-foreground">
            <span className="font-semibold text-foreground">{outfit.score}%</span>
            <span aria-hidden>·</span>
            <span>{formatDate(outfit.createdAt)}</span>
          </div>
          <div className="pt-1">
            <Button size="default" className="h-9 w-full rounded-full px-3" onClick={onOpen}>
              Открыть
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ========================================================================== */
/*  Пустые состояния                                                          */
/* ========================================================================== */

function EmptySaved() {
  return (
    <Card className="border-dashed bg-card/60">
      <CardContent className="flex flex-col items-center px-6 py-10 text-center">
        <div className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Heart className="size-7" />
        </div>
        <h3 className="mt-4 font-serif text-xl font-semibold">Пока нет сохранённых образов</h3>
        <p className="mt-1 max-w-[19rem] text-sm text-muted-foreground">
          Сохраните образ на главной, и он появится здесь — вместе с оценкой и датой.
        </p>
        <Link to="/" className="mt-4">
          <Button className="rounded-full">
            <Plus className="size-4" />
            Собрать образ
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

function EmptyHistory() {
  return (
    <Card className="border-dashed bg-card/60">
      <CardContent className="flex flex-col items-center px-6 py-10 text-center">
        <div className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Clock className="size-7" />
        </div>
        <h3 className="mt-4 font-serif text-xl font-semibold">История пока пуста</h3>
        <p className="mt-1 max-w-[19rem] text-sm text-muted-foreground">
          Когда вы наденете образ и отметите «Носить сегодня», он появится здесь.
        </p>
      </CardContent>
    </Card>
  );
}

/* ========================================================================== */
/*  Экран                                                                     */
/* ========================================================================== */

export default function OutfitsPage() {
  const { outfits, isLoading, error, remove } = useSavedOutfits();
  const [tab, setTab] = React.useState("saved");
  const [openId, setOpenId] = React.useState<string | null>(null);
  const openOutfit = openId ? outfits.find((o) => o.id === openId) ?? null : null;

  return (
    <>
      <PageHeader eyebrow="История и подборки" title="Образы" />

      <main className="space-y-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="saved" id="tab-saved">
              <Heart className="size-4" />
              Сохранённые
            </TabsTrigger>
            <TabsTrigger value="history" id="tab-history">
              <Clock className="size-4" />
              История
            </TabsTrigger>
          </TabsList>

          <TabsContent value="saved">
            {error ? (
              <p
                role="alert"
                className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-xs text-destructive"
              >
                {error}
              </p>
            ) : null}

            {isLoading ? (
              <section
                aria-busy="true"
                aria-label="Загружаем образы"
                className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
              >
                {Array.from({ length: 3 }, (_, index) => (
                  <div key={index} className="rounded-2xl bg-card p-3 shadow-sm">
                    <div className="aspect-square animate-pulse rounded-xl bg-muted" />
                    <div className="space-y-2 px-1 pt-3">
                      <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                      <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                    </div>
                  </div>
                ))}
              </section>
            ) : outfits.length === 0 ? (
              <EmptySaved />
            ) : (
              <section
                aria-label="Сохранённые образы"
                className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
              >
                {outfits.map((outfit) => (
                  <SavedOutfitCard
                    key={outfit.id}
                    outfit={outfit}
                    onOpen={() => setOpenId(outfit.id)}
                    onRemove={() => void remove(outfit.id)}
                  />
                ))}
              </section>
            )}
          </TabsContent>

          <TabsContent value="history">
            <EmptyHistory />
          </TabsContent>
        </Tabs>

        <Dialog
          open={openOutfit !== null}
          onClose={() => setOpenId(null)}
          title={openOutfit?.title ?? ""}
        >
          {openOutfit ? (
            <div className="space-y-4">
              <OutfitThumb items={openOutfit.items} />

              <div>
                <h2 className="font-serif text-xl font-semibold leading-tight">
                  {openOutfit.title}
                </h2>
                <div className="mt-1 flex items-center gap-2 font-mono text-xs tabular-nums text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    {openOutfit.score}%
                  </span>
                  <span aria-hidden>·</span>
                  <span>{formatDate(openOutfit.createdAt)}</span>
                </div>
              </div>

              <ul className="space-y-2">
                {openOutfit.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-3 rounded-xl bg-muted/40 px-3 py-2"
                  >
                    <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-background/70">
                      <ItemPhoto
                        item={item}
                        className="h-full w-full object-contain"
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {itemName(item)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.color.label}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-background/60 px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                      {slotLabel(item.slot)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Dialog>
      </main>
    </>
  );
}
