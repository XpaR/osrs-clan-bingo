import assert from "node:assert/strict";
import { test } from "node:test";
import { SEED_COMPLETIONS, SEED_TEAMS, SEED_TILES } from "./seed-data";
import {
  computeLeaderboard,
  DEFAULT_BONUS,
  positionsForLine,
  scoreTeam,
  type ScoreCompletion,
  type ScoreTile,
} from "./scoring";

function board(size: number, freePosition: number | null = null): ScoreTile[] {
  return Array.from({ length: size * size }, (_, position) => ({
    id: `t${position}`,
    position,
    points: position,
    isFree: position === freePosition,
  }));
}

function marks(teamId: string, positions: number[], start = "2026-11-21T12:00:00.000Z"): ScoreCompletion[] {
  const origin = new Date(start).getTime();
  return positions.map((position, index) => ({
    teamId,
    tileId: `t${position}`,
    completedAt: new Date(origin + index * 60_000).toISOString(),
  }));
}

const five = board(5, 12);
const teams = [
  { id: "a", sortOrder: 0 },
  { id: "b", sortOrder: 1 },
];

test("a fresh board scores only the free centre", () => {
  const score = scoreTeam(five, teams[0], []);
  assert.equal(score.tilePoints, 0);
  assert.equal(score.lineBonus, 0);
  assert.equal(score.blackoutBonus, 0);
  assert.equal(score.total, 0);
  assert.equal(score.filled, 1);
  assert.deepEqual(score.lines, []);
  assert.equal(score.blackout, false);
  assert.equal(score.completedTileIds.includes("t12"), true);
});

test("free tile points are ignored", () => {
  const tiles = five.map((tile) => (tile.isFree ? { ...tile, points: 40 } : tile));
  const score = scoreTeam(tiles, teams[0], []);
  assert.equal(score.tilePoints, 0);
});

test("one tile scores its points and no line", () => {
  const score = scoreTeam(five, teams[0], marks("a", [4]));
  assert.equal(score.tilePoints, 4);
  assert.equal(score.total, 4);
  assert.equal(score.rows, 0);
});

test("four of five in a row is not a line", () => {
  const score = scoreTeam(five, teams[0], marks("a", [0, 1, 2, 3]));
  assert.equal(score.rows, 0);
  assert.equal(score.lineBonus, 0);
  assert.equal(score.tilePoints, 0 + 1 + 2 + 3);
});

test("a full row pays tile points plus the row bonus", () => {
  const score = scoreTeam(five, teams[0], marks("a", [0, 1, 2, 3, 4]));
  assert.equal(score.tilePoints, 10);
  assert.equal(score.rows, 1);
  assert.equal(score.columns, 0);
  assert.equal(score.lineBonus, DEFAULT_BONUS.row);
  assert.equal(score.total, 15);
  assert.deepEqual(score.linePositions, [0, 1, 2, 3, 4]);
});

test("the free centre completes a row when the other four are marked", () => {
  const score = scoreTeam(five, teams[0], marks("a", [10, 11, 13, 14]));
  assert.equal(score.rows, 1);
  assert.equal(score.columns, 0);
  assert.equal(score.diagonals, 0);
  assert.equal(score.tilePoints, 10 + 11 + 13 + 14);
  assert.equal(score.lineBonus, 5);
  assert.equal(score.filled, 5);
});

test("a full column pays the column bonus", () => {
  const score = scoreTeam(five, teams[0], marks("a", [1, 6, 11, 16, 21]));
  assert.equal(score.columns, 1);
  assert.equal(score.rows, 0);
  assert.equal(score.lineBonus, 5);
  assert.deepEqual(score.linePositions, [1, 6, 11, 16, 21]);
});

test("main diagonal includes the free centre", () => {
  const score = scoreTeam(five, teams[0], marks("a", [0, 6, 18, 24]));
  assert.equal(score.diagonals, 1);
  assert.equal(score.rows, 0);
  assert.equal(score.columns, 0);
  assert.deepEqual(
    score.lines.map((line) => line.index),
    [0],
  );
  assert.equal(score.lineBonus, 5);
});

