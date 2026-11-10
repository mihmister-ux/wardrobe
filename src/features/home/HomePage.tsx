"use client";

import * as React from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Cloud,
  CloudRain,
  CloudSun,
  Compass,
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

import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { OCCASION_MAP } from "@/db/seed/references";
import type { Item, Occasion } from "@/db/types";
import { formatItemRange, itemName, SLOT_EMOJI } from "@/features/items/itemView";
import type { OutfitScore } from "@/features/home/scoreOutfit";
import { useHomeOutfits } from "@/features/home/useHomeOutfits";
import { useWeather } from "@/features/home/useWeather";
import { useUserName } from "@/features/settings/useUserName";
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
  /** Пояснение под заголовком: чем хорош образ. */
  note: string;
  /** Короткая подпись правила сочетаемости («Монохромный образ»). */
  harmony: string;
  /** HEX цветов образа — точки палитры. */
  palette: string[];
  /** Итоговая оценка 0..100: цвет + погода + формальность. */
  score: number;
  /** Из чего сложился процент — показываем под заголовком. */
  scoreParts: OutfitScore;
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
  outerwear: "Верхняя одежда",
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
        <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Icon className="size-4" />
          {title}
        </h2>
        {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      {action}
    </div>
  );
}

function ScoreRing({
  value,
  size = 56,
  stroke = 5,
  ariaLabel,
}: {
  value: number;
  size?: number;
  stroke?: number;
  ariaLabel?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (clamped / 100) * circumference;

  return (
    <div
      role="img"
      aria-label={ariaLabel ?? `Оценка образа ${Math.round(clamped)}%`}
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
      <span aria-hidden className="absolute text-xs font-semibold tabular-nums">
        {Math.round(clamped)}%
      </span>
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

function WeatherCard({
  weather,
  isFallback = false,
  error = null,
}: {
  weather: Weather;
  isFallback?: boolean;
  error?: string | null;
}) {
  const Icon = WEATHER_ICON[weather.kind];
  const temp = weather.temp > 0 ? `+${weather.temp}` : String(weather.temp);

  return (
    <section
      aria-label="Погода"
      className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-sm"
    >
      <div className="flex items-start justify-between gap-4 p-4">
        <div className="min-w-0 space-y-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0.5 text-xs font-medium text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" />
            <span className="shrink-0">Ваш город</span>
            <span className="truncate text-foreground">{weather.city}</span>
            <Link
              to="/profile"
              className="ml-1 shrink-0 text-[11px] font-medium text-primary hover:underline"
            >
              Изменить
            </Link>
          </div>
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-4xl font-semibold leading-none tracking-tight tabular-nums">
              {temp}°
            </span>
            <span className="text-sm text-muted-foreground">{weather.condition}</span>
            {isFallback ? (
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                нет данных
              </span>
            ) : null}
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
          <p className="text-xs">
            {error ??
              "Показана погода по умолчанию: укажите город в профиле или разрешите геолокацию."}
          </p>
        ) : null}
      </div>
    </section>
  );
}

/* ========================================================================== */
/*  1.1 Ситуация: куда собираемся                                             */
/* ========================================================================== */

const SITUATIONS = [
  { id: "home", emoji: "🏠" },
  { id: "work", emoji: "💼" },
  { id: "walk", emoji: "🌳" },
  { id: "evening", emoji: "🥂" },
] as const satisfies readonly { id: Occasion; emoji: string }[];

/** Будни — работа, выходные — прогулка: разумный старт без лишних кликов. */
function defaultOccasion(now = new Date()): Occasion {
  const day = now.getDay();
  return day === 0 || day === 6 ? "walk" : "work";
}

function SituationPicker({
  value,
  onChange,
}: {
  value: Occasion;
  onChange: (next: Occasion) => void;
}) {
  return (
    <section aria-labelledby="situation-title" className="space-y-2">
      <div className="flex items-end justify-between gap-3">
        <h2
          id="situation-title"
          className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
        >
          <Compass className="size-4" />
          Куда собираемся
        </h2>
        <span className="text-xs text-muted-foreground">влияет на оценку</span>
      </div>

      <div role="group" aria-label="Ситуация" className="flex flex-wrap gap-1">
        {SITUATIONS.map(({ id, emoji }) => {
          const isActive = id === value;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={isActive}
              onClick={() => onChange(id)}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <span aria-hidden>{emoji}</span>
              {OCCASION_MAP[id].label}
            </button>
          );
        })}
      </div>
    </section>
  );
}

/* ========================================================================== */
/*  2. Образ дня                                                              */
/* ========================================================================== */

