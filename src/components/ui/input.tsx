import * as React from "react";

import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, value, error, ...props }, ref) => {
    const isFilled = value !== undefined && value !== null && value !== "";

    return (
      <input
        type={type}
        {...(value !== undefined ? { value } : {})}
        className={cn(
          // Bordas mais arredondadas com rounded-2xl
          // Borda mais suave com border-zinc-200
          // Estado de erro (border-red-500) para campos obrigatórios não validados
          "bg-surface text-text placeholder:text-text-subtle flex h-10 w-full rounded-2xl border border-border px-3 py-2 transition duration-200 file:border-0 file:bg-transparent file:font-medium focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
          // Indicador de preenchido
          isFilled && !error && "bg-primary/20 border-primary",
          // Estado de erro para campos obrigatórios não validados
          error && "border-red-500",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