test("anti diagonal is the other slash", () => {
  const score = scoreTeam(five, teams[0], marks("a", [4, 8, 16, 20]));
  assert.deepEqual(score.lines, [{ type: "diagonal", index: 1 }]);
  assert.deepEqual(positionsForLine({ type: "diagonal", index: 1 }), [4, 8, 12, 16, 20]);
});

test("both diagonals share the centre and both pay", () => {
  const score = scoreTeam(five, teams[0], marks("a", [0, 6, 18, 24, 4, 8, 16, 20]));
  assert.equal(score.diagonals, 2);
  assert.equal(score.lineBonus, 10);
  assert.equal(score.tilePoints, [0, 6, 18, 24, 4, 8, 16, 20].reduce((sum, value) => sum + value, 0));
});

test("another team does not fill your line", () => {
  const score = scoreTeam(five, teams[0], [...marks("b", [0, 1, 2, 3, 4]), ...marks("a", [0])]);
  assert.equal(score.rows, 0);
  assert.equal(score.tilePoints, 0);
});

test("duplicate completion rows count once", () => {
  const once = marks("a", [4]);
  const score = scoreTeam(five, teams[0], [...once, ...once]);
  assert.equal(score.tilePoints, 4);
});

test("blackout pays every line and the blackout bonus, ignoring free points", () => {
  const tiles = board(5, 12).map((tile) => (tile.isFree ? { ...tile, points: 99 } : tile));
  const positions = tiles.filter((tile) => !tile.isFree).map((tile) => tile.position);
  const score = scoreTeam(tiles, teams[0], marks("a", positions));
  const tilePoints = positions.reduce((sum, position) => sum + position, 0);
  assert.equal(tilePoints, 288);
  assert.equal(score.tilePoints, 288);
  assert.equal(score.rows, 5);
  assert.equal(score.columns, 5);
  assert.equal(score.diagonals, 2);
  assert.equal(score.lineBonus, 60);
  assert.equal(score.blackout, true);
  assert.equal(score.blackoutBonus, 25);
  assert.equal(score.total, 373);
  assert.equal(score.filled, 25);
  assert.equal(score.linePositions.length, 25);
});

test("losing one corner drops blackout and only the lines through that cell", () => {
  const tiles = board(5, 12);
  const positions = tiles.filter((tile) => !tile.isFree && tile.position !== 4).map((tile) => tile.position);
  const score = scoreTeam(tiles, teams[0], marks("a", positions));
  assert.equal(score.blackout, false);
  assert.equal(score.blackoutBonus, 0);
  assert.equal(score.rows, 4);
  assert.equal(score.columns, 4);
  assert.equal(score.diagonals, 1);
  assert.deepEqual(score.lines[score.lines.length - 1], { type: "diagonal", index: 0 });
  assert.equal(score.tilePoints, 288 - 4);
  assert.equal(score.lineBonus, 45);
  assert.equal(score.total, 329);
});

test("custom bonus values are used", () => {
  const score = scoreTeam(five, teams[0], marks("a", [0, 1, 2, 3, 4]), {
    row: 10,
    column: 0,
    diagonal: 1,
    blackout: 3,
  });
  assert.equal(score.lineBonus, 10);
  assert.equal(score.total, 20);
});

test("ties prefer tile points, then the earlier last completion", () => {
  const row = marks("a", [0, 1, 2, 3, 4], "2026-11-21T10:00:00.000Z");
  const single = marks("b", [15], "2026-11-21T09:00:00.000Z");
  const scores = computeLeaderboard(five, teams, [...row, ...single]);
  assert.equal(scores[0].teamId, "b");
  assert.equal(scores[0].total, 15);
  assert.equal(scores[0].tilePoints, 15);
  assert.equal(scores[1].teamId, "a");
  assert.equal(scores[1].total, 15);
  assert.equal(scores[1].tilePoints, 10);

  const same = computeLeaderboard(five, teams, [
    ...marks("a", [4], "2026-11-21T08:00:00.000Z"),
    ...marks("b", [4], "2026-11-21T09:00:00.000Z"),
  ]);
  assert.equal(same[0].teamId, "a");
  assert.equal(same[1].teamId, "b");
  assert.equal(same[0].total, same[1].total);
});

