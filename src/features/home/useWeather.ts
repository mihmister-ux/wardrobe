"use client";

import * as React from "react";
import type { Weather, WeatherKind } from "@/features/home/HomePage";
import {
  clearManualWeather,
  manualMatchesCity,
  readManualWeather,
  writeManualWeather,
  type ManualWeather,
} from "@/features/home/manualWeather";
import { toast } from "@/components/ui/toast";
import { useSettings } from "@/features/settings/useSettings";

/* ========================================================================== */
/*  WMO weather code → иконка и подпись                                       */
/* ========================================================================== */

function describeCode(code: number): { kind: WeatherKind; condition: string } {
  switch (code) {
    case 0:
      return { kind: "clear", condition: "Ясно" };
    case 1:
      return { kind: "partly", condition: "Малооблачно" };
    case 2:
      return { kind: "partly", condition: "Переменная облачность" };
    case 3:
      return { kind: "cloudy", condition: "Пасмурно" };
    case 45:
    case 48:
      return { kind: "cloudy", condition: "Туман" };
    case 51:
    case 53:
    case 55:
      return { kind: "rain", condition: "Морось" };
    case 56:
    case 57:
      return { kind: "rain", condition: "Ледяная морось" };
    case 61:
      return { kind: "rain", condition: "Небольшой дождь" };
    case 63:
      return { kind: "rain", condition: "Дождь" };
    case 65:
      return { kind: "rain", condition: "Сильный дождь" };
    case 66:
    case 67:
      return { kind: "rain", condition: "Ледяной дождь" };
    case 71:
      return { kind: "snow", condition: "Небольшой снег" };
    case 73:
      return { kind: "snow", condition: "Снег" };
    case 75:
      return { kind: "snow", condition: "Сильный снег" };
    case 77:
      return { kind: "snow", condition: "Снежная крупа" };
    case 80:
    case 81:
      return { kind: "rain", condition: "Ливень" };
    case 82:
      return { kind: "rain", condition: "Сильный ливень" };
    case 85:
    case 86:
      return { kind: "snow", condition: "Снегопад" };
    case 95:
      return { kind: "rain", condition: "Гроза" };
    case 96:
    case 99:
      return { kind: "rain", condition: "Гроза с градом" };
    default:
      return { kind: "cloudy", condition: "Облачно" };
  }
}

/* ========================================================================== */
/*  Геолокация                                                                */
/* ========================================================================== */

const GEO_TIMEOUT_MS = 8000;
const FETCH_TIMEOUT_MS = 8000;

interface Coords {
  latitude: number;
  longitude: number;
}

/**
 * Координаты пользователя или null, если браузер не дал доступ.
 * Используются, только когда город не указан в настройках.
 */
function getCoords(): Promise<Coords | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.resolve(null);
  }

  return new Promise<Coords | null>((resolve) => {
    let settled = false;

    const finish = (value: Coords | null) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    // Свой таймаут: браузер не всегда соблюдает timeout в опциях.
    const timer = setTimeout(() => finish(null), GEO_TIMEOUT_MS + 2000);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timer);
        finish({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => {
        clearTimeout(timer);
        finish(null);
      },
      {
        enableHighAccuracy: false,
        timeout: GEO_TIMEOUT_MS,
        maximumAge: 10 * 60 * 1000,
      },
    );
  });
}

/* ========================================================================== */
/*  Open-Meteo: погода и геокодинг                                            */
/* ========================================================================== */

interface OpenMeteoResponse {
  current?: {
    temperature_2m?: number;
    apparent_temperature?: number;
    relative_humidity_2m?: number;
    wind_speed_10m?: number;
    weather_code?: number;
  };
  daily?: {
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
  };
}

interface GeocodeResult {
  latitude: number;
  longitude: number;
  name: string;
  country?: string;
  admin1?: string;
}

function round(value: number, fallback: number): number {
  return Number.isFinite(value) ? Math.round(value) : fallback;
}

