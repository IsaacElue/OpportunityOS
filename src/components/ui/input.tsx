import { forwardRef, type InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn("flex h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3.5 text-sm text-ink outline-none placeholder:text-muted/70 transition focus:border-brand/70 focus:ring-2 focus:ring-brand/15 disabled:cursor-not-allowed disabled:opacity-50", className)}
    {...props}
  />
));
Input.displayName = "Input";

export { Input };
