import type { TeamScore } from "./scoring";

export type Difficulty = "easy" | "medium" | "hard" | "free";

export interface PublicEvent {
  name: string;
  tagline: string;
  startAt: string;
  endAt: string;
  chatPassword: string;
  bonuses: {
    row: number;
    column: number;
    diagonal: number;
    blackout: number;
  };
  revision: number;
}

export interface PublicTeam {
  id: string;
  name: string;
  color: string;
  members: string[];
  sortOrder: number;
}

export interface PublicTile {
  id: string;
  position: number;
  name: string;
  description: string;
  points: number;
  icon: string;
  category: string;
  difficulty: Difficulty;
  isFree: boolean;
}

export interface PublicCompletion {
  id: string;
  tileId: string;
  teamId: string;
  proofUrl: string;
  note: string;
  completedAt: string;
  actor: string;
}

export interface PublicActivity {
  id: string;
  action: string;
  message: string;
  tileId: string | null;
  teamId: string | null;
  actor: string;
  createdAt: string;
}

export interface LeaderboardEntry extends TeamScore {
  name: string;
  color: string;
  members: string[];
  place: number;
}

export interface PublicState {
  event: PublicEvent;
  teams: PublicTeam[];
  tiles: PublicTile[];
  completions: PublicCompletion[];
  activity: PublicActivity[];
  leaderboard: LeaderboardEntry[];
  serverTime: string;
}
