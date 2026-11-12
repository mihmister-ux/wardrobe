"use client";

import { Heart, ImagePlus, Shirt, type LucideIcon } from "lucide-react";

/** Один экран-слайд онбординга / раздел инструкции. */
export interface GuideSection {
  icon: LucideIcon;
  title: string;
  text: string;
}

/**
 * Три шага, общие для онбординга и экрана «Инструкция».
 * Текст один и тот же, чтобы пользователь видел знакомую картину.
 */
export const GUIDE_SECTIONS: readonly GuideSection[] = [
  {
    icon: Shirt,
    title: "Добро пожаловать в Wardrobe",
    text: "Умный гардероб, который собирает образы под погоду.",
  },
  {
    icon: ImagePlus,
    title: "Добавьте вещи",
    text: "Загрузите фото вещей — по одной или папкой. Укажите категорию, сезон и цвет.",
  },
  {
    icon: Heart,
    title: "Соберите образ",
    text: "Выберите город и ситуацию (Дом / Работа / Прогулка) — приложение подберёт образ. Сохраняйте и носите.",
  },
];