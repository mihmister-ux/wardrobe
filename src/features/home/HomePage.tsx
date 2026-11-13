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
import { toast } from "@/components/ui/toast";
import { OCCASION_MAP } from "@/db/seed/references";
import type { Item, Occasion } from "@/db/types";
import { ColorDots } from "@/features/items/ColorDots";
import { itemColorLabel } from "@/features/items/itemColors";
import { formatItemRange, itemName, SLOT_EMOJI } from "@/features/items/itemView";
import type { OutfitScore } from "@/features/home/scoreOutfit";
import { parseTemperature, type ManualWeather } from "@/features/home/manualWeather";
import { useHomeOutfits } from "@/features/home/useHomeOutfits";
import { useWeather, type WeatherStatus } from "@/features/home/useWeather";
import { saveOutfit } from "@/features/outfits/useSavedOutfits";
import { formatWornDay, recordWornOutfit } from "@/features/outfits/useWornHistory";
import { useUserName } from "@/features/settings/useUserName";
import { ItemPhoto } from "@/features/wardrobe/ItemPhoto";
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
  /** Полная вещь из базы — чтобы показать настоящее фото, а не эмодзи. */
  item: Item;
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

/**
 * Температура, по которой собираем образ, пока погоды нет (сервис молчит,
 * ручной ввод ещё не сделан). Нейтральная: не «мороз» и не «жара», чтобы
 * образ без погоды не выкидывал лишнюю верхнюю одежду.
 */
const NEUTRAL_TEMPERATURE = 15;

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
        <h2 className="flex items-center gap-2 font-serif text-lg font-semibold tracking-tight">
          <Icon className="size-4 text-muted-foreground" />
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
      <span aria-hidden className="absolute font-mono text-xs font-semibold tabular-nums">
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
        <div className="font-mono font-medium tabular-nums">{value}</div>
      </div>
    </div>
  );
}

/* ========================================================================== */
/*  1. Погода                                                                 */
/* ========================================================================== */

/** Что человек может выбрать сам вместе с температурой. */
const MANUAL_CONDITIONS = [
  { kind: "clear", label: "Солнечно" },
  { kind: "cloudy", label: "Облачно" },
  { kind: "rain", label: "Дождь" },
] as const;

const MANUAL_TIME_FORMATTER = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

/** «+15°» / «−8°»: плюс показываем явно, минус — типографским знаком. */
function formatTemperature(value: number): string {
  if (value === 0) return "0°";
  return value > 0 ? `+${value}°` : `−${Math.abs(value)}°`;
}

/** Строка «Ваш город … Изменить» — общая для всех состояний карточки. */
function CityLine({
  hasCity,
  label,
  badge,
}: {
  hasCity: boolean;
  label: string;
  badge?: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0.5 text-xs font-medium text-muted-foreground">
      <MapPin className="size-3.5 shrink-0" />
      <span className="shrink-0">Ваш город</span>
      <span className="truncate text-foreground">{hasCity ? label : "не выбран"}</span>
      <Link
        to="/profile"
        className="ml-1 shrink-0 text-[11px] font-medium text-primary hover:underline"
      >
        {hasCity ? "Изменить" : "Указать город"}
      </Link>
      {badge}
    </div>
  );
}

/**
 * Ручной ввод погоды: температура + необязательная подпись.
 * Форма одна на два случая — «сервис молчит» и «правлю ручное значение».
 */
