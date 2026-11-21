import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "border border-[#6a4e16] bg-gradient-to-b from-[#f3dd9a] to-[#c4963a] text-[#2a1c0e] shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] hover:from-[#ffe7ad] hover:to-[#d4a64b]",
        destructive: "bg-[#9d2c2c] text-white hover:bg-[#b33b3b]",
        outline: "border-2 border-[#6b542c] bg-[#f4e6c4] text-[#2a1c0e] hover:bg-[#fff6df]",
        secondary: "border border-[#6b542c] bg-[#3a3124] text-[#f4e7c8] hover:bg-[#4a3d2c]",
        ghost: "text-[#f4e7c8] hover:bg-white/10",
        link: "text-[#e6c15a] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-4 py-2",
        sm: "h-9 px-3 text-xs",
        lg: "h-12 px-6",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
