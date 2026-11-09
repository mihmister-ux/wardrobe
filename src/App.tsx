"use client";

import { useState } from "react";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";

import AppLayout from "./components/layout/AppLayout";
import AddItemSheet from "./features/items/AddItemSheet";
import HomePage from "./features/home/HomePage";
import OutfitsPage from "./features/outfits/OutfitsPage";
import ProfilePage from "./features/profile/ProfilePage";
import WardrobePage from "./features/wardrobe/WardrobePage";

export default function App() {
  const [isAddItemOpen, setAddItemOpen] = useState(false);
  const openAddItem = () => setAddItemOpen(true);

  return (
    <HashRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage onAddItem={openAddItem} />} />
          <Route path="/wardrobe" element={<WardrobePage onAddItem={openAddItem} />} />
          <Route path="/outfits" element={<OutfitsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>

      <AddItemSheet open={isAddItemOpen} onOpenChange={setAddItemOpen} />
    </HashRouter>
  );
}
