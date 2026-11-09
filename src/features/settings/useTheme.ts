"use client";

import * as React from "react";

import { useSettings, type ThemeMode } from "@/features/settings/useSettings";

const DARK_QUERY = "(prefers-color-scheme: dark)";

function applyTheme(theme: ThemeMode): void {
  const prefersDark =
    typeof window !== "undefined" && window.matchMedia(DARK_QUERY).matches;
  const isDark = theme === "dark" || (theme === "system" && prefersDark);
  const root = document.documentElement;

  root.classList.toggle("dark", isDark);
  root.style.colorScheme = isDark ? "dark" : "light";
}

/**
 * Тема применяется на <html>: класс `dark` переключает палитру из index.css,
 * а «системная» следит за настройкой ОС, пока вкладка открыта.
 */
export function useTheme(): void {
  const { theme, isLoading } = useSettings();
  const effective: ThemeMode = isLoading ? "system" : theme;

  React.useEffect(() => {
    applyTheme(effective);
    if (effective !== "system") return;

    const media = window.matchMedia(DARK_QUERY);
    const onChange = () => applyTheme("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [effective]);
}