test("a 3 by 3 board still finds both diagonals", () => {
  const tiles = board(3, 4);
  const score = scoreTeam(tiles, teams[0], marks("a", [0, 2, 6, 8]));
  assert.equal(score.diagonals, 2);
  assert.equal(score.rows, 0);
  assert.equal(score.columns, 0);
});

test("the seeded serpent cup has the published totals", () => {
  const completions = SEED_COMPLETIONS.map((plan) => ({
    teamId: plan.teamId,
    tileId: `tile-${String(plan.position).padStart(2, "0")}`,
    completedAt: new Date(Date.UTC(2026, 10, 21, 12, 0) - plan.minutesAgo * 60_000).toISOString(),
  }));
  const scores = computeLeaderboard(
    SEED_TILES.map((tile) => ({
      id: tile.id,
      position: tile.position,
      points: tile.points,
      isFree: tile.isFree,
    })),
    SEED_TEAMS,
    completions,
  );
  const byId = Object.fromEntries(scores.map((score) => [score.teamId, score]));
  assert.equal(byId["team-zulrah"].tilePoints, 25);
  assert.equal(byId["team-zulrah"].columns, 1);
  assert.equal(byId["team-zulrah"].rows, 0);
  assert.equal(byId["team-zulrah"].diagonals, 0);
  assert.equal(byId["team-zulrah"].lineBonus, 5);
  assert.equal(byId["team-zulrah"].total, 30);
  assert.equal(byId["team-zulrah"].filled, 6);
  assert.equal(byId["team-bandos"].total, 21);
  assert.equal(byId["team-bandos"].lineBonus, 0);
  assert.equal(byId["team-vorkath"].total, 17);
  assert.equal(byId["team-jad"].total, 14);
  assert.deepEqual(
    scores.map((score) => score.teamId),
    ["team-zulrah", "team-bandos", "team-vorkath", "team-jad"],
  );
  for (const score of scores) {
    if (score.teamId !== "team-zulrah") assert.equal(score.lineBonus, 0);
    assert.equal(score.blackout, false);
  }
});

test("the seeded card is a 5 by 5 mix of the usual clan tiles", () => {
  assert.equal(SEED_TILES.length, 25);
  assert.equal(new Set(SEED_TILES.map((tile) => tile.position)).size, 25);
  const free = SEED_TILES.filter((tile) => tile.isFree);
  assert.equal(free.length, 1);
  assert.equal(free[0].position, 12);
  assert.equal(free[0].points, 0);
  const names = SEED_TILES.map((tile) => `${tile.name} ${tile.description}`.toLowerCase()).join(" | ");
  for (const needle of [
    "godwars hilt",
    "dragon warhammer",
    "zenyte",
    "tanzanite",
    "barrows set",
    "vorkath head",
    "raids purple",
    "boss jar",
    "any pet",
    "5m skill",
    "tome of fire",
    "heron",
    "crystal tool",
    "agility",
    "3rd age",
    "master clue",
    "tempoross",
    "penance",
    "zulrah",
    "fire cape",
    "inferno",
    "free",
  ]) {
    assert.equal(names.includes(needle), true, needle);
  }
  for (const tile of SEED_TILES) {
    assert.ok(tile.category === "Boss" || tile.category === "Skill" || tile.category === "Other", tile.name);
  }
  const byId = Object.fromEntries(SEED_TILES.map((tile) => [tile.id, tile.category]));
  assert.equal(byId["tile-00"], "Boss");
  assert.equal(byId["tile-01"], "Boss");
  assert.equal(byId["tile-02"], "Skill");
  assert.equal(byId["tile-08"], "Skill");
  assert.equal(byId["tile-12"], "Other");
  assert.equal(byId["tile-03"], "Other");
  assert.equal(byId["tile-14"], "Other");
  assert.equal(byId["tile-20"], "Other");
  assert.equal(SEED_TEAMS.length, 4);
  assert.equal(new Set(SEED_TEAMS.map((team) => team.color)).size, 4);
});
