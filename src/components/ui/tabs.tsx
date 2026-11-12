import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Лёгкие табы без Radix: список кнопок + панель активного значения.
 * Активный таб — тёмный (--primary), неактивный — прозрачный с рамкой,
 * как на главной в переключателе «Куда собираемся».
 */

interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabs(): TabsContextValue {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error("Tabs subcomponents must be used within <Tabs>");
  return ctx;
}

export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  onValueChange: (value: string) => void;
}

export function Tabs({ value, onValueChange, className, ...props }: TabsProps) {
  const context = React.useMemo(
    () => ({ value, onValueChange }),
    [value, onValueChange],
  );
  return (
    <TabsContext.Provider value={context}>
      <div className={cn("flex flex-col", className)} {...props} />
    </TabsContext.Provider>
  );
}

export function TabsList({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex h-11 items-center gap-1 rounded-full border border-border bg-card p-1",
        className,
      )}
      {...props}
    />
  );
}

export interface TabsTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

export function TabsTrigger({
  value,
  className,
  children,
  ...props
}: TabsTriggerProps) {
  const { value: active, onValueChange } = useTabs();
  const isActive = value === active;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      aria-controls={`tabpanel-${value}`}
      onClick={() => onValueChange(value)}
      className={cn(
        "inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3 text-sm font-medium transition-[transform,background-color,color,border-color] duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isActive
          ? "bg-primary text-primary-foreground shadow-sm"
          : "border border-border bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

export function TabsContent({ value, className, ...props }: TabsContentProps) {
  const { value: active } = useTabs();
  if (value !== active) return null;
  return (
    <div
      role="tabpanel"
      id={`tabpanel-${value}`}
      aria-labelledby={`tab-${value}`}
      className={cn("mt-4", className)}
      {...props}
    />
  );
}
