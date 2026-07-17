import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/80 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-brand text-brand-ink shadow-[0_12px_32px_rgb(168_255_204/15%)] hover:-translate-y-0.5 hover:bg-[#c2ffda]",
        secondary: "border border-white/10 bg-white/[0.06] text-ink hover:border-white/20 hover:bg-white/[0.1]",
        ghost: "text-muted hover:bg-white/[0.06] hover:text-ink",
        danger: "bg-red-400 text-red-950 hover:bg-red-300"
      },
      size: {
        sm: "h-9 px-3.5",
        md: "h-11 px-4.5",
        lg: "h-12 px-5 text-base"
      }
    },
    defaultVariants: { variant: "primary", size: "md" }
  }
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, ...props }, ref) => (
  <button className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />
));
Button.displayName = "Button";

export { Button, buttonVariants };