async function fetchWeather(
  coords: Coords,
  signal: AbortSignal,
): Promise<Weather> {
  const params = new URLSearchParams({
    latitude: coords.latitude.toFixed(4),
    longitude: coords.longitude.toFixed(4),
    current:
      "temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code",
    daily: "temperature_2m_max,temperature_2m_min",
    wind_speed_unit: "ms",
    timezone: "auto",
    forecast_days: "1",
  });

  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
    signal,
  });
  if (!response.ok) throw new Error(`Open-Meteo ответил ${response.status}`);

  const data = (await response.json()) as OpenMeteoResponse;
  const current = data.current;
  if (!current || typeof current.temperature_2m !== "number") {
    throw new Error("Open-Meteo вернул пустой ответ");
  }

  const temp = Math.round(current.temperature_2m);
  const { kind, condition } = describeCode(current.weather_code ?? 3);

  return {
    city: "Мой город",
    temp,
    feelsLike: round(current.apparent_temperature ?? temp, temp),
    high: round(data.daily?.temperature_2m_max?.[0] ?? temp, temp),
    low: round(data.daily?.temperature_2m_min?.[0] ?? temp, temp),
    kind,
    condition,
    wind: round(current.wind_speed_10m ?? 0, 0),
    humidity: round(current.relative_humidity_2m ?? 0, 0),
  };
}

/**
 * Город → координаты. Open-Meteo Geocoding понимает «Казань», «Kazan»
 * и опечатки в разумных пределах; пустой ответ — город не найден.
 */
async function geocodeCity(
  name: string,
  signal: AbortSignal,
): Promise<GeocodeResult | null> {
  const params = new URLSearchParams({
    name,
    count: "1",
    language: "ru",
    format: "json",
  });

  const response = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?${params}`,
    { signal },
  );
  if (!response.ok) {
    throw new Error(`Поиск города: Open-Meteo ответил ${response.status}`);
  }

  const data = (await response.json()) as { results?: GeocodeResult[] };
  return data.results?.[0] ?? null;
}

/** Название города по координатам. Не критично: без него останется «Мой город». */
async function fetchCityName(
  coords: Coords,
  signal: AbortSignal,
): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      latitude: coords.latitude.toFixed(4),
      longitude: coords.longitude.toFixed(4),
      localityLanguage: "ru",
    });
    const response = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?${params}`,
      { signal },
    );
    if (!response.ok) return null;

    const data = (await response.json()) as {
      city?: string;
      locality?: string;
      principalSubdivision?: string;
    };
    return data.city || data.locality || data.principalSubdivision || null;
  } catch {
    return null;
  }
}

/* ========================================================================== */
/*  Хук                                                                       */
/* ========================================================================== */

export type WeatherStatus = "real" | "manual" | "unavailable";

export interface UseWeatherResult {
  /**
   * Погода или null, когда данных нет вообще: в этом случае экран честно
   * говорит «не удалось», а не показывает заглушку как настоящую погоду.
   */
  weather: Weather | null;
  /** real — с сервера, manual — введено вручную, unavailable — ничего. */
  status: WeatherStatus;
  isLoading: boolean;
  error: string | null;
  /** Выбран ли город в настройках (иначе — геолокация). */
  hasCity: boolean;
  /** Город из настроек, без пробелов; пустая строка — не выбран. */
  city: string;
  /** Сохранённое вручную значение (для текущего города), если есть. */
  manual: ManualWeather | null;
  saveManual: (temp: number, kind: WeatherKind, condition: string) => void;
  refetch: () => void;
}

/** Ручное значение → обычный объект погоды (для карточки и образа дня). */
function weatherFromManual(value: ManualWeather, city: string): Weather {
  return {
    city: value.city || city || "Ручной ввод",
    temp: value.temp,
    feelsLike: value.temp,
    high: value.temp,
    low: value.temp,
    kind: value.kind,
    condition: value.condition,
    wind: 0,
    humidity: 0,
  };
}

