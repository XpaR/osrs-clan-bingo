import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import { clearAndSeed } from "./db";
import { completionMessage, removalMessage } from "./messages";
import { proofFilesForCompletions, unlinkProofFiles } from "./proofs";
import {
  cleanBonus,
  cleanCategory,
  cleanColor,
  cleanIcon,
  cleanIso,
  cleanMembers,
  cleanName,
  cleanNote,
  cleanPoints,
  cleanText,
} from "./validators";

interface TeamRow {
  id: string;
  name: string;
  color: string;
  members: string;
  sort_order: number;
}

interface TileRow {
  id: string;
  position: number;
  name: string;
  description: string;
  points: number;
  icon: string;
  category: string;
  is_free: number;
}

function bump(db: Database.Database) {
  db.prepare("UPDATE event SET revision = revision + 1 WHERE id = 1").run();
}

function log(
  db: Database.Database,
  action: string,
  message: string,
  tileId: string | null,
  teamId: string | null,
  actor = "Admin",
) {
  db.prepare(
    `INSERT INTO activity (id, action, message, tile_id, team_id, actor, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(randomUUID(), action, message, tileId, teamId, actor, new Date().toISOString());
}

function teamById(db: Database.Database, id: string) {
  return db.prepare("SELECT * FROM teams WHERE id = ?").get(id) as TeamRow | undefined;
}

function tileById(db: Database.Database, id: string) {
  return db.prepare("SELECT * FROM tiles WHERE id = ?").get(id) as TileRow | undefined;
}

export function markTile(db: Database.Database, input: { teamId?: unknown; tileId?: unknown; note?: unknown }) {
  const team = teamById(db, String(input.teamId ?? ""));
  if (!team) throw new Error("That team does not exist.");
  const tile = tileById(db, String(input.tileId ?? ""));
  if (!tile) throw new Error("That tile does not exist.");
  if (tile.is_free) throw new Error("The free space is already filled for every team.");
  const note = cleanNote(input.note);
  const apply = db.transaction(() => {
    const existing = db
      .prepare("SELECT id FROM completions WHERE tile_id = ? AND team_id = ?")
      .get(tile.id, team.id) as { id: string } | undefined;
    if (existing) {
      db.prepare("UPDATE completions SET note = ? WHERE id = ?").run(note, existing.id);
      log(db, "update", `Admin updated the note for ${team.name} on ${tile.name}.`, tile.id, team.id);
    } else {
      db.prepare(
        `INSERT INTO completions (id, tile_id, team_id, proof_url, note, completed_at, actor)
         VALUES (?, ?, ?, '', ?, ?, 'Admin')`,
      ).run(randomUUID(), tile.id, team.id, note, new Date().toISOString());
      log(db, "complete", completionMessage(team.name, tile.name, tile.points), tile.id, team.id);
    }
    bump(db);
  });
  apply();
}

export function unmarkTile(db: Database.Database, input: { teamId?: unknown; tileId?: unknown }) {
  const team = teamById(db, String(input.teamId ?? ""));
  if (!team) throw new Error("That team does not exist.");
  const tile = tileById(db, String(input.tileId ?? ""));
  if (!tile) throw new Error("That tile does not exist.");
  const existing = db
    .prepare("SELECT id FROM completions WHERE tile_id = ? AND team_id = ?")
    .get(tile.id, team.id) as { id: string } | undefined;
  if (!existing) throw new Error("That tile is not marked for this team.");
  const files = proofFilesForCompletions(db, [existing.id]);
  const apply = db.transaction(() => {
    const result = db.prepare("DELETE FROM completions WHERE id = ?").run(existing.id);
    if (result.changes === 0) throw new Error("That tile is not marked for this team.");
    log(db, "uncomplete", removalMessage(team.name, tile.name), tile.id, team.id);
    bump(db);
  });
  apply();
  unlinkProofFiles(files);
}

export function createTeam(db: Database.Database, input: { name?: unknown; color?: unknown; members?: unknown }) {
  const count = db.prepare("SELECT COUNT(*) AS count FROM teams").get() as { count: number };
  if (count.count >= 8) throw new Error("Eight teams is the limit. The board gets hard to read after that.");
  const name = cleanName(input.name, "Team name", 32);
  const duplicate = db.prepare("SELECT id FROM teams WHERE lower(name) = lower(?)").get(name);
  if (duplicate) throw new Error("A team already uses that name.");
  const color = cleanColor(input.color);
  const members = cleanMembers(input.members ?? []);
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24) || "team";
  let id = `team-${base}`;
  let suffix = 2;
  while (teamById(db, id)) {
    id = `team-${base}-${suffix}`;
    suffix += 1;
  }
  const sort = db.prepare("SELECT COALESCE(MAX(sort_order), -1) AS max FROM teams").get() as { max: number };
  const apply = db.transaction(() => {
    db.prepare("INSERT INTO teams (id, name, color, members, sort_order) VALUES (?, ?, ?, ?, ?)").run(
      id,
      name,
      color,
      JSON.stringify(members),
      sort.max + 1,
    );
    log(db, "team", `Admin added ${name}.`, null, id);
    bump(db);
  });
  apply();
  return id;
}

export function updateTeam(
  db: Database.Database,
  id: string,
  input: { name?: unknown; color?: unknown; members?: unknown },
) {
  const team = teamById(db, id);
  if (!team) throw new Error("That team does not exist.");
  const name = cleanName(input.name, "Team name", 32);
  const duplicate = db.prepare("SELECT id FROM teams WHERE lower(name) = lower(?) AND id <> ?").get(name, id);
  if (duplicate) throw new Error("A team already uses that name.");
  const color = cleanColor(input.color);
  const members = cleanMembers(input.members ?? []);
  const apply = db.transaction(() => {
    db.prepare("UPDATE teams SET name = ?, color = ?, members = ? WHERE id = ?").run(
      name,
      color,
      JSON.stringify(members),
      id,
    );
    log(db, "team", `Admin updated ${name}.`, null, id);
    bump(db);
  });
  apply();
}

export function deleteTeam(db: Database.Database, id: string) {
  const team = teamById(db, id);
  if (!team) throw new Error("That team does not exist.");
  const count = db.prepare("SELECT COUNT(*) AS count FROM teams").get() as { count: number };
  if (count.count <= 1) throw new Error("Keep at least one team on the board.");
  const completionIds = (db.prepare("SELECT id FROM completions WHERE team_id = ?").all(id) as { id: string }[]).map(
    (row) => row.id,
  );
  const files = proofFilesForCompletions(db, completionIds);
  const apply = db.transaction(() => {
    db.prepare("DELETE FROM teams WHERE id = ?").run(id);
    log(db, "team", `Admin removed ${team.name} and their marks.`, null, null);
    bump(db);
  });
  apply();
  unlinkProofFiles(files);
}

export function updateTile(
  db: Database.Database,
  id: string,
  input: {
    name?: unknown;
    description?: unknown;
    points?: unknown;
    icon?: unknown;
    category?: unknown;
    isFree?: unknown;
  },
) {
  const tile = tileById(db, id);
  if (!tile) throw new Error("That tile does not exist.");
  const isFree = Boolean(input.isFree);
  const name = cleanName(input.name, "Tile name", 40);
  const description = cleanText(input.description, 800);
  const points = isFree ? 0 : cleanPoints(input.points);
  const icon = cleanIcon(input.icon);
  const category = cleanCategory(input.category);
  const files = isFree
    ? proofFilesForCompletions(
        db,
        (db.prepare("SELECT id FROM completions WHERE tile_id = ?").all(id) as { id: string }[]).map((row) => row.id),
      )
    : [];
  const apply = db.transaction(() => {
    db.prepare(
      `UPDATE tiles
       SET name = ?, description = ?, points = ?, icon = ?, category = ?, is_free = ?
       WHERE id = ?`,
    ).run(name, description, points, icon, category, isFree ? 1 : 0, id);
    if (isFree) {
      db.prepare("DELETE FROM completions WHERE tile_id = ?").run(id);
    }
    log(db, "tile", `Admin updated the tile ${name}.`, id, null);
    bump(db);
  });
  apply();
  unlinkProofFiles(files);
}

export function swapTiles(db: Database.Database, tileId: string, withTileId: string) {
  if (tileId === withTileId) return;
  const first = tileById(db, tileId);
  const second = tileById(db, withTileId);
  if (!first || !second) throw new Error("Both squares have to be on the board.");
  const firstPosition = first.position;
  const secondPosition = second.position;
  const apply = db.transaction(() => {
    db.prepare("UPDATE tiles SET position = -1 WHERE id = ?").run(first.id);
    db.prepare("UPDATE tiles SET position = ? WHERE id = ?").run(firstPosition, second.id);
    db.prepare("UPDATE tiles SET position = ? WHERE id = ?").run(secondPosition, first.id);
    log(db, "tile", `Admin swapped ${first.name} with ${second.name}.`, first.id, null);
    bump(db);
  });
  apply();
}

export function updateEvent(
  db: Database.Database,
  input: {
    name?: unknown;
    tagline?: unknown;
    startAt?: unknown;
    endAt?: unknown;
    chatPassword?: unknown;
    bonuses?: { row?: unknown; column?: unknown; diagonal?: unknown; blackout?: unknown };
  },
) {
  const name = cleanName(input.name, "Event name", 60);
  const tagline = cleanText(input.tagline, 160);
  const startAt = cleanIso(input.startAt, "Start");
  const endAt = cleanIso(input.endAt, "End");
  if (new Date(endAt).getTime() <= new Date(startAt).getTime()) {
    throw new Error("The end has to be after the start.");
  }
  const chatPassword = cleanText(input.chatPassword, 40);
  const bonuses = input.bonuses ?? {};
  const row = cleanBonus(bonuses.row, "Row bonus");
  const column = cleanBonus(bonuses.column, "Column bonus");
  const diagonal = cleanBonus(bonuses.diagonal, "Diagonal bonus");
  const blackout = cleanBonus(bonuses.blackout, "Blackout bonus");
  const apply = db.transaction(() => {
    db.prepare(
      `UPDATE event
       SET name = ?, tagline = ?, start_at = ?, end_at = ?, chat_password = ?,
           row_bonus = ?, col_bonus = ?, diag_bonus = ?, blackout_bonus = ?
       WHERE id = 1`,
    ).run(name, tagline, startAt, endAt, chatPassword, row, column, diagonal, blackout);
    log(db, "event", "Admin updated the event settings.", null, null);
    bump(db);
  });
  apply();
}

export function resetProgress(db: Database.Database) {
  const files = (db.prepare("SELECT filename FROM proof_images").all() as { filename: string }[]).map((row) => row.filename);
  const apply = db.transaction(() => {
    db.prepare("DELETE FROM completions").run();
    db.prepare("DELETE FROM activity").run();
    log(db, "reset", "Admin cleared every mark on the board.", null, null);
    bump(db);
  });
  apply();
  unlinkProofFiles(files);
}

export function resetToSeed(db: Database.Database) {
  clearAndSeed(db);
}
