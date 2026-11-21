"use client";

import { useEffect, useMemo, useState } from "react";
import { BingoTile } from "@/components/bingo-tile";
import { Lightbox, type LightboxImage } from "@/components/lightbox";
import { SiteFrame } from "@/components/site-frame";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatPlace, formatUtc, lineSummary, totalBreakdown } from "@/lib/format";
import type { PublicState, PublicTile } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PublicBoard({ initial }: { initial: PublicState }) {
  const [state, setState] = useState(initial);
  const [online, setOnline] = useState(true);
  const [teamId, setTeamId] = useState<string>("all");
  const [openTileId, setOpenTileId] = useState<string | null>(null);
  const [now, setNow] = useState(initial.serverTime);

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
      timer = window.setTimeout(tick, 3000);
    };
    timer = window.setTimeout(tick, 3000);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, []);

  const tiles = useMemo(() => [...state.tiles].sort((a, b) => a.position - b.position), [state.tiles]);
  const size = Math.max(1, Math.round(Math.sqrt(tiles.length)) || 5);
  const selected = teamId === "all" ? null : (state.leaderboard.find((row) => row.teamId === teamId) ?? null);
  const lineCells = new Set(selected?.linePositions ?? []);
  const openTile = tiles.find((tile) => tile.id === openTileId) ?? null;
  const teamsById = new Map(state.teams.map((team) => [team.id, team]));

  function marksFor(tile: PublicTile, onlyTeamId?: string) {
    return state.completions
      .filter((completion) => completion.tileId === tile.id && (!onlyTeamId || completion.teamId === onlyTeamId))
      .map((completion) => teamsById.get(completion.teamId))
      .filter((team): team is NonNullable<typeof team> => Boolean(team))
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((team) => ({ name: team.name, color: team.color }));
  }

  const feed = state.activity
    .filter((entry) => entry.action === "complete" || entry.action === "uncomplete")
    .slice(0, 12);

  return (
    <SiteFrame event={state.event} now={now} live online={online}>
      <p className="mb-3 text-sm text-[#e7d7b4]">
        Each coloured X is a team that has turned that tile in. Tap a square for the note and the screenshot.
      </p>
      <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Team filter">
        <button type="button" className="chip" aria-pressed={selected === null} onClick={() => setTeamId("all")}>
          All teams
        </button>
        {state.teams.map((team) => (
          <button
            key={team.id}
            type="button"
            className="chip"
            aria-pressed={selected?.teamId === team.id}
            onClick={() => setTeamId((current) => (current === team.id ? "all" : team.id))}
          >
            <span className="inline-block h-3 w-3 rounded-full" style={{ background: team.color }} aria-hidden="true" />
            {team.name}
          </button>
        ))}
      </div>

      <div className="grid w-full min-w-0 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="stone-frame order-2 min-w-0 p-1.5 sm:p-3 lg:order-1" aria-label="Bingo board">
          <div className="mb-2 flex flex-wrap items-end justify-between gap-2 px-1">
            <h2 className="font-display text-xl text-[#f3d78a]">The board</h2>
            <p className="text-xs text-[#e7d7b4]">
              <span className="text-[#8dcea4]">Easy 1-2</span>
              {" · "}
              <span className="text-[#f0c36a]">Medium 3-5</span>
              {" · "}
              <span className="text-[#f0a0a0]">Hard 8-10</span>
            </p>
          </div>
          {selected ? (
            <p className="mb-2 rounded-sm bg-black/25 px-2 py-2 text-sm text-[#f6e7c2]">
              {selected.name}: {selected.filled}/25 tiles. {totalBreakdown(selected)}
              {lineSummary(selected) ? `. Lines: ${lineSummary(selected)}.` : ". No finished line yet."}
            </p>
          ) : null}
          {tiles.length === 0 ? (
            <p className="parchment-panel p-4 text-sm">No tiles yet. An admin can add them.</p>
          ) : (
            <div
              className="grid w-full min-w-0 gap-1 sm:gap-1.5"
              style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
            >
              {tiles.map((tile) => {
                const allMarks = marksFor(tile);
                const filteredMarks = selected ? marksFor(tile, selected.teamId) : allMarks;
                const done = Boolean(selected && !tile.isFree && filteredMarks.length > 0);
                const dim = Boolean(selected && !tile.isFree && filteredMarks.length === 0);
                return (
                  <BingoTile
                    key={tile.id}
                    tile={tile}
                    marks={tile.isFree ? [] : filteredMarks}
                    bigMarkColor={done ? selected?.color : null}
                    dim={dim}
                    onLine={Boolean(selected && lineCells.has(tile.position))}
                    onClick={() => setOpenTileId(tile.id)}
                  />
                );
              })}
            </div>
          )}
        </section>

        <section className="order-1 w-full min-w-0 lg:order-2" aria-label="Leaderboard">
          <h2 className="font-display mb-2 text-xl text-[#f3d78a]">Standings</h2>
          {state.leaderboard.length === 0 ? (
            <p className="parchment-panel p-4 text-sm">No teams yet.</p>
          ) : (
            <div className="flex w-full min-w-0 gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
              {state.leaderboard.map((row) => (
                <button
                  key={row.teamId}
                  type="button"
                  className={cn("score-card", row.place === 1 && "is-leader", selected?.teamId === row.teamId && "is-selected")}
                  onClick={() => setTeamId((current) => (current === row.teamId ? "all" : row.teamId))}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-display text-lg leading-tight">
                      <span className="mr-2 text-sm text-[#7a5a30]">{formatPlace(row.place)}</span>
                      <span style={{ color: row.color }}>{row.name}</span>
                    </p>
                    <p className="font-display text-2xl leading-none">{row.total}</p>
                  </div>
                  <p className="mt-1 text-xs text-[#5c4630]">{totalBreakdown(row)}</p>
                  <p className="text-xs text-[#5c4630]">
                    {row.filled}/25 tiles
                    {lineSummary(row) ? ` · ${lineSummary(row)}` : ""}
                  </p>
                  <p className="mt-1 truncate text-xs text-[#6d5638]">{row.members.join(", ") || "No members listed"}</p>
                </button>
              ))}
            </div>
          )}
          <p className="mt-2 text-xs text-[#d9c7a1]">
            +{state.event.bonuses.row} each finished row, column, or diagonal. +{state.event.bonuses.blackout} for a
            blackout. Tap a team to see only their Xs.
          </p>
        </section>
      </div>

      <section className="parchment-panel mt-4 p-4" aria-live="polite">
        <h2 className="font-display text-xl text-[#3a250f]">Recent completions</h2>
        {feed.length === 0 ? (
          <p className="mt-2 text-sm text-[#5c4630]">No tiles have been turned in yet. Marks show up here as soon as an admin logs them.</p>
        ) : (
          <ol className="mt-2">
            {feed.map((entry) => {
              const note =
                entry.action === "complete"
                  ? state.completions.find(
                      (completion) => completion.tileId === entry.tileId && completion.teamId === entry.teamId,
                    )?.note
                  : "";
              return (
                <li
                  key={entry.id}
                  className={cn("border-b border-[#c9b48a] py-3 last:border-b-0", entry.action === "uncomplete" && "opacity-70")}
                >
                  <p className="font-semibold">{entry.message}</p>
                  <p className="text-xs text-[#6d5638]">
                    {entry.actor} · {formatUtc(entry.createdAt)}
                  </p>
                  {note ? <p className="mt-1 text-sm text-[#4a3824]">{note}</p> : null}
                  {entry.tileId ? (
                    <button
                      type="button"
                      className="mt-1 text-sm font-bold text-[#6a3d12] underline"
                      onClick={() => setOpenTileId(entry.tileId)}
                    >
                      View tile
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <footer className="mt-5 pb-6 text-center text-sm text-[#d9c7a1]">
        <p>
          +{state.event.bonuses.row} for each row, column, or diagonal · +{state.event.bonuses.blackout} for a blackout.
        </p>
        <p className="mt-1">Everyone watching this page sees the same board.</p>
      </footer>

      <Dialog open={Boolean(openTile)} onOpenChange={(open) => !open && setOpenTileId(null)}>
        <DialogContent>
          {openTile ? <TileDetail state={state} tile={openTile} /> : null}
        </DialogContent>
      </Dialog>
    </SiteFrame>
  );
}

function TileDetail({ state, tile }: { state: PublicState; tile: PublicTile }) {
  const [lightbox, setLightbox] = useState<{ images: LightboxImage[]; index: number } | null>(null);
  const teamsById = new Map(state.teams.map((team) => [team.id, team]));
  const hits = state.completions
    .filter((completion) => completion.tileId === tile.id)
    .map((completion) => ({ completion, team: teamsById.get(completion.teamId) }))
    .filter((hit): hit is { completion: (typeof state.completions)[number]; team: NonNullable<ReturnType<typeof teamsById.get>> } =>
      Boolean(hit.team),
    )
    .sort((a, b) => a.team.sortOrder - b.team.sortOrder);
  const openTeams = state.teams.filter((team) => !hits.some((hit) => hit.team.id === team.id));

  return (
    <>
      <DialogHeader>
        <div className="mb-1 flex flex-wrap gap-1">
          <Badge>{tile.category}</Badge>
          <Badge>{tile.difficulty}</Badge>
          <Badge>{tile.isFree ? "0 pts" : `${tile.points} pts`}</Badge>
        </div>
        <DialogTitle>
          <span className="mr-2" aria-hidden="true">
            {tile.icon.startsWith("http") ? "▣" : tile.icon}
          </span>
          {tile.name}
        </DialogTitle>
        <DialogDescription>{tile.description}</DialogDescription>
      </DialogHeader>
      <div className="mt-4 space-y-3">
        {tile.isFree ? (
          <p className="text-sm font-semibold">Filled for every team. It scores nothing and still completes the centre of every line.</p>
        ) : null}
        {hits.length === 0 && !tile.isFree ? (
          <p className="text-sm">No team has turned this in yet.</p>
        ) : null}
        {hits.map(({ completion, team }) => (
          <article key={completion.id} className="rounded-sm border border-[#c9b48a] bg-[#fff8e8] p-3">
            <p className="font-bold" style={{ color: team.color }}>
              <span className="font-display mr-1">X</span>
              {team.name}
            </p>
            <p className="text-xs text-[#6d5638]">
              {completion.actor} · {formatUtc(completion.completedAt)}
            </p>
            {completion.note ? <p className="mt-2 text-sm">{completion.note}</p> : null}
            {completion.images.length > 0 ? (
              <ul className="mt-2 grid grid-cols-3 gap-2">
                {completion.images.map((image, index) => (
                  <li key={image.id}>
                    <button
                      type="button"
                      className="block w-full"
                      onClick={() =>
                        setLightbox({
                          index,
                          images: completion.images.map((shot, shotIndex) => ({
                            src: shot.url,
                            alt: `${tile.name} screenshot ${shotIndex + 1} from ${team.name}`,
                            caption: `${team.name} · ${tile.name}`,
                          })),
                        })
                      }
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image.url}
                        alt=""
                        className="aspect-square w-full rounded-sm border border-[#6b542c] object-cover"
                      />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-[#6b5436]">No screenshot uploaded yet.</p>
            )}
          </article>
        ))}
        {openTeams.length > 0 && !tile.isFree ? (
          <p className="text-sm text-[#5c4630]">Still open for {openTeams.map((team) => team.name).join(", ")}.</p>
        ) : null}
      </div>
      {lightbox ? (
        <Lightbox
          images={lightbox.images}
          index={lightbox.index}
          onIndex={(index) => setLightbox({ ...lightbox, index })}
          onClose={() => setLightbox(null)}
        />
      ) : null}
    </>
  );
}
