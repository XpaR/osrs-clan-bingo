import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";

const dir = mkdtempSync(path.join(tmpdir(), "bingo-db-"));
process.env.DATABASE_PATH = path.join(dir, "bingo.sqlite");

test("seeded sqlite board matches the scorer and survives mark, unmark, and reset", async () => {
  const { closeDb, getDb } = await import("./db");
  const { getPublicState } = await import("./state");
  const { markTile, resetProgress, unmarkTile } = await import("./mutations");
  try {
    const state = getPublicState();
    assert.equal(state.teams.length, 4);
    assert.equal(state.tiles.length, 25);
    assert.equal(state.tiles.filter((tile) => tile.isFree).length, 1);
    assert.equal(state.event.name, "Serpent Cup Bingo");
    assert.equal(state.event.chatPassword, "serpentscale");
    assert.equal(state.event.bonuses.blackout, 25);
    const totals = Object.fromEntries(state.leaderboard.map((row) => [row.teamId, row.total]));
    assert.deepEqual(totals, {
      "team-zulrah": 30,
      "team-bandos": 21,
      "team-vorkath": 17,
      "team-jad": 14,
    });
    assert.equal(state.leaderboard[0].place, 1);
    assert.equal(state.leaderboard[0].columns, 1);
    assert.equal(state.activity[0].action, "complete");

    const db = getDb();
    unmarkTile(db, { teamId: "team-zulrah", tileId: "tile-07" });
    const afterUnmark = getPublicState();
    const zulrah = afterUnmark.leaderboard.find((row) => row.teamId === "team-zulrah");
    assert.equal(zulrah?.tilePoints, 17);
    assert.equal(zulrah?.lineBonus, 0);
    assert.equal(zulrah?.total, 17);
    assert.equal(afterUnmark.leaderboard[0].teamId, "team-bandos");
    assert.equal(afterUnmark.activity[0].action, "uncomplete");

    markTile(db, {
      teamId: "team-zulrah",
      tileId: "tile-07",
      note: "Shard back on the board.",
      proofUrl: "https://example.com/shard.png",
    });
    const restored = getPublicState();
    const zulrahAgain = restored.leaderboard.find((row) => row.teamId === "team-zulrah");
    assert.equal(zulrahAgain?.total, 30);
    const proof = restored.completions.find(
      (completion) => completion.teamId === "team-zulrah" && completion.tileId === "tile-07",
    );
    assert.equal(proof?.proofUrl, "https://example.com/shard.png");
    assert.equal(proof?.note, "Shard back on the board.");

    assert.throws(
      () => markTile(db, { teamId: "team-jad", tileId: "tile-06", proofUrl: "javascript:alert(1)" }),
      /http/,
    );
    assert.throws(() => markTile(db, { teamId: "team-jad", tileId: "tile-12" }), /free/i);

    resetProgress(db);
    const cleared = getPublicState();
    assert.equal(cleared.completions.length, 0);
    for (const row of cleared.leaderboard) {
      assert.equal(row.total, 0);
      assert.equal(row.filled, 1);
    }
    assert.equal(cleared.teams.length, 4);
    assert.equal(cleared.tiles.length, 25);
    assert.equal(cleared.activity[0].message.includes("cleared"), true);
  } finally {
    closeDb();
    rmSync(dir, { recursive: true, force: true });
  }
});
