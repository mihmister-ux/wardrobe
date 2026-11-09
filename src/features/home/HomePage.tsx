 "use client";

import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  Cloud,
  CloudRain,
  CloudSun,
  Droplets,
  Heart,
  LayoutGrid,
  MapPin,
  Plus,
  RefreshCw,
  Shirt,
  Sparkles,
  Sun,
  Wind,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BottomDock, DockSpacer } from "@/components/layout/BottomDock";
import { useUserName } from "@/features/settings/useUserName";
import { useHomeOutfits } from "@/features/home/useHomeOutfits";
import { useWeather } from "@/features/home/useWeather";
import { cn } from "@/lib/utils";

/* ========================================================================== */
/*  Типы                                                                      */
/* ========================================================================== */

export type WeatherKind = "clear" | "partly" | "cloudy" | "rain" | "snow";

export interface Weather {
  city: string;
  temp: number;
  feelsLike: number;
  high: number;
  low: number;
  kind: WeatherKind;
  condition: string;
  wind: number;
  humidity: number;
}

export type ItemCategory = "outerwear" | "top" | "bottom" | "fullbody" | "shoes" | "accessory";

export interface OutfitItem {
  id: string;
  name: string;
  category: ItemCategory;
  emoji: string;
}

export interface Outfit {
  id: string;
  title: string;
  note: string;
  score: number;
  tags: string[];
  items: OutfitItem[];
  gradient: string;
}

/* ========================================================================== */
/*  Дата (реальная, из Intl)                                                  */
/* ========================================================================== */

const DATE_FORMATTER = new Intl.DateTimeFormat("ru-RU", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

/** «Суббота, 9 ноября» — сегодняшняя дата с заглавной буквы. */
function formatToday(date = new Date()): string {
  const label = DATE_FORMATTER.format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

const CATEGORY_LABEL: Record<ItemCategory, string> = {
  outerwear: "верхний слой",
  top: "верх",
  bottom: "низ",
  fullbody: "цельный образ",
  shoes: "обувь",
  accessory: "аксессуар",
};

const WEATHER_ICON: Record<WeatherKind, React.ComponentType<{ className?: string }>> = {
  clear: Sun,
  partly: CloudSun,
  cloudy: Cloud,
  rain: CloudRain,
  snow: Cloud,
};

function weatherHint(weather: Weather): string {
  if (weather.kind === "rain") return "Возьми зонт и непромокаемую обувь.";
  if (weather.kind === "snow") return "Тёплый слой и подошва, которая не скользит.";
  if (weather.temp <= 0) return "Морозно — пуховик и шапка не помешают.";
  if (weather.temp <= 10) return "Прохладно и ветрено: пригодится верхний слой.";
  if (weather.temp <= 18) return "Комфортно для лёгкого жакета или кардигана.";
  if (weather.temp <= 26) return "Тепло — футболка и свободные брюки.";
  return "Жарко: дышащие ткани и светлые тона.";
}

/* ========================================================================== */
/*  Мелкие переиспользуемые куски                                             */
/* ========================================================================== */

function SectionHeader({
  icon: Icon,
  title,
  hint,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        <h2 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <Icon className="size-4" />
          {title}
        </h2>
        {hint ? <p className="mt-0.5 text-xs text-muted-foreground/80">{hint}</p> : null}
      </div>
      {action}
    </div>
  );
}

function ScoreRing({ value, size = 56, stroke = 5 }: { value: number; size?: number; stroke?: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (clamped / 100) * circumference;

  return (
    <div
      className="relative grid place-items-center rounded-full bg-background/85 backdrop-blur"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          className="stroke-primary transition-[stroke-dasharray] duration-500"
        />
      </svg>
      <span className="absolute text-xs font-semibold tabular-nums">{Math.round(clamped)}%</span>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 bg-card px-4 py-2.5">
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <div className="text-xs leading-tight">
        <div className="text-muted-foreground">{label}</div>
        <div className="font-medium tabular-nums">{value}</div>
      </div>
    </div>
  );
}

/* ========================================================================== */
/*  1. Погода                                                                 */
/* ========================================================================== */

function WeatherCard({ weather, isFallback = false }: { weather: Weather; isFallback?: boolean }) {
  const Icon = WEATHER_ICON[weather.kind];
  const temp = weather.temp > 0 ? `+${weather.temp}` : String(weather.temp);

  return (
    <section
      aria-label="Погода"
      className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-sm"
    >
      <div className="flex items-start justify-between gap-4 p-4">
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <MapPin className="size-3.5" />
            {weather.city}
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-semibold leading-none tracking-tight tabular-nums">
              {temp}°
            </span>
            <span className="text-sm text-muted-foreground">{weather.condition}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            ощущается как {weather.feelsLike}° · {weather.low}…{weather.high}°
          </p>
        </div>
        <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="size-7" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px border-t border-border/60 bg-border/40">
        <Stat icon={Wind} label="Ветер" value={`${weather.wind} м/с`} />
        <Stat icon={Droplets} label="Влажность" value={`${weather.humidity}%`} />
      </div>

      <div className="space-y-1 border-t border-border/60 bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground">
        <p>{weatherHint(weather)}</p>
        {isFallback ? (
          <p className="text-[11px] text-muted-foreground/70">
            Показана погода по умолчанию: разрешите геолокацию, чтобы видеть свою.
          </p>
        ) : null}
      </div>
    </section>
  );
}

/* ========================================================================== */
/*  2. Образ дня                                                              */
/* ========================================================================== */

function OutfitOfTheDay({
  outfit,
  onOpen,
  onRegenerate,
  isRegenerating = false,
}: {
  outfit: Outfit;
  onOpen?: () => void;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
}) {
  const [saved, setSaved] = React.useState(false);

  return (
    <section className="space-y-3">
      <SectionHeader icon={Sparkles} title="Образ дня" hint="Собран под текущую погоду" />

      <article className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-sm">
        <div className={cn("relative aspect-[4/3] w-full bg-gradient-to-br", outfit.gradient)}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_15%,rgba(255,255,255,0.6),transparent_60%)]" />

          <div className="relative grid h-full grid-cols-2 gap-2 p-3">
            {outfit.items.slice(0, 4).map((item) => (
              <div
                key={item.id}
                className="grid place-items-center rounded-2xl bg-white/30 backdrop-blur-[2px]"
              >
                <span className="text-4xl drop-shadow-sm sm:text-5xl" role="img" aria-label={item.name}>
                  {item.emoji}
                </span>
              </div>
            ))}
          </div>

          <div className="absolute right-3 top-3">
            <ScoreRing value={outfit.score} />
          </div>

          <button
            type="button"
            aria-pressed={saved}
            aria-label={saved ? "Убрать из избранного" : "Добавить в избранное"}
            onClick={() => setSaved((v) => !v)}
            className="absolute left-3 top-3 grid size-9 place-items-center rounded-full bg-white/50 text-slate-900 backdrop-blur transition hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Heart className={cn("size-4", saved && "fill-rose-500 text-rose-500")} />
          </button>
        </div>

        <div className="space-y-3 p-4">
          <div className="space-y-1">
            <h3 className="text-base font-semibold leading-tight">{outfit.title}</h3>
            <p className="text-sm text-muted-foreground">{outfit.note}</p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {outfit.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="font-normal">
                {tag}
              </Badge>
            ))}
          </div>

          <ul className="space-y-1.5 border-t border-border/60 pt-3">
            {outfit.items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <span aria-hidden>{item.emoji}</span>
                  <span className="truncate">{item.name}</span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {CATEGORY_LABEL[item.category]}
                </span>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2 pt-1">
            <Button className="flex-1 rounded-full" onClick={onOpen}>
              Носить сегодня
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full"
              aria-label="Предложить другой образ"
              onClick={onRegenerate}
              disabled={isRegenerating}
            >
              <RefreshCw className={cn("size-4", isRegenerating && "animate-spin")} />
            </Button>
          </div>
        </div>
      </article>
    </section>
  );
}

