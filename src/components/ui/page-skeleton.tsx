"use client";

/**
 * Заглушка на время загрузки отложенной страницы.
 *
 * Suspense стоит внутри AppLayout, поэтому навигация и док остаются на экране,
 * а вместо контента появляется скелет. Размеры повторяют PageHeader и сетку
 * карточек, чтобы переход не «прыгал» при появлении страницы.
 */
export function PageSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite" className="space-y-5">
      <span className="sr-only">Загружаем страницу…</span>

      <div className="sticky top-0 z-30 -mx-4 -mt-5 mb-5 flex items-center border-b border-border/50 bg-background/75 px-4 py-3 backdrop-blur-xl md:-mx-8 md:-mt-8 md:px-8">
        <div className="space-y-1.5">
          <div className="h-3 w-24 animate-pulse rounded-full bg-muted" />
          <div className="h-5 w-36 animate-pulse rounded-md bg-muted" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="space-y-2">
            <div className="aspect-square animate-pulse rounded-3xl bg-muted" />
            <div className="h-3.5 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
