"use client";

import { Button } from "@/components/ui/button";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="grid min-h-screen place-items-center p-6">
      <div className="parchment-panel max-w-md p-6 text-center">
        <h1 className="font-display text-2xl text-[#3a250f]">The board could not be opened</h1>
        <p className="mt-2 text-sm text-[#5c4630]">Something went wrong reading the event. Try again in a moment.</p>
        <Button className="mt-4" type="button" onClick={() => reset()}>
          Try again
        </Button>
      </div>
    </div>
  );
}
