"use client";

import * as React from "react";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { GUIDE_SECTIONS } from "./slides";
import { hasOnboarded, markOnboarded } from "./storage";

/**
 * Онбординг первого запуска: три слайда на весь экран.
 *
 * Показывается только если в localStorage нет флага `wardrobe_onboarded`.
 * «Пропустить» и «Начать» записывают флаг, поэтому больше онбординг не появится.
 * Цвета заданы явно (#fbf8f1 фон, тёмные кнопки) и не зависят от темы.
 */
export default function OnboardingDialog() {
  const [isOpen, setOpen] = React.useState<boolean>(() => !hasOnboarded());
  const [step, setStep] = React.useState(0);

  const last = step === GUIDE_SECTIONS.length - 1;
  const slide = GUIDE_SECTIONS[step];
  const Icon = slide.icon;

  const close = React.useCallback(() => {
    setOpen(false);
    markOnboarded();
  }, []);

  const next = React.useCallback(() => {
    if (last) close();
    else setStep((current) => current + 1);
  }, [close, last]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={slide.title}
      className="fixed inset-0 z-[60] flex flex-col bg-[#fbf8f1] text-[#1a1714]"
    >
      {/* Верхняя полоса: бренд и «Пропустить». */}
      <div className="flex items-center justify-between px-6 pt-6">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#1a1714]/50">
          Wardrobe
        </p>
        <button
          type="button"
          onClick={close}
          className="rounded-full px-3 py-1.5 text-sm font-medium text-[#1a1714]/60 transition hover:text-[#1a1714] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a1714]/30"
        >
          Пропустить
        </button>
      </div>

      {/* Слайд: иконка, заголовок, текст. */}
      <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
        <div
          key={step}
          className="flex w-full max-w-sm animate-reveal flex-col items-center"
        >
          <div className="grid size-20 place-items-center rounded-3xl border border-[#1a1714]/10 bg-white/60 text-[#1a1714] shadow-sm">
            <Icon className="size-9" strokeWidth={1.5} />
          </div>
          <h1 className="mt-6 font-serif text-3xl font-medium leading-tight tracking-tight">
            {slide.title}
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-[#1a1714]/70">
            {slide.text}
          </p>
        </div>

        {/* Прогресс: точки. */}
        <div className="mt-10 flex items-center gap-2" aria-hidden="true">
          {GUIDE_SECTIONS.map((_, index) => (
            <span
              key={index}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                index === step ? "w-6 bg-[#1a1714]" : "w-1.5 bg-[#1a1714]/20",
              )}
            />
          ))}
        </div>
      </div>

      {/* Нижняя кнопка. */}
      <div className="px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={next}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1a1714] px-4 py-3.5 text-sm font-semibold text-[#fbf8f1] shadow-sm transition hover:bg-[#1a1714]/90 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a1714]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#fbf8f1]"
        >
          {last ? "Начать" : "Далее"}
          <ArrowRight className="size-4" />
        </button>
      </div>
    </div>
  );
}