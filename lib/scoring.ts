export const BOARD_SIZE = 5;

export interface BonusConfig {
  row: number;
  column: number;
  diagonal: number;
  blackout: number;
}

export const DEFAULT_BONUS: BonusConfig = {
  row: 5,
  column: 5,
  diagonal: 5,
  blackout: 25,
};

export interface ScoreTile {
  id: string;
  position: number;
  points: number;
  isFree: boolean;
}

export interface ScoreCompletion {
  tileId: string;
  teamId: string;
  completedAt?: string | null;
}

export interface ScoreTeam {
  id: string;
  sortOrder?: number;
}

export interface LineHit {
  type: "row" | "column" | "diagonal";
  index: number;
}

export interface TeamScore {
  teamId: string;
  sortOrder: number;
  tilePoints: number;
  lineBonus: number;
  blackoutBonus: number;
  total: number;
  filled: number;
  completedTileIds: string[];
  lines: LineHit[];
  linePositions: number[];
  rows: number;
  columns: number;
  diagonals: number;
  blackout: boolean;
  lastCompletionAt: string | null;
}

export function positionsForLine(line: LineHit, size = BOARD_SIZE): number[] {
  if (line.type === "row") {
    return Array.from({ length: size }, (_, column) => line.index * size + column);
  }
  if (line.type === "column") {
    return Array.from({ length: size }, (_, row) => row * size + line.index);
  }
  if (line.index === 0) {
    return Array.from({ length: size }, (_, index) => index * size + index);
  }
  return Array.from({ length: size }, (_, index) => index * size + (size - 1 - index));
}

export function linesOnBoard(filled: Set<number>, size: number): LineHit[] {
  const lines: LineHit[] = [];
  for (let row = 0; row < size; row += 1) {
    let complete = true;
    for (let column = 0; column < size; column += 1) {
      if (!filled.has(row * size + column)) complete = false;
    }
    if (complete) lines.push({ type: "row", index: row });
  }
  for (let column = 0; column < size; column += 1) {
    let complete = true;
    for (let row = 0; row < size; row += 1) {
      if (!filled.has(row * size + column)) complete = false;
    }
    if (complete) lines.push({ type: "column", index: column });
  }
  let main = true;
  let anti = true;
  for (let index = 0; index < size; index += 1) {
    if (!filled.has(index * size + index)) main = false;
    if (!filled.has(index * size + (size - 1 - index))) anti = false;
  }
  if (main) lines.push({ type: "diagonal", index: 0 });
  if (anti) lines.push({ type: "diagonal", index: 1 });
  return lines;
}

function boardSize(count: number): number {
  const size = Math.round(Math.sqrt(count));
  if (size < 1 || size * size !== count) {
    throw new Error("The bingo board has to be a square, for example 5 by 5.");
  }
  return size;
}

export function scoreTeam(
  tiles: ScoreTile[],
  team: ScoreTeam,
  completions: ScoreCompletion[],
  bonuses: BonusConfig = DEFAULT_BONUS,
): TeamScore {
  const size = boardSize(tiles.length);
  const done = new Set<string>();
  let lastCompletionAt: string | null = null;
  for (const completion of completions) {
    if (completion.teamId !== team.id) continue;
    done.add(completion.tileId);
    if (completion.completedAt && (!lastCompletionAt || completion.completedAt > lastCompletionAt)) {
      lastCompletionAt = completion.completedAt;
    }
  }

  const filledPositions = new Set<number>();
  const completedTileIds: string[] = [];
  let tilePoints = 0;
  for (const tile of tiles) {
    if (!(tile.isFree || done.has(tile.id))) continue;
    completedTileIds.push(tile.id);
    if (tile.position >= 0 && tile.position < size * size) {
      filledPositions.add(tile.position);
    }
    if (!tile.isFree) tilePoints += tile.points;
  }

  const lines = linesOnBoard(filledPositions, size);
  const rows = lines.filter((line) => line.type === "row").length;
  const columns = lines.filter((line) => line.type === "column").length;
  const diagonals = lines.filter((line) => line.type === "diagonal").length;
  const lineBonus = rows * bonuses.row + columns * bonuses.column + diagonals * bonuses.diagonal;
  const blackout = filledPositions.size === size * size;
  const blackoutBonus = blackout ? bonuses.blackout : 0;
  const linePositions = [...new Set(lines.flatMap((line) => positionsForLine(line, size)))];

  return {
    teamId: team.id,
    sortOrder: team.sortOrder ?? 0,
    tilePoints,
    lineBonus,
    blackoutBonus,
    total: tilePoints + lineBonus + blackoutBonus,
    filled: completedTileIds.length,
    completedTileIds,
    lines,
    linePositions,
    rows,
    columns,
    diagonals,
    blackout,
    lastCompletionAt,
  };
}

export function computeLeaderboard(
  tiles: ScoreTile[],
  teams: ScoreTeam[],
  completions: ScoreCompletion[],
  bonuses: BonusConfig = DEFAULT_BONUS,
): TeamScore[] {
  const scores = teams.map((team) => scoreTeam(tiles, team, completions, bonuses));
  scores.sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    if (b.tilePoints !== a.tilePoints) return b.tilePoints - a.tilePoints;
    if (a.lastCompletionAt && b.lastCompletionAt && a.lastCompletionAt !== b.lastCompletionAt) {
      return a.lastCompletionAt < b.lastCompletionAt ? -1 : 1;
    }
    if (a.lastCompletionAt && !b.lastCompletionAt) return -1;
    if (!a.lastCompletionAt && b.lastCompletionAt) return 1;
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.teamId.localeCompare(b.teamId);
  });
  return scores;
}
