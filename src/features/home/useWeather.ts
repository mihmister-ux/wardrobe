"use client";

import * as React from "react";
import type { Weather, WeatherKind } from "@/features/home/HomePage";

/* ========================================================================== */
/*  Заглушка: показывается, если нет геолокации или API не ответил            */
/* ========================================================================== */

const FALLBACK_WEATHER: Weather = {
  city: "Москва",
  temp: 7,
  feelsLike: 4,
  high: 9,
  low: 3,
  kind: "cloudy",
  condition: "Облачно",
  wind: 4,
  humidity: 68,
};

const GEO_TIMEOUT_MS = 8000;
const FETCH_TIMEOUT_MS = 8000;

interface Coords {
  latitude: number;
  longitude: number;
}

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

/**
 * Координаты пользователя или null, если браузер не дал доступ.
 * TODO: Добавить ручной выбор города, чтобы мы знали, что это надо доработать позже.
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
      { enableHighAccuracy: false, timeout: GEO_TIMEOUT_MS, maximumAge: 10 * 60 * 1000 },
    );
  });
}

/* ========================================================================== */
/*  Open-Meteo                                                                */
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

function round(value: number, fallback: number): number {
  return Number.isFinite(value) ? Math.round(value) : fallback;
}

async function fetchWeather(coords: Coords, signal: AbortSignal): Promise<Weather> {
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

  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { signal });
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

/** Название города по координатам. Не критично: без него останется «Мой город». */
async function fetchCityName(coords: Coords, signal: AbortSignal): Promise<string | null> {
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

export interface UseWeatherResult {
  /** Всегда валидный объект: реальные данные или заглушка «Москва +7°». */
  weather: Weather;
  isLoading: boolean;
  isFallback: boolean;
  error: string | null;
  refetch: () => void;
}

export function useWeather(): UseWeatherResult {
  const [weather, setWeather] = React.useState<Weather>(FALLBACK_WEATHER);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isFallback, setIsFallback] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [attempt, setAttempt] = React.useState(0);

  const refetch = React.useCallback(() => setAttempt((value) => value + 1), []);

  React.useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    const fallback = (reason: string | null) => {
      if (cancelled) return;
      setWeather(FALLBACK_WEATHER);
      setIsFallback(true);
      setError(reason);
    };

    (async () => {
      setIsLoading(true);
      setError(null);

      const coords = await getCoords();
      if (cancelled) return;

      if (!coords) {
        fallback("Геолокация недоступна");
        setIsLoading(false);
        return;
      }

      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      try {
        const [data, city] = await Promise.all([
          fetchWeather(coords, controller.signal),
          fetchCityName(coords, controller.signal),
        ]);
        if (cancelled) return;

        setWeather(city ? { ...data, city } : data);
        setIsFallback(false);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        fallback(err instanceof Error ? err.message : String(err));
      } finally {
        clearTimeout(timer);
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [attempt]);

  return { weather, isLoading, isFallback, error, refetch };
}
