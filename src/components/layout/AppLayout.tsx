"use client";

import { Suspense } from "react";
import { Outlet } from "react-router-dom";

import { BottomDock, DockSpacer } from "@/components/layout/BottomDock";
import { SideNav } from "@/components/layout/SideNav";
import { PageSkeleton } from "@/components/ui/page-skeleton";

export interface AppLayoutProps {
  /** Открывает форму добавления вещи (кнопка в доке и в боковой панели). */
  onAddItem?: () => void;
}

/**
 * Общий каркас: на телефоне — колонка и нижний док, на ПК — боковая панель
 * и широкий контент. Страницы отдают только содержимое.
 */
export default function AppLayout({ onAddItem }: AppLayoutProps) {
  return (
    <div className="min-h-dvh">
      <SideNav onAddItem={onAddItem} />

      <div className="md:pl-60">
        <div className="mx-auto w-full max-w-md px-4 pt-5 md:max-w-5xl md:px-8 md:pt-8">
          {/* Отложенные страницы ждут свой чанк здесь: док и шапка остаются. */}
          <Suspense fallback={<PageSkeleton />}>
            <Outlet />
          </Suspense>
          <DockSpacer />
        </div>
      </div>

      <BottomDock onAddItem={onAddItem} />
    </div>
  );
}