/* ========================================================================== */
/*  2.1 Пустые состояния образа дня                                           */
/* ========================================================================== */

function OutfitSkeleton() {
  return (
    <section className="space-y-3" aria-busy="true">
      <SectionHeader icon={Sparkles} title="Образ дня" hint="Собираем под вашу погоду" />
      <div className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-sm">
        <div className="aspect-[4/3] w-full animate-pulse bg-muted" />
        <div className="space-y-3 p-4">
          <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
          <div className="h-3 w-full animate-pulse rounded bg-muted" />
          <div className="h-3 w-4/5 animate-pulse rounded bg-muted" />
          <div className="h-9 w-full animate-pulse rounded-full bg-muted" />
        </div>
      </div>
    </section>
  );
}

function EmptyOutfit({ onAddItem }: { onAddItem?: () => void }) {
  return (
    <section className="space-y-3">
      <SectionHeader icon={Sparkles} title="Образ дня" hint="Собран под текущую погоду" />

      <div className="rounded-3xl border border-dashed border-border bg-card/60 px-6 py-9 text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Shirt className="size-7" />
        </div>

        <h3 className="mt-4 text-base font-semibold">Пока нечего предложить</h3>
        <p className="mx-auto mt-1 max-w-[19rem] text-sm text-muted-foreground">
          Добавьте вещи, чтобы увидеть образ: хватит верха, низа и пары обуви.
        </p>

        {onAddItem ? (
          <Button className="mt-4 rounded-full" onClick={onAddItem}>
            <Plus className="size-4" />
            Добавить вещь
          </Button>
        ) : null}
      </div>
    </section>
  );
}

