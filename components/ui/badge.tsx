import * as React from "react";
import { cn } from "@/lib/utils";

function Badge({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm border border-[#6b542c] bg-[#2a1c0e] px-1.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-[#f3d78a]",
        className,
      )}
      {...props}
    />
  );
}

export { Badge };
