"use client";

import { Plus, Shirt } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";

export interface WardrobePageProps {
  onAddItem?: () => void;
}

export default function WardrobePage({ onAddItem }: WardrobePageProps) {
  return (
    <>
      <PageHeader eyebrow="Все вещи" title="Гардероб" />

      <main className="space-y-6">
        <section className="rounded-3xl border border-dashed border-border bg-card/60 px-6 py-9 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Shirt className="size-7" />
          </div>

          <h2 className="mt-4 text-base font-semibold">Раздел в разработке</h2>
          <p className="mx-auto mt-1 max-w-[19rem] text-sm text-muted-foreground">
            Здесь появится список вещей с фильтрами по слоту, цвету и погоде.
          </p>

          {onAddItem ? (
            <Button className="mt-4 rounded-full" onClick={onAddItem}>
              <Plus className="size-4" />
              Добавить вещь
            </Button>
          ) : null}
        </section>
      </main>
    </>
  );
}