function OutfitOfTheDay({
  outfit,
  situation,
  onOpen,
  onRegenerate,
  isRegenerating = false,
}: {
  outfit: Outfit;
  /** Подпись выбранной ситуации — в пояснении к оценке. */
  situation: string;
  onOpen?: () => void;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
}) {
  const [saved, setSaved] = React.useState(false);
  const parts = outfit.scoreParts;

  return (
    <section className="space-y-3">
      <SectionHeader icon={Sparkles} title="Образ дня" hint="Собран под текущую погоду" />

      <article className="overflow-hidden rounded-3xl bg-white/80 backdrop-blur-xl border border-white/20 shadow-[0_20px_50px_-30px_rgba(15,23,42,0.4)] transition-all duration-300 hover:shadow-[0_30px_60px_-25px_rgba(15,23,42,0.35)] dark:bg-slate-800/80 dark:border-slate-700/50 dark:shadow-[0_20px_50px_-30px_rgba(0,0,0,0.5)]">
        <div className={cn("relative aspect-[4/3] w-full bg-gradient-to-br from-primary/20 via-secondary/20 to-accent/20", outfit.gradient)}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_15%,rgba(255,255,255,0.6),transparent_60%)]" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/10 to-white/30" />

          <div className="relative grid h-full grid-cols-2 gap-2 p-3">
            {outfit.items.slice(0, 4).map((item) => (
              <div
                key={item.id}
                className="group grid place-items-center rounded-2xl bg-white/40 backdrop-blur-sm border border-white/30 transition-all duration-500 hover:bg-white/60 hover:scale-105"
              >
                <span className="text-4xl drop-shadow-sm sm:text-5xl transition-transform duration-500 group-hover:scale-110" role="img" aria-label={item.name}>
                  {item.emoji}
                </span>
              </div>
            ))}
          </div>

          <div className="absolute right-3 top-3">
            <ScoreRing
              value={outfit.score}
              ariaLabel={`Оценка образа ${outfit.score}%: цвет ${parts.color}, погода ${parts.temperature} из 10, ситуация ${parts.formality} из 5`}
            />
          </div>

          <button
            type="button"
            aria-pressed={saved}
            aria-label={saved ? "Убрать из избранного" : "Добавить в избранное"}
            onClick={() => setSaved((v) => !v)}
            className="absolute left-3 top-3 grid size-9 place-items-center rounded-full bg-white/50 text-slate-900 backdrop-blur-sm transition hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Heart className={cn("size-4", saved && "fill-rose-500 text-rose-500")} />
          </button>
        </div>

        <div className="space-y-3 p-4 bg-white/50 backdrop-blur-sm">
          <div className="space-y-1">
            <h3 className="text-lg font-bold leading-tight">{outfit.title}</h3>
            <p className="text-sm text-muted-foreground">{outfit.note}</p>
          </div>

          <div className="space-y-1">
            <div
              className="flex flex-wrap items-center gap-1.5 text-xs"
              title="Процент = сочетаемость цвета + до 10 за погоду + до 5 за уместность"
            >
              <span className="font-bold text-foreground">
                Оценка {outfit.score}%
              </span>
              <span className="rounded-full border border-border/50 bg-white/50 px-2 py-0.5 text-muted-foreground">
                цвет {parts.color}
              </span>
              <span className="rounded-full border border-border/50 bg-white/50 px-2 py-0.5 text-muted-foreground">
                погода +{parts.temperature}/10
              </span>
              <span className="rounded-full border border-border/50 bg-white/50 px-2 py-0.5 text-muted-foreground">
                ситуация +{parts.formality}/5
              </span>
            </div>
            <p className="text-xs leading-snug text-muted-foreground">
              Процент складывается из трёх: гармония цвета, уместность по погоде
              и формальность для ситуации «{situation}».
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
              <Sparkles className="size-3.5" />
              {outfit.harmony}
            </span>
            <span className="flex items-center gap-1" aria-label="Палитра образа">
              {outfit.palette.map((hex) => (
                <span
                  key={hex}
                  className="size-4 rounded-full border border-white/30 shadow-sm"
                  style={{ backgroundColor: hex }}
                />
              ))}
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {outfit.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="font-normal text-xs">
                {tag}
              </Badge>
            ))}
          </div>

          <ul className="space-y-1.5 border-t border-border/50 pt-3">
            {outfit.items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 text-sm bg-white/30 rounded-xl px-3 py-2">
                <span className="flex min-w-0 items-center gap-2">
                  <span aria-hidden>{item.emoji}</span>
                  <span className="truncate font-medium">{item.name}</span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground bg-white/50 px-2 py-0.5 rounded-full">
                  {CATEGORY_LABEL[item.category]}
                </span>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2 pt-1">
            <Button className="flex-1 rounded-full bg-primary hover:bg-primary/90" onClick={onOpen}>
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
/*  3. Альтернативы (правая колонка)                                          */
/* ========================================================================== */

function AlternativesStub() {
  return (
    <section className="space-y-3">
      <SectionHeader icon={LayoutGrid} title="Альтернативы" hint="Несколько образов на выбор" />

      <div className="rounded-3xl border border-dashed border-border bg-card/60 p-3">
        <div className="grid grid-cols-3 gap-2">
          {["🌤", "🍂", "🌙"].map((emoji) => (
            <div
              key={emoji}
              className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-gradient-to-br from-muted to-secondary/70"
            >
              <span
                aria-hidden
                className="absolute inset-0 grid place-items-center text-2xl opacity-25 blur-[1.5px]"
              >
                {emoji}
              </span>
            </div>
          ))}
        </div>

        <p className="mt-3 text-xs leading-snug text-muted-foreground">
          Скоро здесь будет 3–5 вариантов на день. Пока показываем лучший образ.
        </p>
      </div>
    </section>
  );
}

/* ========================================================================== */
/*  4. Список вещей (правая колонка)                                          */
/* ========================================================================== */

function WardrobePreview({ items, onAddItem }: { items: Item[]; onAddItem?: () => void }) {
  const shown = items.slice(0, 5);

  return (
    <section className="space-y-3">
      <SectionHeader
        icon={Shirt}
        title="Мои вещи"
        hint={items.length > 0 ? `${items.length} в гардеробе` : "Пока пусто"}
        action={
          items.length > 0 ? (
            <Link
              to="/wardrobe"
              className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-primary hover:bg-primary/5"
            >
              Все
              <ArrowRight className="size-3.5" />
            </Link>
          ) : null
        }
      />

      {items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-card/60 px-5 py-6 text-center">
          <p className="text-sm text-muted-foreground">
            Добавьте первую вещь — образ появится сразу.
          </p>
          {onAddItem ? (
            <Button className="mt-3 rounded-full" onClick={onAddItem}>
              <Plus className="size-4" />
              Добавить вещь
            </Button>
          ) : null}
        </div>
      ) : (
        <ul className="divide-y divide-border/60 overflow-hidden rounded-3xl border border-border/60 bg-card">
          {shown.map((item) => (
            <li key={item.id} className="flex items-center gap-3 px-4 py-3">
              <span
                className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted text-lg"
                aria-hidden
              >
                {SLOT_EMOJI[item.slot]}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{itemName(item)}</p>
                <p className="text-xs text-muted-foreground">
                  {item.color.label} · {formatItemRange(item)}
                </p>
              </div>
              <span
                className="size-4 shrink-0 rounded-full border border-border"
                style={{ backgroundColor: item.color.hex }}
                aria-hidden
              />
            </li>
          ))}
        </ul>
      )}

      {items.length > shown.length ? (
        <p className="text-xs text-muted-foreground">И ещё {items.length - shown.length} в гардеробе</p>
      ) : null}
    </section>
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
  const { weather, isFallback: isWeatherFallback, error: weatherError } =
    useWeather();
  const [occasion, setOccasion] = React.useState<Occasion>(() => defaultOccasion());
  const {
    outfitOfTheDay,
    items,
    isLoading: isOutfitsLoading,
    isRegenerating,
    error: outfitsError,
    regenerate,
  } = useHomeOutfits(weather.temp, occasion);

  const userName = name?.trim() || "гость";
  const userInitial = userName.charAt(0).toUpperCase();
  const todayLabel = formatToday();

  return (
    <>
      <PageHeader
        eyebrow={todayLabel}
        title={`Привет, ${userName} 👋`}
        action={
          <div className="grid size-10 place-items-center rounded-full bg-gradient-to-br from-amber-300 to-rose-300 text-sm font-semibold text-white shadow-sm">
            {userInitial}
          </div>
        }
      />

      <main className="space-y-6 lg:grid lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:items-start lg:gap-6 lg:space-y-0">
        <div className="space-y-6">
          <Reveal>
            <WeatherCard
              weather={weather}
              isFallback={isWeatherFallback}
              error={weatherError}
            />
          </Reveal>

          <Reveal delay={0.03}>
            <SituationPicker value={occasion} onChange={setOccasion} />
          </Reveal>

          {outfitsError ? (
            <p
              role="alert"
              className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-xs text-destructive"
            >
              Не удалось прочитать гардероб: {outfitsError}
            </p>
          ) : null}

          <Reveal delay={0.06}>
            {isOutfitsLoading ? (
              <OutfitSkeleton />
            ) : outfitOfTheDay ? (
              <OutfitOfTheDay
                outfit={outfitOfTheDay}
                situation={OCCASION_MAP[occasion].label}
                isRegenerating={isRegenerating}
                onRegenerate={regenerate}
                onOpen={() => onOpenOutfit?.(outfitOfTheDay)}
              />
            ) : (
              <EmptyOutfit onAddItem={onAddItem} />
            )}
          </Reveal>
        </div>

        <div className="space-y-6">
          <Reveal delay={0.12}>
            <AlternativesStub />
          </Reveal>

          <Reveal delay={0.18}>
            <WardrobePreview items={items} onAddItem={onAddItem} />
          </Reveal>
        </div>
      </main>
    </>
  );
}
