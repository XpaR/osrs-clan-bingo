import { getDb } from "./db";
import { computeLeaderboard, type BonusConfig } from "./scoring";
import type {
  Difficulty,
  LeaderboardEntry,
  PublicActivity,
  PublicCompletion,
  PublicEvent,
  PublicState,
  PublicTeam,
  PublicTile,
} from "./types";

interface EventRow {
  name: string;
  tagline: string;
  start_at: string;
  end_at: string;
  chat_password: string;
  row_bonus: number;
  col_bonus: number;
  diag_bonus: number;
  blackout_bonus: number;
  revision: number;
}

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
  difficulty: string;
  is_free: number;
}

interface CompletionRow {
  id: string;
  tile_id: string;
  team_id: string;
  proof_url: string;
  note: string;
  completed_at: string;
  actor: string;
}

interface ActivityRow {
  id: string;
  action: string;
  message: string;
  tile_id: string | null;
  team_id: string | null;
  actor: string;
  created_at: string;
}

function asDifficulty(value: string): Difficulty {
  if (value === "easy" || value === "medium" || value === "hard" || value === "free") return value;
  return "medium";
}

function membersOf(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is string => typeof entry === "string");
  } catch {
    return [];
  }
}

export function getPublicState(): PublicState {
  const db = getDb();
  const eventRow = db.prepare("SELECT * FROM event WHERE id = 1").get() as EventRow;
  const teamRows = db.prepare("SELECT * FROM teams ORDER BY sort_order, name").all() as TeamRow[];
  const tileRows = db.prepare("SELECT * FROM tiles ORDER BY position").all() as TileRow[];
  const completionRows = db.prepare("SELECT * FROM completions").all() as CompletionRow[];
  const activityRows = db
    .prepare("SELECT * FROM activity ORDER BY created_at DESC, rowid DESC LIMIT 80")
    .all() as ActivityRow[];

  const event: PublicEvent = {
    name: eventRow.name,
    tagline: eventRow.tagline,
    startAt: eventRow.start_at,
    endAt: eventRow.end_at,
    chatPassword: eventRow.chat_password,
    bonuses: {
      row: eventRow.row_bonus,
      column: eventRow.col_bonus,
      diagonal: eventRow.diag_bonus,
      blackout: eventRow.blackout_bonus,
    },
    revision: eventRow.revision,
  };
  const teams: PublicTeam[] = teamRows.map((team) => ({
    id: team.id,
    name: team.name,
    color: team.color,
    members: membersOf(team.members),
    sortOrder: team.sort_order,
  }));
  const tiles: PublicTile[] = tileRows.map((tile) => ({
    id: tile.id,
    position: tile.position,
    name: tile.name,
    description: tile.description,
    points: tile.points,
    icon: tile.icon,
    category: tile.category,
    difficulty: asDifficulty(tile.difficulty),
    isFree: tile.is_free === 1,
  }));
  const completions: PublicCompletion[] = completionRows.map((completion) => ({
    id: completion.id,
    tileId: completion.tile_id,
    teamId: completion.team_id,
    proofUrl: completion.proof_url,
    note: completion.note,
    completedAt: completion.completed_at,
    actor: completion.actor,
  }));
  const activity: PublicActivity[] = activityRows.map((entry) => ({
    id: entry.id,
    action: entry.action,
    message: entry.message,
    tileId: entry.tile_id,
    teamId: entry.team_id,
    actor: entry.actor,
    createdAt: entry.created_at,
  }));

  const bonuses: BonusConfig = event.bonuses;
  const scored = computeLeaderboard(
    tiles.map((tile) => ({ id: tile.id, position: tile.position, points: tile.points, isFree: tile.isFree })),
    teams.map((team) => ({ id: team.id, sortOrder: team.sortOrder })),
    completions.map((completion) => ({
      tileId: completion.tileId,
      teamId: completion.teamId,
      completedAt: completion.completedAt,
    })),
    bonuses,
  );
  const teamById = new Map(teams.map((team) => [team.id, team]));
  const leaderboard: LeaderboardEntry[] = scored.map((score, index) => {
    const team = teamById.get(score.teamId);
    return {
      ...score,
      name: team?.name ?? score.teamId,
      color: team?.color ?? "#888888",
      members: team?.members ?? [],
      place: index + 1,
    };
  });

  return {
    event,
    teams,
    tiles,
    completions,
    activity,
    leaderboard,
    serverTime: new Date().toISOString(),
  };
}