function ManualWeatherForm({
  defaultTemp,
  defaultKind,
  showCityHint,
  onSave,
  onRetry,
}: {
  defaultTemp?: number;
  defaultKind?: WeatherKind;
  /** Подсказать про профиль, когда город не выбран. */
  showCityHint: boolean;
  onSave: (temp: number, kind: WeatherKind, condition: string) => void;
  onRetry: () => void;
}) {
  const [value, setValue] = React.useState(() =>
    defaultTemp != null && defaultTemp > 0 ? `+${defaultTemp}` : (defaultTemp != null ? String(defaultTemp) : ""),
  );
  const [kind, setKind] = React.useState<WeatherKind>(defaultKind ?? "cloudy");
  const [error, setError] = React.useState<string | null>(null);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = parseTemperature(value);
    if (parsed === null) {
      setError("Введите температуру числом: +15, 0 или -8");
      return;
    }
    setError(null);
    const label =
      MANUAL_CONDITIONS.find((item) => item.kind === kind)?.label ?? "Вручную";
    onSave(parsed, kind, label);
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="space-y-1.5">
        <label
          htmlFor="manual-weather-temp"
          className="block text-xs font-medium text-muted-foreground"
        >
          Температура, °C
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <input
            id="manual-weather-temp"
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setError(null);
            }}
            placeholder="+15"
            inputMode="text"
            autoComplete="off"
            aria-invalid={error !== null}
            className="h-10 w-24 rounded-xl border border-border bg-transparent px-3 text-sm tabular-nums outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <Button type="submit" className="rounded-xl">
            Сохранить
          </Button>
          <Button type="button" variant="outline" className="rounded-xl" onClick={onRetry}>
            Проверить снова
          </Button>
        </div>
      </div>

      <div role="group" aria-label="Погода" className="flex flex-wrap gap-1.5">
        {MANUAL_CONDITIONS.map((item) => {
          const isActive = item.kind === kind;
          return (
            <button
              key={item.kind}
              type="button"
              aria-pressed={isActive}
              onClick={() => setKind(item.kind)}
              className={cn(
                "inline-flex min-h-9 items-center rounded-full border px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}

      {showCityHint ? (
        <p className="text-xs leading-relaxed text-muted-foreground">
          Или укажите город — тогда погода будет подтягиваться сама.{" "}
          <Link to="/profile" className="font-medium text-primary hover:underline">
            Профиль
          </Link>
        </p>
      ) : null}
    </form>
  );
}

/** Компактная «пилюля»-кнопка для подвала карточки. */
const CARD_ACTION_CLASS =
  "inline-flex min-h-9 items-center rounded-full border border-border bg-background px-3 text-xs font-medium text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function WeatherCard({
  status,
  weather,
  error,
  hasCity,
  city,
  isLoading,
  manual,
  onSaveManual,
  onRefetch,
}: {
  status: WeatherStatus;
  weather: Weather | null;
  error: string | null;
  hasCity: boolean;
  /** Город из настроек: показываем его, пока погода не загрузилась. */
  city: string;
  isLoading: boolean;
  manual: ManualWeather | null;
  onSaveManual: (temp: number, kind: WeatherKind, condition: string) => void;
  onRefetch: () => void;
}) {
  const [isEditing, setIsEditing] = React.useState(false);

  if (isLoading) {
    return (
      <section
        aria-label="Погода"
        aria-busy="true"
        className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-sm"
      >
        <div className="flex items-start justify-between gap-4 p-4">
          <div className="min-w-0 space-y-2">
            <CityLine hasCity={hasCity} label={city} />
            <div className="h-9 w-28 animate-pulse rounded-lg bg-muted" />
            <div className="h-3 w-40 animate-pulse rounded bg-muted" />
          </div>
          <div className="size-14 shrink-0 animate-pulse rounded-2xl bg-muted" />
        </div>
        <div className="border-t border-border/60 bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground">
          Обновляем погоду…
        </div>
      </section>
    );
  }

  /* --- Погоды нет: честно говорим об этом и предлагаем ручной ввод --- */
  if (status === "unavailable" || weather === null) {
    return (
      <section
        aria-label="Погода"
        className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-sm"
      >
        <div className="flex items-start justify-between gap-4 p-4">
          <div className="min-w-0 space-y-1.5">
            <CityLine hasCity={hasCity} label={city} />
            <p className="font-serif text-xl font-semibold leading-tight">
              {hasCity ? "Не удалось обновить погоду" : "Укажите город"}
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {hasCity
                ? "Сервис погоды не ответил. Введите температуру — образ дня соберётся под неё."
                : "Погода считается по городу. Выберите город или введите температуру вручную."}
            </p>
            {error ? (
              <p className="font-mono text-[11px] leading-snug text-muted-foreground/80">
                {error}
              </p>
            ) : null}
          </div>
          <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-muted text-muted-foreground">
            <Cloud className="size-7" />
          </div>
        </div>

        <div className="border-t border-border/60 bg-muted/40 px-4 py-3">
          <ManualWeatherForm
            showCityHint={!hasCity}
            onSave={onSaveManual}
            onRetry={onRefetch}
          />
        </div>
      </section>
    );
  }

  const Icon = WEATHER_ICON[weather.kind];
  const isManual = status === "manual";

  return (
    <section
      aria-label="Погода"
      className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-sm"
    >
      <div className="flex items-start justify-between gap-4 p-4">
        <div className="min-w-0 space-y-1">
          <CityLine
            hasCity={hasCity}
            label={weather.city}
            badge={
              isManual ? (
                <span className="ml-1 shrink-0 rounded-full border border-[#d9c9a3] bg-[#f3ecd9] px-1.5 py-0.5 text-[10px] font-medium text-[#6b5a2e] dark:border-border dark:bg-muted dark:text-muted-foreground">
                  ручной ввод
                </span>
              ) : null
            }
          />
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="font-mono text-4xl font-semibold leading-none tracking-tight tabular-nums">
              {formatTemperature(weather.temp)}
            </span>
            <span className="text-sm text-muted-foreground">{weather.condition}</span>
          </div>
          {isManual ? (
            <p className="font-mono text-xs tabular-nums text-muted-foreground">
              {manual
                ? `введено ${MANUAL_TIME_FORMATTER.format(new Date(manual.savedAt))}`
                : "введено вручную"}
            </p>
          ) : (
            <p className="font-mono text-xs tabular-nums text-muted-foreground">
              ощущается как {weather.feelsLike}° · {weather.low}…{weather.high}°
            </p>
          )}
        </div>
        <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="size-7" />
        </div>
      </div>

      {/* Ветер и влажность есть только у настоящей погоды. */}
      {isManual ? null : (
        <div className="grid grid-cols-2 gap-px border-t border-border/60 bg-border/40">
          <Stat icon={Wind} label="Ветер" value={`${weather.wind} м/с`} />
          <Stat icon={Droplets} label="Влажность" value={`${weather.humidity}%`} />
        </div>
      )}

      <div className="space-y-2 border-t border-border/60 bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground">
        <p>{weatherHint(weather)}</p>

        {isManual ? (
          isEditing ? (
            <div className="pt-1">
              <ManualWeatherForm
                defaultTemp={weather.temp}
                defaultKind={weather.kind}
                showCityHint={false}
                onSave={(temp, kind, condition) => {
                  onSaveManual(temp, kind, condition);
                  setIsEditing(false);
                }}
                onRetry={() => {
                  setIsEditing(false);
                  onRefetch();
                }}
              />
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <button
                type="button"
                className={CARD_ACTION_CLASS}
                onClick={() => setIsEditing(true)}
              >
                Изменить
              </button>
              <button type="button" className={CARD_ACTION_CLASS} onClick={onRefetch}>
                Обновить с сервера
              </button>
            </div>
          )
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
    <section aria-labelledby="situation-title" className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <h2
          id="situation-title"
          className="flex items-center gap-2 font-serif text-lg font-semibold tracking-tight"
        >
          <Compass className="size-4 text-muted-foreground" />
          Куда собираемся
        </h2>
        <span className="font-mono text-[11px] text-muted-foreground">влияет на оценку</span>
      </div>

      <div role="group" aria-label="Ситуация" className="flex flex-wrap gap-1.5">
        {SITUATIONS.map(({ id, emoji }) => {
          const isActive = id === value;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={isActive}
              onClick={() => onChange(id)}
              className={cn(
                "inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-[transform,border-color,background-color,color] duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
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
  hint = "Собран под текущую погоду",
  weatherKnown = true,
  onSave,
  onRegenerate,
  isRegenerating = false,
}: {
  outfit: Outfit;
  /** Подпись выбранной ситуации — в пояснении к оценке. */
  situation: string;
  /** Подпись под заголовком «Образ дня». */
  hint?: string;
  /** Известна ли погода: если нет, не выдаём оценку «по погоде» за правду. */
  weatherKnown?: boolean;
  /** Сохранить в «Образы»; вернёт true, если записалось (нет дубля). */
  onSave?: () => Promise<boolean> | void;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
}) {
  const [saved, setSaved] = React.useState(false);
  const parts = outfit.scoreParts;

  /** Отметить «носил сегодня»: пишем в журнал и показываем тост. */
  const handleWear = async () => {
    const recorded = await recordWornOutfit(
      outfit.items.map((entry) => entry.item.id),
      outfit.score,
    );
    if (recorded) {
      toast(`Образ сохранён в историю: ${formatWornDay(Date.now())}`);
    }
  };

  return (
    <section className="space-y-3">
      <SectionHeader
        icon={Sparkles}
        title="Образ дня"
        hint={hint}
        action={
          onRegenerate ? (
            <div className="flex shrink-0 items-center">
              {/* Десктоп: текстом — иначе непонятно, что делает ↻. */}
              <Button
                type="button"
                onClick={onRegenerate}
                disabled={isRegenerating}
                title="Предложить другой образ"
                className="hidden gap-2 rounded-full bg-primary px-5 py-2.5 text-primary-foreground hover:bg-primary/90 sm:inline-flex"
              >
                <RefreshCw className={cn("size-4", isRegenerating && "animate-spin")} />
                Обновить образ
              </Button>
              {/* Узкий экран: места под текст нет — круглая, но с подсказкой. */}
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={onRegenerate}
                disabled={isRegenerating}
                title="Обновить образ"
                aria-label="Обновить образ"
                className="rounded-full sm:hidden"
              >
                <RefreshCw className={cn("size-4", isRegenerating && "animate-spin")} />
              </Button>
            </div>
          ) : null
        }
      />

      <article className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-[0_24px_60px_-34px_rgba(15,23,42,0.5)]">
        <div
          className={cn(
            "relative w-full bg-gradient-to-br from-primary/5 via-secondary/10 to-accent/15",
            outfit.gradient,
          )}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_15%,rgba(255,255,255,0.5),transparent_60%)]" />

          <div className="relative grid grid-cols-2 gap-3 p-3">
            {outfit.items.slice(0, 4).map((entry) => (
              <div
                key={entry.id}
                className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl border border-border/40 bg-[#fbf8f1] p-3 dark:bg-card"
              >
                <ItemPhoto
                  item={entry.item}
                  className="h-full w-full object-contain drop-shadow-sm"
                />
              </div>
            ))}
          </div>

          <div className="absolute right-3 top-3">
            <ScoreRing
              value={outfit.score}
              ariaLabel={
                weatherKnown
                  ? `Оценка образа ${outfit.score}%: цвет ${parts.color}, погода ${parts.temperature} из 10, ситуация ${parts.formality} из 5`
                  : `Оценка образа ${outfit.score}%: цвет ${parts.color}, ситуация ${parts.formality} из 5`
              }
            />
          </div>

          <button
            type="button"
            aria-pressed={saved}
            aria-label={saved ? "Образ сохранён" : "Сохранить образ"}
            onClick={async () => {
              const savedNow = await onSave?.();
              if (savedNow !== false) setSaved(true);
            }}
            className="absolute left-3 top-3 grid size-9 place-items-center rounded-full bg-background/60 text-slate-900 backdrop-blur-sm transition hover:bg-background/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Heart className={cn("size-4", saved && "fill-rose-500 text-rose-500")} />
          </button>
        </div>

        <div className="space-y-3 p-4">
          <div className="space-y-1">
            <h3 className="font-serif text-2xl font-semibold leading-tight">{outfit.title}</h3>
            <p className="text-sm text-muted-foreground">{outfit.note}</p>
          </div>

          <div className="space-y-1">
            <div
              className="flex flex-wrap items-center gap-1.5 text-xs"
              title={
                weatherKnown
                  ? "Процент = сочетаемость цвета + до 10 за погоду + до 5 за уместность"
                  : "Процент = сочетаемость цвета + до 5 за уместность"
              }
            >
              <span className="font-mono font-semibold tabular-nums text-foreground">
                Оценка {outfit.score}%
              </span>
              <span className="rounded-full border border-border/50 bg-card px-2 py-0.5 font-mono text-muted-foreground">
                цвет {parts.color}
              </span>
              {weatherKnown ? (
                <span className="rounded-full border border-border/50 bg-card px-2 py-0.5 font-mono text-muted-foreground">
                  погода +{parts.temperature}/10
                </span>
              ) : (
                <span className="rounded-full border border-dashed border-border/60 bg-card px-2 py-0.5 font-mono text-muted-foreground">
                  погода не учтена
                </span>
              )}
              <span className="rounded-full border border-border/50 bg-card px-2 py-0.5 font-mono text-muted-foreground">
                ситуация +{parts.formality}/5
              </span>
            </div>
            <p className="text-xs leading-snug text-muted-foreground">
              {weatherKnown
                ? `Процент складывается из трёх: гармония цвета, уместность по погоде и формальность для ситуации «${situation}».`
                : `Процент складывается из гармонии цвета и формальности для ситуации «${situation}». Погоды нет — задайте её в карточке выше, и образ соберётся под неё.`}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 font-mono text-xs text-primary">
              <Sparkles className="size-3.5" />
              {outfit.harmony}
            </span>
            <span className="flex items-center gap-1" aria-label="Палитра образа">
              {outfit.palette.map((hex) => (
                <span
                  key={hex}
                  className="size-4 rounded-full border border-border shadow-sm"
                  style={{ backgroundColor: hex }}
                />
              ))}
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {outfit.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="font-mono text-xs font-normal">
                {tag}
              </Badge>
            ))}
          </div>

          <ul className="space-y-1.5 border-t border-border/50 pt-3">
            {outfit.items.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 px-3 py-2 text-sm">
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-background/70">
                    <ItemPhoto item={entry.item} className="h-full w-full object-contain" />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-medium">{entry.name}</span>
                    <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <ColorDots item={entry.item} size="sm" />
                      <span className="truncate">{itemColorLabel(entry.item)}</span>
                    </span>
                  </span>
                </span>
                <span className="shrink-0 rounded-full bg-background/60 px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                  {CATEGORY_LABEL[entry.category]}
                </span>
              </li>
            ))}
          </ul>

          {/* ↻ живёт в шапке секции: он виден без прокрутки. Здесь — только «Носить». */}
          <div className="pt-1">
            <Button className="w-full rounded-full" onClick={handleWear}>
              Носить сегодня
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
          <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
          <div className="h-3 w-full animate-pulse rounded bg-muted" />
          <div className="h-3 w-4/5 animate-pulse rounded bg-muted" />
          <div className="h-11 w-full animate-pulse rounded-full bg-muted" />
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

        <h3 className="mt-4 font-serif text-xl font-semibold">Пока нечего предложить</h3>
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
/*  3. Альтернативы (реальные варианты, клик подставляет их в образ дня)      */
/* ========================================================================== */

function Alternatives({
  alternatives,
  selectedId,
  onSelect,
}: {
  alternatives: Outfit[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  // Выбираем «главное» фото альтернативы: цельный образ, иначе первый элемент.
  const hero = (outfit: Outfit): OutfitItem | undefined =>
    outfit.items.find((entry) => entry.category === "fullbody") ?? outfit.items[0];

  return (
    <section className="space-y-3">
      <SectionHeader icon={LayoutGrid} title="Альтернативы" hint="Ещё варианты из ваших вещей" />

      {alternatives.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-border bg-card/60 px-4 py-5 text-center text-xs text-muted-foreground">
          Пока только один образ. Добавьте больше вещей — появятся альтернативы
          на выбор.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {alternatives.map((outfit) => {
            const main = hero(outfit);
            return (
              <button
                key={outfit.id}
                type="button"
                onClick={() => onSelect(outfit.id)}
                aria-pressed={outfit.id === selectedId}
                aria-label={`Показать образ «${outfit.title}», оценка ${outfit.score}%`}
                className={cn(
                  "group flex flex-col rounded-2xl border bg-card p-1.5 text-left transition-[transform,border-color,box-shadow] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  outfit.id === selectedId
                    ? "border-primary ring-2 ring-primary/25"
                    : "border-border/70 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg",
                )}
              >
                {main ? (
                  <span className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl bg-background p-2">
                    <ItemPhoto item={main.item} className="h-full w-full object-contain" />
                  </span>
                ) : null}
                <span className="mt-1.5 line-clamp-2 px-0.5 text-[11px] font-medium leading-tight">
                  {outfit.title}
                </span>
                <span className="mt-1 flex items-center justify-between gap-1 px-0.5">
                  {main ? <ColorDots item={main.item} size="sm" /> : <span aria-hidden />}
                  <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                    {outfit.score}%
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

/* ========================================================================== */
/*  4. Список вещей                                                          */
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
              className="inline-flex min-h-11 items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-primary transition hover:bg-primary/5"
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
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ColorDots item={item} size="sm" className="shrink-0" />
                  <span className="truncate">
                    {itemColorLabel(item)} ·{" "}
                    <span className="font-mono tabular-nums">
                      {formatItemRange(item)}
                    </span>
                  </span>
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {items.length > shown.length ? (
        <p className="font-mono text-xs tabular-nums text-muted-foreground">
          И ещё {items.length - shown.length} в гардеробе
        </p>
      ) : null}
    </section>
  );
}

/* ========================================================================== */
/*  Экран                                                                     */
/* ========================================================================== */

export interface HomePageProps {
  onAddItem?: () => void;
}

export default function HomePage({ onAddItem }: HomePageProps) {
  const { name } = useUserName();
  const {
    weather,
    status: weatherStatus,
    isLoading: isWeatherLoading,
    error: weatherError,
    hasCity,
    city: settingsCity,
    manual: manualWeather,
    saveManual,
    refetch: refetchWeather,
  } = useWeather();
  const [occasion, setOccasion] = React.useState<Occasion>(() => defaultOccasion());

  // Погоды может не быть вовсе: тогда образ собираем по нейтральной температуре,
  // а в интерфейсе честно пишем, что она не учтена.
  const weatherKnown = weather !== null;
  const isManualWeather = weatherStatus === "manual";

  const {
    outfitOfTheDay,
    alternatives,
    select,
    selectedId,
    items,
    isLoading: isOutfitsLoading,
    isRegenerating,
    error: outfitsError,
    regenerate,
  } = useHomeOutfits(weather?.temp ?? NEUTRAL_TEMPERATURE, occasion, weatherKnown);

  const outfitHint = !weatherKnown
    ? "Погода не задана — образ собран без неё"
    : isManualWeather
      ? "Собран под температуру, введённую вручную"
      : "Собран под текущую погоду";

  const userName = name?.trim() || "гость";
  const userInitial = userName.charAt(0).toUpperCase();
  const todayLabel = formatToday();

  return (
    <>
      {/* Дата остаётся сверху, в шапке; имя — крупным блоком ниже, в потоке. */}
      <PageHeader
        eyebrow={todayLabel}
        eyebrowClassName="font-mono text-[12px] uppercase tracking-[0.08em]"
        action={
          <div className="grid size-11 place-items-center rounded-full bg-gradient-to-br from-amber-300 to-rose-300 font-serif text-sm font-semibold text-white shadow-sm">
            {userInitial}
          </div>
        }
      />

      <main className="space-y-6">
        <h1 className="greeting-shimmer font-serif text-[52px] font-semibold leading-[1.05] tracking-tight text-balance sm:text-[56px]">
          Привет, {userName}
        </h1>

        {/* Верхняя полоса: погода + ситуация. */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-start">
          <Reveal>
            <WeatherCard
              status={weatherStatus}
              weather={weather}
              error={weatherError}
              hasCity={hasCity}
              city={settingsCity}
              isLoading={isWeatherLoading}
              manual={manualWeather}
              onSaveManual={saveManual}
              onRefetch={refetchWeather}
            />
          </Reveal>

          <Reveal delay={0.03}>
            <SituationPicker value={occasion} onChange={setOccasion} />
          </Reveal>
        </div>

        {outfitsError ? (
          <p
            role="alert"
            className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-xs text-destructive"
          >
            Не удалось прочитать гардероб: {outfitsError}
          </p>
        ) : null}

        {/* Гейро: большая карточка образа дня + маленькие альтернативы сбоку. */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
          <Reveal delay={0.06}>
            {isOutfitsLoading ? (
              <OutfitSkeleton />
            ) : outfitOfTheDay ? (
              <OutfitOfTheDay
                key={outfitOfTheDay.id}
                outfit={outfitOfTheDay}
                situation={OCCASION_MAP[occasion].label}
                hint={outfitHint}
                weatherKnown={weatherKnown}
                isRegenerating={isRegenerating}
                onRegenerate={regenerate}
                onSave={() =>
                  saveOutfit(
                    outfitOfTheDay.items.map((entry) => entry.item),
                    outfitOfTheDay.score,
                  )
                }
              />
            ) : (
              <EmptyOutfit onAddItem={onAddItem} />
            )}
          </Reveal>

          <div className="space-y-6">
            <Reveal delay={0.12}>
              <Alternatives
                alternatives={alternatives}
                selectedId={selectedId}
                onSelect={select}
              />
            </Reveal>

            <Reveal delay={0.18}>
              <WardrobePreview items={items} onAddItem={onAddItem} />
            </Reveal>
          </div>
        </div>
      </main>
    </>
  );
}