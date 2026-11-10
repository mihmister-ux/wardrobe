import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "secondary";
  size?: "default" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        // «Пружина» при нажатии: transform с перерегулирующим cubic-bezier,
        // цвета переключаются тем же таймингом. Минимум 44px под палец.
        "inline-flex select-none touch-manipulation items-center justify-center rounded-md text-sm font-medium transition-[transform,color,background-color,border-color,box-shadow,opacity] duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
        variant === "default" && "bg-primary text-primary-foreground hover:bg-primary/90",
        variant === "outline" && "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        variant === "secondary" && "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        size === "default" && "h-11 px-4 py-2",
        size === "icon" && "h-11 w-11",
        className
      )}
      {...props}
    />
  )
);
Button.displayName = "Button";
