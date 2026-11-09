"use client";

import * as React from "react";
import type { Weather, WeatherKind } from "@/features/home/HomePage";
import { useSettings } from "@/features/settings/useSettings";

/* ========================================================================== */
/*  Заглушка: показывается, если город не задан, нет геолокации или API молчит */
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

export type WeatherSource = "manual" | "geo" | "fallback";

export interface UseWeatherResult {
  /** Всегда валидный объект: реальные данные или заглушка «Москва +7°». */
  weather: Weather;
  isLoading: boolean;
  isFallback: boolean;
  /** Откуда взялась погода: свой город, геолокация или заглушка. */
  source: WeatherSource;
  error: string | null;
  refetch: () => void;
}

export function useWeather(): UseWeatherResult {
  const { city: manualCity, isLoading: isSettingsLoading } = useSettings();

  const [weather, setWeather] = React.useState<Weather>(FALLBACK_WEATHER);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isFallback, setIsFallback] = React.useState(true);
  const [source, setSource] = React.useState<WeatherSource>("fallback");
  const [error, setError] = React.useState<string | null>(null);
  const [attempt, setAttempt] = React.useState(0);

  const refetch = React.useCallback(() => setAttempt((value) => value + 1), []);

  React.useEffect(() => {
    // Ждём настройки: иначе на долю секунды покажем погоду не того города.
    if (isSettingsLoading) return;

    const controller = new AbortController();
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const fail = (message: string) => {
      if (cancelled) return;
      setWeather({
        ...FALLBACK_WEATHER,
        ...(manualCity ? { city: manualCity } : {}),
      });
      setIsFallback(true);
      setSource("fallback");
      setError(message);
      setIsLoading(false);
    };

    void (async () => {
      setIsLoading(true);
      setError(null);
      // Один таймаут на геокодинг и на прогноз: город не должен «висеть».
      timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      try {
        let coords: Coords;
        let label: string | null = null;

        if (manualCity) {
          const place = await geocodeCity(manualCity, controller.signal);
          if (cancelled) return;
          if (!place) {
            fail(
              `Не нашли город «${manualCity}». Проверьте название в профиле.`,
            );
            return;
          }
          coords = { latitude: place.latitude, longitude: place.longitude };
          label = place.name;
        } else {
          const geo = await getCoords();
          if (cancelled) return;
          if (!geo) {
            fail(
              "Геолокация недоступна. Укажите город в профиле — погода будет точнее.",
            );
            return;
          }
          coords = geo;
        }

        const data = await fetchWeather(coords, controller.signal);
        if (cancelled) return;

        if (manualCity) {
          setWeather({ ...data, city: label ?? manualCity });
          setSource("manual");
        } else {
          const city = await fetchCityName(coords, controller.signal);
          if (cancelled) return;
          setWeather(city ? { ...data, city } : data);
          setSource("geo");
        }

        setIsFallback(false);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        const message = controller.signal.aborted
          ? "Сервис погоды не ответил за 8 секунд. Попробуйте ещё раз."
          : err instanceof TypeError
            ? "Нет связи с сервисом погоды. Проверьте интернет."
            : err instanceof Error
              ? err.message
              : String(err);
        fail(message);
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
  }, [attempt, isSettingsLoading, manualCity]);

  return { weather, isLoading, isFallback, source, error, refetch };
}
