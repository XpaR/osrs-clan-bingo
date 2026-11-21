import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-11 w-full rounded-sm border-2 border-[#6b542c] bg-[#fbf3df] px-3 py-2 text-sm text-[#2a1c0e] outline-none placeholder:text-[#8a7352] focus-visible:ring-2 focus-visible:ring-[#c4963a] disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
