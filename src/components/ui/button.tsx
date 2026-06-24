import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import React from "react";

// Adicionei "outline" nas variantes
type ButtonVariant =
  | "primary"
  | "secondary"
  | "danger"
  | "ghost"
  | "link"
  | "outline";

// Adicionei "icon" nos tamanhos
type ButtonSize = "sm" | "md" | "lg" | "icon";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
}

const baseStyles =
  "inline-flex items-center justify-center rounded-lg font-semibold transition-all duration-300 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2";

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-primary hover:bg-primary-dark text-white shadow-md hover:shadow-lg border border-transparent",
  secondary:
    "bg-surface hover:bg-surface-muted text-text border border-border shadow-sm dark:hover:bg-surface-elevated",
  danger: "bg-red-600 hover:bg-red-700 text-white shadow-md",
  ghost:
    "bg-transparent hover:bg-surface-muted text-text-muted shadow-none dark:hover:bg-surface-elevated",
  link: "bg-transparent text-primary hover:underline shadow-none p-0 h-auto",
  // Nova variante outline (borda cinza, fundo transparente)
  outline:
    "border border-border bg-background hover:bg-surface-muted text-text-muted dark:hover:bg-surface-elevated",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-6 text-base",
  // Novo tamanho "icon" (quadrado para botões que só têm ícone)
  icon: "h-10 w-10 p-2 flex items-center justify-center",
};

// Mapeamento para o tamanho do ícone de loading baseado no tamanho do botão
const loaderSizeMap: Record<ButtonSize, string> = {
  sm: "h-3 w-3",
  md: "h-4 w-4",
  lg: "h-5 w-5",
  icon: "h-4 w-4",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          className,
        )}
        disabled={props.disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <Loader2 className={cn("mr-2 animate-spin", loaderSizeMap[size])} />
        )}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
export default Button;
