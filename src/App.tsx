"use client";

import { lazy, useState } from "react";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";

import AppLayout from "./components/layout/AppLayout";
import AddItemSheet from "./features/items/AddItemSheet";
import HomePage from "./features/home/HomePage";
import OnboardingDialog from "./features/onboarding/OnboardingDialog";
import { useTheme } from "./features/settings/useTheme";

/**
 * Главная остаётся в стартовом чанке — на неё приходят первой. Остальные
 * страницы грузим по требованию: гардероб тянет карточки и фото, профиль —
 * бэкап, и всё это не нужно для первого экрана на медленной сети.
 */
const WardrobePage = lazy(() => import("./features/wardrobe/WardrobePage"));
const OutfitsPage = lazy(() => import("./features/outfits/OutfitsPage"));
const ProfilePage = lazy(() => import("./features/profile/ProfilePage"));

export default function App() {
  const [isAddItemOpen, setAddItemOpen] = useState(false);
  const openAddItem = () => setAddItemOpen(true);

  // Светлая / тёмная / системная — применяется один раз на всё приложение.
  useTheme();

  return (
    <HashRouter>
      <Routes>
        <Route element={<AppLayout onAddItem={openAddItem} />}>
          <Route path="/" element={<HomePage onAddItem={openAddItem} />} />
          <Route path="/wardrobe" element={<WardrobePage onAddItem={openAddItem} />} />
          <Route path="/outfits" element={<OutfitsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>

      <AddItemSheet open={isAddItemOpen} onOpenChange={setAddItemOpen} />

      {/* Первый запуск: три слайда поверх приложения, пока нет флага. */}
      <OnboardingDialog />
    </HashRouter>
  );
}
