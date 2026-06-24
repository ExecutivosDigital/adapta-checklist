"use client";

import * as SwitchPrimitive from "@radix-ui/react-switch";
import * as React from "react";

import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const switchVariants = cva(
  "peer inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      color: {
        // MUDANÇA: Usando 'bg-zinc-300' para o desligado (mais escuro e visível)
        // e 'bg-primary' para o ligado.
        default:
          "data-[state=checked]:bg-primary data-[state=unchecked]:bg-zinc-300",
        secondary:
          "data-[state=checked]:bg-secondary data-[state=unchecked]:bg-zinc-300",
        destructive:
          "data-[state=checked]:bg-destructive data-[state=unchecked]:bg-zinc-300",
        success:
          "data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-zinc-300",
      },
      size: {
        sm: "h-5 w-9",
        md: "h-6 w-11",
        lg: "h-7 w-14",
      },
    },
    defaultVariants: {
      color: "default",
      size: "md",
    },
  },
);

const switchThumbVariants = cva(
  "pointer-events-none block rounded-full bg-surface shadow-lg ring-0 transition-transform",
  {
    variants: {
      size: {
        // Ajustei levemente a translação para o bolinha não "escapar"
        sm: "h-4 w-4 data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0",
        md: "h-5 w-5 data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0",
        lg: "h-6 w-6 data-[state=checked]:translate-x-7 data-[state=unchecked]:translate-x-0",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);

export type SwitchProps = React.ComponentPropsWithoutRef<
  typeof SwitchPrimitive.Root
> &
  VariantProps<typeof switchVariants>;

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  SwitchProps
>(({ className, color, size, ...props }, ref) => (
  <SwitchPrimitive.Root
    className={cn(switchVariants({ color, size }), className)}
    {...props}
    ref={ref}
  >
    <SwitchPrimitive.Thumb className={cn(switchThumbVariants({ size }))} />
  </SwitchPrimitive.Root>
));
Switch.displayName = SwitchPrimitive.Root.displayName;

export { Switch };