export function useWeather(): UseWeatherResult {
  const { city: settingsCity, isLoading: isSettingsLoading } = useSettings();

  const [weather, setWeather] = React.useState<Weather | null>(null);
  const [status, setStatus] = React.useState<WeatherStatus>("unavailable");
  const [manual, setManual] = React.useState<ManualWeather | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [attempt, setAttempt] = React.useState(0);

  const refetch = React.useCallback(() => setAttempt((value) => value + 1), []);
  const hasCity = settingsCity.length > 0;

  /** Сохранённое значение, но только если оно относится к текущему городу. */
  const usableManual = React.useCallback(() => {
    const stored = readManualWeather();
    return stored && manualMatchesCity(stored, settingsCity) ? stored : null;
  }, [settingsCity]);

  const saveManual = React.useCallback(
    (temp: number, kind: WeatherKind, condition: string) => {
      const value: ManualWeather = {
        mode: "manual",
        temp: Math.round(temp),
        kind,
        condition,
        city: settingsCity,
        savedAt: Date.now(),
      };
      writeManualWeather(value);
      setManual(value);
      setWeather(weatherFromManual(value, settingsCity));
      setStatus("manual");
      setError(null);
      setIsLoading(false);
    },
    [settingsCity],
  );

  React.useEffect(() => {
    // Ждём настройки: иначе на долю секунды покажем погоду не того города.
    if (isSettingsLoading) return;

    const controller = new AbortController();
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    /** Реальных данных нет: показываем ручной ввод, если он есть для этого города. */
    const noRealWeather = (message: string | null) => {
      if (cancelled) return;
      const stored = usableManual();
      if (stored) {
        setManual(stored);
        setWeather(weatherFromManual(stored, settingsCity));
        setStatus("manual");
      } else {
        setManual(null);
        setWeather(null);
        setStatus("unavailable");
      }
      setError(message);
      setIsLoading(false);
    };

    void (async () => {
      setIsLoading(true);
      setError(null);
      setManual(usableManual());
      // Один таймаут на геокодинг и на прогноз: город не должен «висеть».
      timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      try {
        let coords: Coords;
        let label: string | null = null;

        if (settingsCity) {
          const place = await geocodeCity(settingsCity, controller.signal);
          if (cancelled) return;
          if (!place) {
            noRealWeather(
              `Не нашли город «${settingsCity}». Проверьте название в профиле.`,
            );
            return;
          }
          coords = { latitude: place.latitude, longitude: place.longitude };
          label = place.name;
        } else {
          const geo = await getCoords();
          if (cancelled) return;
          if (!geo) {
            noRealWeather(
              "Геолокация недоступна. Укажите город в профиле — погода будет точнее.",
            );
            return;
          }
          coords = geo;
        }

        const data = await fetchWeather(coords, controller.signal);
        if (cancelled) return;

        if (settingsCity) {
          setWeather({ ...data, city: label ?? settingsCity });
        } else {
          const city = await fetchCityName(coords, controller.signal);
          if (cancelled) return;
          setWeather(city ? { ...data, city } : data);
        }

        setStatus("real");
        setError(null);

        // Реальные данные важнее ручных: затираем ручной ввод (только «свой»).
        const stored = usableManual();
        if (stored) {
          clearManualWeather();
          setManual(null);
          toast("Погода пришла с сервера — ручной ввод больше не нужен");
        }
      } catch (err) {
        if (cancelled) return;
        const message = controller.signal.aborted
          ? "Сервис погоды не ответил за 8 секунд. Попробуйте ещё раз."
          : err instanceof TypeError
            ? "Нет связи с сервисом погоды. Проверьте интернет."
            : err instanceof Error
              ? err.message
              : String(err);
        noRealWeather(message);
      } finally {
        if (timer) clearTimeout(timer);
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
      if (timer) clearTimeout(timer);
    };
  }, [attempt, isSettingsLoading, settingsCity, usableManual]);

  return {
    weather,
    status,
    isLoading,
    error,
    hasCity,
    city: settingsCity,
    manual,
    saveManual,
    refetch,
  };
}