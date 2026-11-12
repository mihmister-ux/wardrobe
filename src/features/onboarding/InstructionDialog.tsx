"use client";

import { Database } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { GUIDE_SECTIONS } from "./slides";

export interface InstructionDialogProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Экран «Инструкция» из сайдбара: те же три раздела, что в онбординге,
 * плюс пояснение про экспорт/импорт базы. Один скролл, кнопка «Закрыть» внизу.
 */
export function InstructionDialog({ open, onClose }: InstructionDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Инструкция"
      className="sm:max-w-lg"
    >
      <div className="flex flex-col">
        <div className="pr-8">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Wardrobe
          </p>
          <h2 className="mt-1 font-serif text-xl font-semibold tracking-tight">
            Инструкция
          </h2>
        </div>

        <div className="-mx-5 mt-4 max-h-[60vh] space-y-4 overflow-y-auto border-y border-border/60 px-5 py-4">
          {GUIDE_SECTIONS.map(({ icon: Icon, title, text }) => (
            <section key={title} className="flex items-start gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-2xl border border-border bg-background text-foreground">
                <Icon className="size-5" strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <h3 className="font-serif text-base font-semibold">{title}</h3>
                <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                  {text}
                </p>
              </div>
            </section>
          ))}

          <section className="flex items-start gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-2xl border border-border bg-background text-foreground">
              <Database className="size-5" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <h3 className="font-serif text-base font-semibold">
                Перенос данных
              </h3>
              <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                Гардероб хранится в этом браузере. Чтобы сохранить или перенести
                его, откройте «Профиль → Резервная копия»: «Скачать базу»
                сохранит файл со всеми вещами, фото и настройками, а «Загрузить
                базу» восстановит их на новом устройстве.
              </p>
            </div>
          </section>
        </div>

        <Button className="mt-4 w-full rounded-xl" onClick={onClose}>
          Закрыть
        </Button>
      </div>
    </Dialog>
  );
}