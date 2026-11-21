"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { eventPhase, formatRemaining, formatUtc } from "@/lib/format";
import type { PublicEvent } from "@/lib/types";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Board" },
  { href: "/rules", label: "Rules" },
  { href: "/admin", label: "Admin" },
];

export function SiteFrame({
  event,
  now,
  live = false,
  online = true,
  children,
}: {
  event?: PublicEvent | null;
  now?: string;
  live?: boolean;
  online?: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const phase = event && now ? eventPhase(event.startAt, event.endAt, now) : null;

  return (
    <div className="mx-auto flex min-h-screen w-full min-w-0 max-w-6xl flex-col px-2 py-3 sm:px-5 sm:py-4">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-[#f4e6c4] focus:px-3 focus:py-2 focus:text-[#2a1c0e]"
      >
        Skip to content
      </a>
      <header className="stone-frame px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-display text-[0.68rem] tracking-[0.28em] text-[#e6c15a]">OLD SCHOOL BINGO</p>
            <h1 className="font-display text-3xl leading-none text-[#f6e7c2] sm:text-4xl">{event?.name ?? "OSRS Clan Bingo"}</h1>
            {event?.tagline ? <p className="mt-2 max-w-xl text-sm text-[#e7d7b4]">{event.tagline}</p> : null}
          </div>
          <nav className="flex flex-wrap gap-1" aria-label="Pages">
            {LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-11 items-center rounded-sm px-3 text-sm font-bold tracking-wide",
                    active ? "bg-[#e6c15a] text-[#2a1c0e]" : "text-[#f4e7c8] hover:bg-white/10",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
        {event && phase && now ? (
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-[#f4e7c8]">
            <span className={`status-pill status-${phase}`}>
              {phase === "live" ? "Live" : phase === "upcoming" ? "Not started" : "Ended"}
            </span>
            {phase === "live" ? <span>Ends in {formatRemaining(event.endAt, now)}</span> : null}
            {phase === "upcoming" ? <span>Starts in {formatRemaining(event.startAt, now)}</span> : null}
            {phase === "ended" ? <span>Closed {formatUtc(event.endAt)}</span> : null}
            <span className="text-[#e7d7b4]">
              {formatUtc(event.startAt)} to {formatUtc(event.endAt)}
            </span>
            {event.chatPassword ? (
              <span className="chat-word">
                Chat word <strong>{event.chatPassword}</strong>
              </span>
            ) : null}
            {live ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-[#d9c7a1]">
                {online ? <span className="live-dot" aria-hidden="true" /> : null}
                {online ? "Live board" : "Reconnecting"}
              </span>
            ) : null}
          </div>
        ) : null}
      </header>
      <main id="content" className="mt-4 flex-1">
        {children}
      </main>
    </div>
  );
}
