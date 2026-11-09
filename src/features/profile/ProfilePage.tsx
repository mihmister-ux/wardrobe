"use client";

import { User } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";

export default function ProfilePage() {
  return (
    <>
      <PageHeader eyebrow="Настройки" title="Профиль" />

      <main className="space-y-6">
        <section className="rounded-3xl border border-dashed border-border bg-card/60 px-6 py-9 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
            <User className="size-7" />
          </div>

          <h2 className="mt-4 text-base font-semibold">Раздел в разработке</h2>
          <p className="mx-auto mt-1 max-w-[19rem] text-sm text-muted-foreground">
            Здесь будут имя, город, стилевые предпочтения и настройки приложения.
          </p>
        </section>
      </main>
    </>
  );
}
