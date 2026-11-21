"use client";

import { useEffect, useRef, useState, type Dispatch, type FormEvent, type PointerEvent, type SetStateAction } from "react";
import { BingoTile } from "@/components/bingo-tile";
import { ProofUploader } from "@/components/proof-uploader";
import { SiteFrame } from "@/components/site-frame";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cellLabel, formatUtc, inkFor, toDatetimeLocal } from "@/lib/format";
import type { PublicState, PublicTile } from "@/lib/types";

type Send = (url: string, method: string, body?: unknown, success?: string) => Promise<PublicState | null>;

interface TeamDraft {
  name: string;
  color: string;
  members: string;
}

interface TileDraft {
  name: string;
  description: string;
  points: string;
  icon: string;
  category: string;
  isFree: boolean;
}

interface EventDraft {
  name: string;
  tagline: string;
  startLocal: string;
  endLocal: string;
  chatPassword: string;
  row: string;
  column: string;
  diagonal: string;
  blackout: string;
}

function useSynced<T>(revision: number, value: T): [T, Dispatch<SetStateAction<T>>] {
  const [draft, setDraft] = useState(value);
  const [seen, setSeen] = useState(revision);
  if (seen !== revision) {
    setSeen(revision);
    setDraft(value);
  }
  return [draft, setDraft];
}

