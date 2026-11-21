"use client";

import { useEffect, useMemo, useState } from "react";
import { Lightbox, type LightboxImage } from "@/components/lightbox";
import { SiteFrame } from "@/components/site-frame";
import { formatUtc } from "@/lib/format";
import type { PublicState } from "@/lib/types";

export function ProofGallery({ initial }: { initial: PublicState }) {
  const [state, setState] = useState(initial);
  const [now, setNow] = useState(initial.serverTime);
  const [online, setOnline] = useState(true);
  const [teamId, setTeamId] = useState("all");
  const [tileId, setTileId] = useState("all");
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    let timer = 0;
    let stopped = false;
    const tick = async () => {
      if (stopped) return;
      if (document.visibilityState === "visible") {
        try {
          const response = await fetch("/api/state", { cache: "no-store" });
          if (!response.ok) throw new Error("offline");
          const next = (await response.json()) as PublicState;
          if (!stopped) {
            setState(next);
            setNow(next.serverTime);
            setOnline(true);
          }
        } catch {
          if (!stopped) setOnline(false);
        }
      }
      timer = window.setTimeout(tick, 4000);
    };
    timer = window.setTimeout(tick, 4000);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, []);

  const cards = useMemo(() => {
    const teams = new Map(state.teams.map((team) => [team.id, team]));
    const tiles = new Map(state.tiles.map((tile) => [tile.id, tile]));
    return state.completions
      .flatMap((completion) =>
        completion.images.map((image) => ({
          image,
          completion,
          team: teams.get(completion.teamId),
          tile: tiles.get(completion.tileId),
        })),
      )
      .filter((card) => card.team && card.tile)
      .filter((card) => teamId === "all" || card.completion.teamId === teamId)
      .filter((card) => tileId === "all" || card.completion.tileId === tileId)
      .sort((a, b) => (a.completion.completedAt < b.completion.completedAt ? 1 : -1));
  }, [state, teamId, tileId]);

  const slides: LightboxImage[] = cards.map((card) => ({
    src: card.image.url,
    alt: `${card.tile?.name ?? "Tile"} proof from ${card.team?.name ?? "a team"}`,
    caption: `${card.team?.name ?? ""} · ${card.tile?.name ?? ""} · ${formatUtc(card.completion.completedAt)}`,
  }));

  return (
    <SiteFrame event={state.event} now={now} live online={online}>
      <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Team filter">
        <button type="button" className="chip" aria-pressed={teamId === "all"} onClick={() => setTeamId("all")}>
          All teams
        </button>
        {state.teams.map((team) => (
          <button
            key={team.id}
            type="button"
            className="chip"
            aria-pressed={teamId === team.id}
            onClick={() => setTeamId((current) => (current === team.id ? "all" : team.id))}
          >
            <span className="inline-block h-3 w-3 rounded-full" style={{ background: team.color }} aria-hidden="true" />
            {team.name}
          </button>
        ))}
      </div>
      <label className="mb-4 flex flex-col gap-1 text-sm text-[#f6e7c2] sm:flex-row sm:items-center">
        <span className="font-bold">Tile</span>
        <select className="select-osrs sm:max-w-xs" value={tileId} onChange={(event) => setTileId(event.target.value)}>
          <option value="all">All tiles</option>
          {[...state.tiles]
            .sort((a, b) => a.position - b.position)
            .map((tile) => (
              <option key={tile.id} value={tile.id}>
                {tile.name}
              </option>
            ))}
        </select>
      </label>
      {cards.length === 0 ? (
        <p className="parchment-panel p-4 text-sm">No screenshots match this filter yet. Uploads from the admin panel show up here.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {cards.map((card, index) => (
            <li key={card.image.id}>
              <article className="overflow-hidden rounded-sm border-2 bg-[#f6e7c4] text-[#2a1c0e]" style={{ borderColor: card.team?.color }}>
                <button type="button" className="block w-full" onClick={() => setOpen(index)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={card.image.url} alt="" className="aspect-square w-full object-cover" />
                </button>
                <div className="space-y-1 p-2">
                  <p className="text-sm font-bold" style={{ color: card.team?.color }}>
                    {card.team?.name}
                  </p>
                  <p className="text-sm font-semibold leading-tight">{card.tile?.name}</p>
                  {card.completion.note ? <p className="line-clamp-3 text-xs text-[#5c4630]">{card.completion.note}</p> : null}
                  <p className="text-[0.7rem] text-[#6d5638]">
                    {card.completion.actor} · {formatUtc(card.completion.completedAt)}
                  </p>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
      {open !== null ? <Lightbox images={slides} index={open} onIndex={setOpen} onClose={() => setOpen(null)} /> : null}
    </SiteFrame>
  );
}
