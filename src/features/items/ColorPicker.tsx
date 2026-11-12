"use client";

import { COLORS } from "@/db/seed/references";
import type { ColorFamily } from "@/db/types";
import { resolveColor } from "@/features/items/itemColors";
import { cn } from "@/lib/utils";

export interface ColorPickerProps {
  /** Подпись над полем: «Основной цвет», «Дополнительный цвет». */
  label: string;
  value: ColorFamily | null;
  onChange: (next: ColorFamily | null) => void;
  /** Разрешить пустой вариант — для дополнительного цвета. */
  allowEmpty?: boolean;
  emptyLabel?: string;
  /** Подпись пустого варианта, когда цвет ещё не выбран (обязательное поле). */
  placeholder?: string;
  /** Семейства, которые выбрать нельзя (основной цвет — как дополнительный). */
  exclude?: readonly ColorFamily[];
  disabled?: boolean;
  id?: string;
}

/**
 * Один селект цвета: кружок текущего оттенка слева и выпадающий список.
 * Дополнительный цвет получает `allowEmpty`, поэтому его можно оставить пустым,
 * а `exclude` убирает из списка основной цвет — совпадение невозможно.
 */
export function ColorPicker({
  label,
  value,
  onChange,
  allowEmpty = false,
  emptyLabel = "Нет",
  placeholder = "Выберите",
  exclude = [],
  disabled = false,
  id,
}: ColorPickerProps) {
  const selected = value ? resolveColor(value) : null;
  const options = COLORS.filter((color) => !exclude.includes(color.family));
  // Пустой вариант нужен и тогда, когда обязательный цвет ещё не выбран:
  // иначе браузер показывает первый цвет списка как выбранный.
  const needsEmptyOption = allowEmpty || value === null;

  return (
    <label htmlFor={id} className="block space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="flex items-center gap-2 rounded-xl border border-border bg-transparent px-2 transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
        <span
          className={cn(
            "size-3.5 shrink-0 rounded-full border border-border",
            !value && "border-dashed",
          )}
          style={selected ? { backgroundColor: selected.hex } : undefined}
          aria-hidden="true"
        />
        <select
          id={id}
          value={value ?? ""}
          disabled={disabled}
          onChange={(event) => {
            const next = event.target.value;
            onChange(next ? (next as ColorFamily) : null);
          }}
          className="h-10 min-w-0 flex-1 appearance-none bg-transparent px-1 text-sm font-medium outline-none disabled:cursor-not-allowed"
        >
          {needsEmptyOption ? (
            <option value="" disabled={!allowEmpty}>
              {allowEmpty ? emptyLabel : placeholder}
            </option>
          ) : null}
          {options.map((color) => (
            <option key={color.family} value={color.family}>
              {color.label}
            </option>
          ))}
        </select>
      </span>
    </label>
  );
}