"use client";

import { itemColors, type ColorSource } from "@/features/items/itemColors";
import { cn } from "@/lib/utils";

export interface ColorDotsProps {
  /** Вещь или другой источник цветов (`{ colors, color? }`). */
  item: ColorSource;
  /** 12px по умолчанию, 10px — в тесных карточках-миниатюрах. */
  size?: "sm" | "md";
  className?: string;
}

/**
 * До трёх цветных кружков вещи — как в палитре образа, но про одну вещь.
 * Подписи цветов всегда есть рядом в тексте, поэтому кружки декоративные.
 */
export function ColorDots({ item, size = "md", className }: ColorDotsProps) {
  const colors = itemColors(item);
  return (
    <span
      className={cn("inline-flex items-center gap-1 align-middle", className)}
      aria-hidden="true"
    >
      {colors.map((color) => (
        <span
          key={color.family}
          className={cn(
            "rounded-full border border-border shadow-sm",
            size === "sm" ? "size-2.5" : "size-3",
          )}
          style={{ backgroundColor: color.hex }}
        />
      ))}
    </span>
  );
}