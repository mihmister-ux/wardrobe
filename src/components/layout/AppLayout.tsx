"use client";

import { Outlet } from "react-router-dom";

import { BottomDock, DockSpacer } from "@/components/layout/BottomDock";

/**
 * Общий каркас всех экранов: фон, центрирующая колонка, отступ под док и сам
 * док. Страницы отдают только содержимое, поэтому навигация не дублируется.
 */
export default function AppLayout() {
  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto w-full max-w-md px-4 pt-5">
        <Outlet />
        <DockSpacer />
      </div>

      <BottomDock />
    </div>
  );
}