export function AdminApp() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [defaultPassword, setDefaultPassword] = useState(false);
  const [state, setState] = useState<PublicState | null>(null);
  const [now, setNow] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    async function load() {
      const response = await fetch("/api/admin/me", { cache: "no-store" });
      const data = (await response.json()) as { admin?: boolean; usingDefaultPassword?: boolean };
      if (ignore) return;
      setAuthed(Boolean(data.admin));
      setDefaultPassword(Boolean(data.usingDefaultPassword));
      if (data.admin) {
        const board = await fetch("/api/state", { cache: "no-store" });
        if (!board.ok || ignore) return;
        const next = (await board.json()) as PublicState;
        setState(next);
        setNow(next.serverTime);
      }
    }
    void load();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 2500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  async function login(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setLoginError(null);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: loginPassword }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setLoginError(data.error || "Login failed.");
        return;
      }
      setLoginPassword("");
      setAuthed(true);
      const me = await fetch("/api/admin/me", { cache: "no-store" });
      const session = (await me.json()) as { usingDefaultPassword?: boolean };
      setDefaultPassword(Boolean(session.usingDefaultPassword));
      const board = await fetch("/api/state", { cache: "no-store" });
      if (board.ok) {
        const next = (await board.json()) as PublicState;
        setState(next);
        setNow(next.serverTime);
      }
    } catch {
      setLoginError("The server could not be reached.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setAuthed(false);
    setState(null);
    setDefaultPassword(false);
  }

  async function send(url: string, method: string, body?: unknown, success = "Saved."): Promise<PublicState | null> {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(url, {
        method,
        headers: body === undefined ? undefined : { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const data = (await response.json().catch(() => ({}))) as PublicState & { error?: string };
      if (response.status === 401) {
        setAuthed(false);
        setState(null);
        setError("The admin session expired. Log in again.");
        return null;
      }
      if (!response.ok) {
        setError(data.error || "That did not save.");
        return null;
      }
      if (data.event && data.tiles) {
        setState(data);
        setNow(data.serverTime);
      }
      setNotice(success);
      return data;
    } catch {
      setError("The server could not be reached.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  if (authed === null) {
    return (
      <SiteFrame>
        <p className="text-[#f3d78a]">Checking the lock...</p>
      </SiteFrame>
    );
  }

  if (!authed) {
    return (
      <SiteFrame>
        <form onSubmit={login} className="parchment-panel mx-auto max-w-md p-5 sm:p-6">
          <h2 className="font-display text-3xl text-[#3a250f]">Admin</h2>
          <p className="mt-2 text-sm text-[#5c4630]">
            Hosts use this to mark tiles, edit teams, and correct mistakes. Players do not need a password to view the
            board.
          </p>
          <div className="mt-4 space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={loginPassword}
              onChange={(event) => setLoginPassword(event.target.value)}
              required
            />
          </div>
          {loginError ? <p className="mt-3 text-sm font-semibold text-[#9d2c2c]">{loginError}</p> : null}
          <Button className="mt-4 w-full" type="submit" disabled={busy}>
            {busy ? "Checking..." : "Unlock"}
          </Button>
        </form>
      </SiteFrame>
    );
  }

  if (!state) {
    return (
      <SiteFrame>
        <p className="text-[#f3d78a]">Loading the ledger...</p>
      </SiteFrame>
    );
  }

  return (
    <SiteFrame event={state.event} now={now}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-[#e7d7b4]">Revision {state.event.revision}. Changes hit the public board within a few seconds.</p>
        <Button type="button" variant="secondary" size="sm" onClick={() => void logout()}>
          Log out
        </Button>
      </div>
      {defaultPassword ? (
        <p className="mb-3 rounded-sm border border-[#e6c15a] bg-black/30 px-3 py-2 text-sm text-[#f6e7c2]">
          The admin password is still the development default. Set ADMIN_PASSWORD before anyone else can reach this
          server.
        </p>
      ) : null}
      {error ? <p className="mb-3 rounded-sm bg-[#9d2c2c] px-3 py-2 text-sm text-white">{error}</p> : null}
      {notice ? <p className="mb-3 text-sm font-bold text-[#b6f3c4]">{notice}</p> : null}
      <Tabs defaultValue="mark">
        <TabsList aria-label="Admin sections">
          <TabsTrigger value="mark">Mark tiles</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
          <TabsTrigger value="tiles">Tiles</TabsTrigger>
          <TabsTrigger value="event">Event</TabsTrigger>
          <TabsTrigger value="log">Log</TabsTrigger>
        </TabsList>
        <TabsContent value="mark">
          <MarkPanel
            state={state}
            send={send}
            busy={busy}
            error={error}
            replaceState={(next, message) => {
              setState(next);
              setNow(next.serverTime);
              setNotice(message);
              setError(null);
            }}
          />
        </TabsContent>
        <TabsContent value="teams">
          <TeamsPanel state={state} send={send} busy={busy} />
        </TabsContent>
        <TabsContent value="tiles">
          <TilesPanel state={state} send={send} busy={busy} />
        </TabsContent>
        <TabsContent value="event">
          <EventPanel state={state} send={send} busy={busy} />
        </TabsContent>
        <TabsContent value="log">
          <LogPanel state={state} />
        </TabsContent>
      </Tabs>
    </SiteFrame>
  );
}

function MarkPanel({
  state,
  send,
  busy,
  error,
  replaceState,
}: {
  state: PublicState;
  send: Send;
  busy: boolean;
  error: string | null;
  replaceState: (state: PublicState, message: string) => void;
}) {
  const [teamId, setTeamId] = useState(state.teams[0]?.id ?? "");
  const selected = state.teams.find((team) => team.id === teamId) ?? state.teams[0];
  const [openId, setOpenId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const tile = state.tiles.find((item) => item.id === openId) ?? null;
  const completion =
    selected && tile
      ? state.completions.find((item) => item.tileId === tile.id && item.teamId === selected.id)
      : undefined;
  const size = Math.max(1, Math.round(Math.sqrt(state.tiles.length)) || 5);
  const tiles = [...state.tiles].sort((a, b) => a.position - b.position);

  function openTile(next: PublicTile) {
    if (!selected) return;
    const existing = state.completions.find((item) => item.tileId === next.id && item.teamId === selected.id);
    setNote(existing?.note ?? "");
    setOpenId(next.id);
  }

  async function save(remove = false) {
    if (!selected || !tile) return;
    const saved = remove
      ? await send("/api/admin/completions", "DELETE", { teamId: selected.id, tileId: tile.id }, "Mark removed.")
      : await send(
          "/api/admin/completions",
          "POST",
          { teamId: selected.id, tileId: tile.id, note },
          completion ? "Note saved." : "Tile marked.",
        );
    if (saved && remove) setOpenId(null);
  }

  if (!selected) return <p className="parchment-panel p-4">Add a team before marking tiles.</p>;

  return (
    <div className="space-y-3">
      <p className="text-sm text-[#e7d7b4]">Pick a team, then a tile. Add a note and upload the screenshots.</p>
      <div className="flex flex-wrap gap-2">
        {state.teams.map((team) => {
          const active = team.id === selected.id;
          return (
            <button
              key={team.id}
              type="button"
              className="inline-flex min-h-11 items-center rounded-sm border-2 px-3 text-sm font-bold"
              style={{
                borderColor: team.color,
                background: active ? team.color : "#f4e6c4",
                color: active ? inkFor(team.color) : "#2a1c0e",
              }}
              onClick={() => setTeamId(team.id)}
            >
              {team.name}
            </button>
          );
        })}
      </div>
      <div className="stone-frame min-w-0 p-1.5 sm:p-3">
        <div className="grid w-full min-w-0 gap-1 sm:gap-1.5" style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}>
          {tiles.map((item) => {
            const marked = state.completions.some(
              (entry) => entry.tileId === item.id && entry.teamId === selected.id,
            );
            return (
              <BingoTile
                key={item.id}
                tile={item}
                marks={marked ? [{ name: selected.name, color: selected.color }] : []}
                bigMarkColor={marked && !item.isFree ? selected.color : null}
                onClick={() => openTile(item)}
              />
            );
          })}
        </div>
      </div>
      <Dialog open={Boolean(tile)} onOpenChange={(open) => !open && setOpenId(null)}>
        <DialogContent>
          {tile ? (
            <>
              <DialogHeader>
                <DialogTitle>{tile.name}</DialogTitle>
                <DialogDescription>
                  {cellLabel(tile.position, size)} · {selected.name}
                  {tile.isFree ? " · free for every team" : ` · ${tile.points} points`}
                </DialogDescription>
              </DialogHeader>
              {tile.isFree ? (
                <p className="mt-3 text-sm">This free space is already filled for every team and scores 0.</p>
              ) : (
                <form
                  className="mt-4 space-y-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void save(false);
                  }}
                >
                  <div className="space-y-1">
                    <Label htmlFor="note">Note</Label>
                    <Textarea
                      id="note"
                      value={note}
                      maxLength={280}
                      onChange={(event) => setNote(event.target.value)}
                      placeholder="Who got it, and what the screenshot shows."
                    />
                  </div>
                  <ProofUploader
                    teamId={selected.id}
                    tileId={tile.id}
                    tileName={tile.name}
                    note={note}
                    marked={Boolean(completion)}
                    images={completion?.images ?? []}
                    onBoard={replaceState}
                  />
                  {error ? <p className="text-sm font-semibold text-[#9d2c2c]">{error}</p> : null}
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button type="submit" disabled={busy}>
                      {completion ? "Save note" : "Mark complete"}
                    </Button>
                    {completion ? (
                      <Button type="button" variant="destructive" disabled={busy} onClick={() => void save(true)}>
                        Remove mark
                      </Button>
                    ) : null}
                  </div>
                </form>
              )}
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TeamsPanel({ state, send, busy }: { state: PublicState; send: Send; busy: boolean }) {
  const [drafts, setDrafts] = useSynced(
    state.event.revision,
    Object.fromEntries(
      state.teams.map((team) => [
        team.id,
        { name: team.name, color: team.color, members: team.members.join("\n") } satisfies TeamDraft,
      ]),
    ),
  );
  const [name, setName] = useState("");
  const [color, setColor] = useState("#1f9d55");
  const [members, setMembers] = useState("");
  const [removeId, setRemoveId] = useState<string | null>(null);
  const removing = state.teams.find((team) => team.id === removeId) ?? null;

  return (
    <div className="space-y-3">
      {state.teams.map((team) => {
        const draft = drafts[team.id] ?? { name: team.name, color: team.color, members: team.members.join("\n") };
        return (
          <form
            key={team.id}
            className="parchment-panel space-y-3 p-4"
            onSubmit={(event) => {
              event.preventDefault();
              void send(`/api/admin/teams/${team.id}`, "PUT", {
                name: draft.name,
                color: draft.color,
                members: draft.members,
              });
            }}
          >
            <div className="flex items-center gap-2">
              <span className="inline-block h-4 w-4 rounded-full" style={{ background: draft.color }} />
              <h3 className="font-display text-xl">{team.name}</h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_9rem]">
              <div className="space-y-1">
                <Label htmlFor={`name-${team.id}`}>Name</Label>
                <Input
                  id={`name-${team.id}`}
                  value={draft.name}
                  maxLength={32}
                  onChange={(event) =>
                    setDrafts((current) => ({ ...current, [team.id]: { ...draft, name: event.target.value } }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`color-${team.id}`}>Colour</Label>
                <Input
                  id={`color-${team.id}`}
                  type="color"
                  value={draft.color}
                  onChange={(event) =>
                    setDrafts((current) => ({ ...current, [team.id]: { ...draft, color: event.target.value } }))
                  }
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor={`members-${team.id}`}>Members, one name per line</Label>
              <Textarea
                id={`members-${team.id}`}
                value={draft.members}
                onChange={(event) =>
                  setDrafts((current) => ({ ...current, [team.id]: { ...draft, members: event.target.value } }))
                }
              />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="submit" disabled={busy}>
                Save team
              </Button>
              <Button type="button" variant="destructive" disabled={busy} onClick={() => setRemoveId(team.id)}>
                Remove team
              </Button>
            </div>
          </form>
        );
      })}
      <form
        className="parchment-panel space-y-3 p-4"
        onSubmit={async (event) => {
          event.preventDefault();
          const saved = await send("/api/admin/teams", "POST", { name, color, members }, "Team added.");
          if (saved) {
            setName("");
            setMembers("");
          }
        }}
      >
        <h3 className="font-display text-xl">Add a team</h3>
        <div className="grid gap-3 sm:grid-cols-[1fr_9rem]">
          <div className="space-y-1">
            <Label htmlFor="new-team">Name</Label>
            <Input id="new-team" value={name} maxLength={32} onChange={(event) => setName(event.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-color">Colour</Label>
            <Input id="new-color" type="color" value={color} onChange={(event) => setColor(event.target.value)} />
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="new-members">Members</Label>
          <Textarea id="new-members" value={members} onChange={(event) => setMembers(event.target.value)} />
        </div>
        <Button type="submit" disabled={busy || state.teams.length >= 8}>
          Add team
        </Button>
      </form>
      <Dialog open={Boolean(removing)} onOpenChange={(open) => !open && setRemoveId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove {removing?.name}?</DialogTitle>
            <DialogDescription>Their marks come off the board. The log keeps the history.</DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="destructive"
              disabled={busy || !removing}
              onClick={async () => {
                if (!removing) return;
                const saved = await send(`/api/admin/teams/${removing.id}`, "DELETE", undefined, "Team removed.");
                if (saved) setRemoveId(null);
              }}
            >
              Remove team
            </Button>
            <Button type="button" variant="outline" onClick={() => setRemoveId(null)}>
              Keep team
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TilesPanel({ state, send, busy }: { state: PublicState; send: Send; busy: boolean }) {
  const tiles = [...state.tiles].sort((a, b) => a.position - b.position);
  const size = Math.max(1, Math.round(Math.sqrt(tiles.length)) || 5);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<TileDraft | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const drag = useRef<{ id: string; x: number; y: number; moved: boolean; overId: string | null } | null>(null);
  const editing = tiles.find((tile) => tile.id === editingId) ?? null;

  function openEditor(tile: PublicTile) {
    setEditingId(tile.id);
    setDraft(tileDraft(tile));
  }

  function tileUnder(x: number, y: number, sourceId: string) {
    const stack = document.elementsFromPoint(x, y);
    for (const element of stack) {
      const id = element.closest("[data-tile-id]")?.getAttribute("data-tile-id");
      if (id && id !== sourceId) return id;
    }
    return null;
  }

  function onPointerDown(tileId: string, event: PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { id: tileId, x: event.clientX, y: event.clientY, moved: false, overId: null };
  }

  function onPointerMove(event: PointerEvent<HTMLButtonElement>) {
    const current = drag.current;
    if (!current) return;
    const distance = Math.hypot(event.clientX - current.x, event.clientY - current.y);
    if (!current.moved && distance > 8) {
      current.moved = true;
      setDragId(current.id);
    }
    if (!current.moved) return;
    const next = tileUnder(event.clientX, event.clientY, current.id);
    current.overId = next;
    setOverId(next);
  }

  function onPointerUp(event: PointerEvent<HTMLButtonElement>) {
    const current = drag.current;
    drag.current = null;
    setDragId(null);
    setOverId(null);
    if (!current) return;
    if (current.moved) {
      const target = current.overId ?? tileUnder(event.clientX, event.clientY, current.id);
      if (target) {
        void send("/api/admin/tiles/swap", "POST", { tileId: current.id, withTileId: target }, "Tiles swapped.");
      }
      return;
    }
    const tile = tiles.find((item) => item.id === current.id);
    if (tile) openEditor(tile);
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-[#e7d7b4]">Tap a square to edit it. Drag one square onto another to swap their places.</p>
      <div className="stone-frame min-w-0 p-1.5 sm:p-3">
        <div
          className="grid w-full min-w-0 touch-none gap-1 sm:gap-1.5"
          style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
        >
          {tiles.map((tile) => (
            <BingoTile
              key={tile.id}
              data-tile-id={tile.id}
              tile={tile}
              marks={[]}
              className={dragId === tile.id ? "opacity-50" : overId === tile.id ? "outline outline-2 outline-[#e6c15a]" : undefined}
              aria-label={`Edit ${tile.name}`}
              onPointerDown={(event) => onPointerDown(tile.id, event)}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={() => {
                drag.current = null;
                setDragId(null);
                setOverId(null);
              }}
            />
          ))}
        </div>
      </div>
      <Dialog
        open={Boolean(editing && draft)}
        onOpenChange={(open) => {
          if (!open) {
            setEditingId(null);
            setDraft(null);
          }
        }}
      >
        <DialogContent>
          {editing && draft ? (
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                void send(`/api/admin/tiles/${editing.id}`, "PUT", {
                  ...draft,
                  points: Number(draft.points),
                }).then((saved) => {
                  if (saved) {
                    setEditingId(null);
                    setDraft(null);
                  }
                });
              }}
            >
              <DialogHeader>
                <DialogTitle>{editing.name}</DialogTitle>
                <DialogDescription>{cellLabel(editing.position, size)}</DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="tile-name">Name</Label>
                  <Input
                    id="tile-name"
                    value={draft.name}
                    maxLength={40}
                    onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="tile-icon">Icon or image URL</Label>
                  <Input
                    id="tile-icon"
                    value={draft.icon}
                    onChange={(event) => setDraft({ ...draft, icon: event.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="tile-desc">Description</Label>
                <Textarea
                  id="tile-desc"
                  value={draft.description}
                  onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="tile-points">Points</Label>
                  <Input
                    id="tile-points"
                    inputMode="numeric"
                    value={draft.points}
                    disabled={draft.isFree}
                    onChange={(event) => setDraft({ ...draft, points: event.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="tile-cat">Category</Label>
                  <select
                    id="tile-cat"
                    className="select-osrs"
                    value={draft.category}
                    onChange={(event) => setDraft({ ...draft, category: event.target.value })}
                  >
                    <option value="Boss">Boss</option>
                    <option value="Skill">Skill</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              <label className="flex min-h-11 items-center gap-2 text-sm font-bold">
                <input
                  type="checkbox"
                  checked={draft.isFree}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      isFree: event.target.checked,
                      points: event.target.checked ? "0" : draft.points,
                    })
                  }
                />
                Free space, filled for every team
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="submit" disabled={busy}>
                  Save tile
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingId(null);
                    setDraft(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EventPanel({ state, send, busy }: { state: PublicState; send: Send; busy: boolean }) {
  const [draft, setDraft] = useSynced(state.event.revision, eventDraft(state));
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmSeed, setConfirmSeed] = useState(false);
  const [phrase, setPhrase] = useState("");

  return (
    <div className="space-y-3">
      <form
        className="parchment-panel space-y-3 p-4"
        onSubmit={(event) => {
          event.preventDefault();
          void send("/api/admin/event", "PUT", {
            name: draft.name,
            tagline: draft.tagline,
            startAt: isoFromLocal(draft.startLocal),
            endAt: isoFromLocal(draft.endLocal),
            chatPassword: draft.chatPassword,
            bonuses: {
              row: Number(draft.row),
              column: Number(draft.column),
              diagonal: Number(draft.diagonal),
              blackout: Number(draft.blackout),
            },
          });
        }}
      >
        <div className="space-y-1">
          <Label htmlFor="event-name">Event name</Label>
          <Input id="event-name" value={draft.name} maxLength={60} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="tagline">Tagline</Label>
          <Input id="tagline" value={draft.tagline} maxLength={160} onChange={(event) => setDraft({ ...draft, tagline: event.target.value })} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="start">Starts</Label>
            <Input id="start" type="datetime-local" value={draft.startLocal} onChange={(event) => setDraft({ ...draft, startLocal: event.target.value })} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="end">Ends</Label>
            <Input id="end" type="datetime-local" value={draft.endLocal} onChange={(event) => setDraft({ ...draft, endLocal: event.target.value })} />
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="word">Clan chat word</Label>
          <Input
            id="word"
            value={draft.chatPassword}
            maxLength={40}
            onChange={(event) => setDraft({ ...draft, chatPassword: event.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(["row", "column", "diagonal", "blackout"] as const).map((key) => (
            <div key={key} className="space-y-1">
              <Label htmlFor={`bonus-${key}`}>{key}</Label>
              <Input
                id={`bonus-${key}`}
                inputMode="numeric"
                value={draft[key]}
                onChange={(event) => setDraft({ ...draft, [key]: event.target.value })}
              />
            </div>
          ))}
        </div>
        <Button type="submit" disabled={busy}>
          Save event
        </Button>
      </form>
      <div className="parchment-panel space-y-3 p-4">
        <h3 className="font-display text-xl">Reset</h3>
        <p className="text-sm text-[#5c4630]">
          Clear progress removes every X and empties the feed. Teams and tiles stay. Restore default puts the Serpent
          Cup seed back, including the sample marks.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="button" variant="outline" disabled={busy} onClick={() => setConfirmClear(true)}>
            Clear progress
          </Button>
          <Button type="button" variant="destructive" disabled={busy} onClick={() => setConfirmSeed(true)}>
            Restore default event
          </Button>
        </div>
      </div>
      <Dialog open={confirmClear} onOpenChange={setConfirmClear}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear every mark?</DialogTitle>
            <DialogDescription>Teams, tiles, and the event name stay. The public board goes back to the free space only.</DialogDescription>
          </DialogHeader>
          <Button
            className="mt-4"
            type="button"
            variant="destructive"
            disabled={busy}
            onClick={async () => {
              const saved = await send("/api/admin/reset", "POST", { mode: "progress" }, "Progress cleared.");
              if (saved) setConfirmClear(false);
            }}
          >
            Clear progress
          </Button>
        </DialogContent>
      </Dialog>
      <Dialog
        open={confirmSeed}
        onOpenChange={(open) => {
          setConfirmSeed(open);
          if (!open) setPhrase("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore the default bingo?</DialogTitle>
            <DialogDescription>
              This replaces teams, tiles, dates, and marks with the seeded Serpent Cup. Type RESET to confirm.
            </DialogDescription>
          </DialogHeader>
          <Input className="mt-4" value={phrase} onChange={(event) => setPhrase(event.target.value)} placeholder="RESET" />
          <Button
            className="mt-3"
            type="button"
            variant="destructive"
            disabled={busy || phrase !== "RESET"}
            onClick={async () => {
              const saved = await send("/api/admin/reset", "POST", { mode: "seed" }, "Default event restored.");
              if (saved) {
                setPhrase("");
                setConfirmSeed(false);
              }
            }}
          >
            Restore default
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LogPanel({ state }: { state: PublicState }) {
  return (
    <div className="parchment-panel max-h-[70vh] overflow-y-auto p-4">
      {state.activity.length === 0 ? (
        <p className="text-sm">The log is empty.</p>
      ) : (
        <ol>
          {state.activity.map((entry) => (
            <li key={entry.id} className="border-b border-[#d7c39a] py-3 last:border-b-0">
              <p className="font-semibold">{entry.message}</p>
              <p className="text-xs text-[#6d5638]">
                {entry.actor} · {formatUtc(entry.createdAt)} · {entry.action}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function tileDraft(tile: PublicTile): TileDraft {
  return {
    name: tile.name,
    description: tile.description,
    points: String(tile.points),
    icon: tile.icon,
    category: tile.category,
    isFree: tile.isFree,
  };
}

function eventDraft(state: PublicState): EventDraft {
  return {
    name: state.event.name,
    tagline: state.event.tagline,
    startLocal: toDatetimeLocal(state.event.startAt),
    endLocal: toDatetimeLocal(state.event.endAt),
    chatPassword: state.event.chatPassword,
    row: String(state.event.bonuses.row),
    column: String(state.event.bonuses.column),
    diagonal: String(state.event.bonuses.diagonal),
    blackout: String(state.event.bonuses.blackout),
  };
}

function isoFromLocal(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}
