import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { completionMessage } from "./messages";
import { forgetProofFiles } from "./proofs";
import { SEED_COMPLETIONS, SEED_EVENT, SEED_TEAMS, SEED_TILES, eventWindow } from "./seed-data";

const globalForDb = globalThis as unknown as { __bingoDb?: Database.Database };

export function databasePath() {
  return process.env.DATABASE_PATH || path.join(process.cwd(), "data", "bingo.sqlite");
}

export function getDb() {
  if (!globalForDb.__bingoDb) {
    const dbPath = databasePath();
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    const db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    db.pragma("busy_timeout = 4000");
    globalForDb.__bingoDb = db;
  }
  migrate(globalForDb.__bingoDb);
  const row = globalForDb.__bingoDb.prepare("SELECT COUNT(*) AS count FROM event").get() as { count: number };
  if (row.count === 0) seedDatabase(globalForDb.__bingoDb);
  return globalForDb.__bingoDb;
}

export function closeDb() {
  if (globalForDb.__bingoDb) {
    globalForDb.__bingoDb.close();
    globalForDb.__bingoDb = undefined;
  }
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS event (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      name TEXT NOT NULL,
      tagline TEXT NOT NULL DEFAULT '',
      start_at TEXT NOT NULL,
      end_at TEXT NOT NULL,
      chat_password TEXT NOT NULL DEFAULT '',
      row_bonus INTEGER NOT NULL DEFAULT 5,
      col_bonus INTEGER NOT NULL DEFAULT 5,
      diag_bonus INTEGER NOT NULL DEFAULT 5,
      blackout_bonus INTEGER NOT NULL DEFAULT 25,
      revision INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      members TEXT NOT NULL DEFAULT '[]',
      sort_order INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tiles (
      id TEXT PRIMARY KEY,
      position INTEGER NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      points INTEGER NOT NULL,
      icon TEXT NOT NULL DEFAULT '⭐',
      category TEXT NOT NULL DEFAULT '',
      difficulty TEXT NOT NULL,
      is_free INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS completions (
      id TEXT PRIMARY KEY,
      tile_id TEXT NOT NULL REFERENCES tiles(id) ON DELETE CASCADE,
      team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      proof_url TEXT NOT NULL DEFAULT '',
      note TEXT NOT NULL DEFAULT '',
      completed_at TEXT NOT NULL,
      actor TEXT NOT NULL DEFAULT 'Admin',
      UNIQUE (tile_id, team_id)
    );

    CREATE TABLE IF NOT EXISTS activity (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      message TEXT NOT NULL,
      tile_id TEXT,
      team_id TEXT,
      actor TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS activity_created ON activity (created_at DESC);

    CREATE TABLE IF NOT EXISTS proof_images (
      id TEXT PRIMARY KEY,
      completion_id TEXT NOT NULL REFERENCES completions(id) ON DELETE CASCADE,
      filename TEXT NOT NULL,
      mime TEXT NOT NULL,
      bytes INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS proof_images_completion ON proof_images (completion_id);
  `);
}

function writeSeed(db: Database.Database, now: Date) {
  const window = eventWindow(now);
  db.prepare(
    `INSERT INTO event (
      id, name, tagline, start_at, end_at, chat_password,
      row_bonus, col_bonus, diag_bonus, blackout_bonus, revision
    ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
  ).run(
    SEED_EVENT.name,
    SEED_EVENT.tagline,
    window.startAt,
    window.endAt,
    SEED_EVENT.chatPassword,
    SEED_EVENT.bonuses.row,
    SEED_EVENT.bonuses.column,
    SEED_EVENT.bonuses.diagonal,
    SEED_EVENT.bonuses.blackout,
  );

  const insertTeam = db.prepare(
    "INSERT INTO teams (id, name, color, members, sort_order) VALUES (?, ?, ?, ?, ?)",
  );
  for (const team of SEED_TEAMS) {
    insertTeam.run(team.id, team.name, team.color, JSON.stringify(team.members), team.sortOrder);
  }

  const insertTile = db.prepare(
    `INSERT INTO tiles (
      id, position, name, description, points, icon, category, difficulty, is_free
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  for (const tile of SEED_TILES) {
    insertTile.run(
      tile.id,
      tile.position,
      tile.name,
      tile.description,
      tile.points,
      tile.icon,
      tile.category,
      tile.difficulty,
      tile.isFree ? 1 : 0,
    );
  }

  const insertCompletion = db.prepare(
    `INSERT INTO completions (id, tile_id, team_id, proof_url, note, completed_at, actor)
     VALUES (?, ?, ?, '', ?, ?, 'Admin')`,
  );
  const insertActivity = db.prepare(
    `INSERT INTO activity (id, action, message, tile_id, team_id, actor, created_at)
     VALUES (?, 'complete', ?, ?, ?, 'Admin', ?)`,
  );
  const teamsById = new Map(SEED_TEAMS.map((team) => [team.id, team]));
  const tilesByPosition = new Map(SEED_TILES.map((tile) => [tile.position, tile]));
  for (const plan of SEED_COMPLETIONS) {
    const team = teamsById.get(plan.teamId);
    const tile = tilesByPosition.get(plan.position);
    if (!team || !tile) continue;
    const completedAt = new Date(now.getTime() - plan.minutesAgo * 60 * 1000).toISOString();
    insertCompletion.run(randomUUID(), tile.id, team.id, plan.note, completedAt);
    insertActivity.run(
      randomUUID(),
      completionMessage(team.name, tile.name, tile.points),
      tile.id,
      team.id,
      completedAt,
    );
  }
}

export function seedDatabase(db: Database.Database, now = new Date()) {
  const apply = db.transaction(() => writeSeed(db, now));
  apply();
}

export function clearAndSeed(db: Database.Database, now = new Date()) {
  const apply = db.transaction(() => {
    forgetProofFiles(db);
    db.exec("DELETE FROM proof_images; DELETE FROM activity; DELETE FROM completions; DELETE FROM tiles; DELETE FROM teams; DELETE FROM event;");
    writeSeed(db, now);
    db.prepare(
      `INSERT INTO activity (id, action, message, tile_id, team_id, actor, created_at)
       VALUES (?, 'reset', ?, NULL, NULL, 'Admin', ?)`,
    ).run(randomUUID(), "Admin restored the default event, teams, and tiles.", new Date().toISOString());
    db.prepare("UPDATE event SET revision = revision + 1 WHERE id = 1").run();
  });
  apply();
}