/* ========================================================================== */
/*  3. Карусель альтернатив                                                   */
/* ========================================================================== */

function AlternativesCarousel({
  outfits,
  onOpen,
}: {
  outfits: Outfit[];
  onOpen?: (outfit: Outfit) => void;
}) {
  const railRef = React.useRef<HTMLDivElement>(null);

  const scrollByCards = (direction: 1 | -1) => {
    const rail = railRef.current;
    if (!rail) return;
    rail.scrollBy({
      left: direction * Math.min(rail.clientWidth * 0.8, 340),
      behavior: "smooth",
    });
  };

  if (outfits.length === 0) return null;

  return (
    <section className="space-y-3">
      <SectionHeader
        icon={LayoutGrid}
        title="Ещё варианты"
        hint={`${outfits.length} образа из вашего гардероба`}
        action={
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              className="size-8 rounded-full"
              aria-label="Пролистать назад"
              onClick={() => scrollByCards(-1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8 rounded-full"
              aria-label="Пролистать вперёд"
              onClick={() => scrollByCards(1)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        }
      />

      <div
        ref={railRef}
        className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {outfits.map((outfit) => (
          <button
            key={outfit.id}
            type="button"
            onClick={() => onOpen?.(outfit)}
            className="group w-[164px] shrink-0 snap-start overflow-hidden rounded-2xl border border-border/60 bg-card text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div
              className={cn(
                "relative grid aspect-square place-items-center bg-gradient-to-br",
                outfit.gradient,
              )}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.55),transparent_60%)]" />
              <div className="relative flex gap-1 text-2xl">
                {outfit.items.slice(0, 3).map((item) => (
                  <span key={item.id} aria-hidden>
                    {item.emoji}
                  </span>
                ))}
              </div>
              <span className="absolute right-2 top-2 rounded-full bg-white/65 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-slate-900">
                {outfit.score}%
              </span>
            </div>
            <div className="space-y-1 p-2.5">
              <p className="line-clamp-1 text-xs font-medium">{outfit.title}</p>
              <p className="line-clamp-1 text-[11px] text-muted-foreground">
                {outfit.tags.join(" · ")}
              </p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

/* ========================================================================== */
/*  4. Кнопка «+»                                                             */
/* ========================================================================== */

function AddItemFab({ onClick }: { onClick?: () => void }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-40">
      <div className="mx-auto flex w-full max-w-md justify-end px-4">
        <button
          type="button"
          onClick={onClick}
          aria-label="Добавить вещь в гардероб"
          className="pointer-events-auto grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Plus className="size-6" />
        </button>
      </div>
    </div>
  );
}

/* ========================================================================== */
/*  Экран                                                                     */
/* ========================================================================== */

export interface HomePageProps {
  onAddItem?: () => void;
  onOpenOutfit?: (outfit: Outfit) => void;
}

export default function HomePage({ onAddItem, onOpenOutfit }: HomePageProps) {
  const { name } = useUserName();
  const { weather, isFallback: isWeatherFallback } = useWeather();
  const {
    outfitOfTheDay,
    alternatives,
    isLoading: isOutfitsLoading,
    isRegenerating,
    error: outfitsError,
    regenerate,
  } = useHomeOutfits();

  const userName = name?.trim() || "гость";
  const userInitial = userName.charAt(0).toUpperCase();
  const todayLabel = formatToday();

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto w-full max-w-md px-4 pt-5">
        <header className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">{todayLabel}</p>
            <h1 className="text-xl font-semibold tracking-tight">Привет, {userName} 👋</h1>
          </div>
          <div className="grid size-10 place-items-center rounded-full bg-gradient-to-br from-amber-300 to-rose-300 text-sm font-semibold text-white shadow-sm">
            {userInitial}
          </div>
        </header>

        <main className="space-y-6">
          <WeatherCard weather={weather} isFallback={isWeatherFallback} />

          {outfitsError ? (
            <p
              role="alert"
              className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-xs text-destructive"
            >
              Не удалось прочитать гардероб: {outfitsError}
            </p>
          ) : null}

          {isOutfitsLoading ? (
            <OutfitSkeleton />
          ) : outfitOfTheDay ? (
            <OutfitOfTheDay
              outfit={outfitOfTheDay}
              isRegenerating={isRegenerating}
              onRegenerate={regenerate}
              onOpen={() => onOpenOutfit?.(outfitOfTheDay)}
            />
          ) : (
            <EmptyOutfit onAddItem={onAddItem} />
          )}

          <AlternativesCarousel outfits={alternatives} onOpen={onOpenOutfit} />
        </main>

        <DockSpacer />
      </div>

      <AddItemFab onClick={onAddItem} />
      <BottomDock />
    </div>
  );
}
