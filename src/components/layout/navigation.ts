"use client";

import * as React from "react";
import { Home, LayoutGrid, Shirt, User } from "lucide-react";
import { useLocation } from "react-router-dom";

export type DockTabId = "home" | "wardrobe" | "looks" | "profile";

export interface DockTab {
  id: DockTabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Куда ведёт вкладка. */
  path: string;
}

export const DOCK_TABS: readonly DockTab[] = [
  { id: "home", label: "Главная", icon: Home, path: "/" },
  { id: "wardrobe", label: "Гардероб", icon: Shirt, path: "/wardrobe" },
  { id: "looks", label: "Образы", icon: LayoutGrid, path: "/outfits" },
  { id: "profile", label: "Профиль", icon: User, path: "/profile" },
];

/** Самый длинный путь из тех, что подходят под текущий URL. */
export function matchTab(pathname: string, tabs: readonly DockTab[]): DockTabId | null {
  let best: DockTab | undefined;

  for (const tab of tabs) {
    const matches =
      tab.path === "/"
        ? pathname === "/"
        : pathname === tab.path || pathname.startsWith(`${tab.path}/`);

    if (matches && (!best || tab.path.length > best.path.length)) best = tab;
  }

  return best?.id ?? null;
}

/** Активная вкладка. Одна логика и для дока, и для боковой панели. */
export function useActiveTab(tabs: readonly DockTab[] = DOCK_TABS): DockTabId | null {
  const { pathname } = useLocation();
  return React.useMemo(() => matchTab(pathname, tabs), [pathname, tabs]);
}
