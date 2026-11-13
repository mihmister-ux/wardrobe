/**
 * Ручная погода.
 *
 * Когда Open-Meteo молчит (нет сети, сервис лежит) или город ещё не выбран,
 * человек может задать температуру сам — образ дня соберётся под неё.
 * Значение живёт в localStorage, чтобы переживало перезагрузку.
 *
 * Важное правило: значение привязано к городу. При смене города оно не
 * применяется — иначе на новом месте показывалась бы погода из прошлого.
 */

import type { WeatherKind } from "@/features/home/HomePage";

const MANUAL_WEATHER_KEY = "wardrobe_manual_weather";

/** Пометка в хранилище: температуру ввёл человек, а не пришла с сервера. */
const MANUAL_MARK = "manual" as const;

export interface ManualWeather {
  mode: typeof MANUAL_MARK;
  temp: number;
  kind: WeatherKind;
  /** Подпись под температурой: «Облачно», «Солнечно», «Дождь». */
  condition: string;
  /** Город, для которого ввели значение; пусто — город не выбран. */
  city: string;
  savedAt: number;
}

const KINDS: readonly WeatherKind[] = ["clear", "partly", "cloudy", "rain", "snow"];

function isKind(value: unknown): value is WeatherKind {
  return typeof value === "string" && (KINDS as readonly string[]).includes(value);
}

/**
 * Прочитать сохранённое значение. Битые данные (руками испорченный localStorage,
 * старая версия формата) считаем отсутствующими, а не падаем.
 */
export function readManualWeather(): ManualWeather | null {
  try {
    const raw = localStorage.getItem(MANUAL_WEATHER_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<ManualWeather> | null;
    if (!parsed || typeof parsed.temp !== "number" || !Number.isFinite(parsed.temp)) {
      return null;
    }
    if (parsed.temp < -60 || parsed.temp > 60) return null;
    if (typeof parsed.savedAt !== "number" || !Number.isFinite(parsed.savedAt)) {
      return null;
    }

    return {
      mode: MANUAL_MARK,
      temp: Math.round(parsed.temp),
      kind: isKind(parsed.kind) ? parsed.kind : "cloudy",
      condition:
        typeof parsed.condition === "string" && parsed.condition.trim()
          ? parsed.condition.trim()
          : "Вручную",
      city: typeof parsed.city === "string" ? parsed.city.trim() : "",
      savedAt: parsed.savedAt,
    };
  } catch {
    // localStorage недоступен (приватный режим) или мусор внутри — просто нет значения.
    return null;
  }
}

export function writeManualWeather(value: ManualWeather): void {
  try {
    localStorage.setItem(MANUAL_WEATHER_KEY, JSON.stringify(value));
  } catch {
    // Не сохранилось — значение всё равно применится до перезагрузки.
  }
}

export function clearManualWeather(): void {
  try {
    localStorage.removeItem(MANUAL_WEATHER_KEY);
  } catch {
    // Удалять нечего или доступа нет.
  }
}

/** Относится ли значение к этому городу (регистр и лишние пробелы не важны). */
export function manualMatchesCity(value: ManualWeather, city: string): boolean {
  return value.city.trim().toLowerCase() === city.trim().toLowerCase();
}

/**
 * Разбор поля «Температура»: принимаем «+15», «15», «-8», типографский минус
 * «−8» и запятую. Всё, что не число в разумных пределах, — null.
 */
export function parseTemperature(raw: string): number | null {
  const cleaned = raw
    .replace(/[−–—]/g, "-")
    .replace(/\s+/g, "")
    .replace(",", ".");

  if (!cleaned || !/^[+-]?\d+(\.\d+)?$/.test(cleaned)) return null;

  const value = Math.round(Number(cleaned));
  if (!Number.isFinite(value) || value < -60 || value > 60) return null;
  return value;
}
