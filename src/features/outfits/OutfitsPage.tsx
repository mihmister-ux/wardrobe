"use client";

import { LayoutGrid } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";

export default function OutfitsPage() {
  return (
    <>
      <PageHeader eyebrow="История и подборки" title="Образы" />

      <main className="space-y-6">
        <section className="rounded-3xl border border-dashed border-border bg-card/60 px-6 py-9 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
            <LayoutGrid className="size-7" />
          </div>

          <h2 className="mt-4 text-base font-semibold">Раздел в разработке</h2>
          <p className="mx-auto mt-1 max-w-[19rem] text-sm text-muted-foreground">
            Здесь будут сохранённые образы и история того, что вы носили.
          </p>
        </section>
      </main>
    </>
  );
}
