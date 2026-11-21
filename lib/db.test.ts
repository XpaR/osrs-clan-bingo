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
  const { markTile, resetProgress, swapTiles, unmarkTile } = await import("./mutations");
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
    swapTiles(db, "tile-02", "tile-00");
    const swapped = getPublicState();
    assert.equal(swapped.tiles.find((tile) => tile.id === "tile-02")?.position, 0);
    assert.equal(swapped.tiles.find((tile) => tile.id === "tile-00")?.position, 2);
    assert.equal(new Set(swapped.tiles.map((tile) => tile.position)).size, 25);
    const zulrahSwapped = swapped.leaderboard.find((row) => row.teamId === "team-zulrah");
    assert.equal(zulrahSwapped?.tilePoints, 25);
    assert.equal(zulrahSwapped?.columns, 0);
    assert.equal(zulrahSwapped?.total, 25);
    swapTiles(db, "tile-02", "tile-00");
    const restoredBoard = getPublicState();
    assert.equal(restoredBoard.tiles.find((tile) => tile.id === "tile-02")?.position, 2);
    assert.equal(restoredBoard.leaderboard.find((row) => row.teamId === "team-zulrah")?.total, 30);
    assert.throws(() => swapTiles(db, "tile-02", "missing"), /board/);

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
    });
    const restored = getPublicState();
    const zulrahAgain = restored.leaderboard.find((row) => row.teamId === "team-zulrah");
    assert.equal(zulrahAgain?.total, 30);
    const proof = restored.completions.find(
      (completion) => completion.teamId === "team-zulrah" && completion.tileId === "tile-07",
    );
    assert.ok(proof);
    assert.equal(proof.note, "Shard back on the board.");
    assert.deepEqual(proof.images, []);

    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    );
    const { addProofImages, deleteProofImage, readProofFile } = await import("./proofs");
    addProofImages(db, { completionId: proof.id, files: [png, png] });
    const withShots = getPublicState().completions.find((completion) => completion.id === proof.id);
    assert.equal(withShots?.images.length, 2);
    const stored = readProofFile(db, withShots!.images[0].id);
    assert.equal(stored?.mime, "image/png");
    deleteProofImage(db, withShots!.images[0].id);
    const afterDelete = getPublicState().completions.find((completion) => completion.id === proof.id);
    assert.equal(afterDelete?.images.length, 1);
    assert.throws(() => addProofImages(db, { completionId: proof.id, files: [Buffer.from("not an image")] }), /PNG/);
    assert.throws(
      () => addProofImages(db, { completionId: proof.id, files: [Buffer.alloc(10 * 1024 * 1024 + 1)] }),
      /10MB/,
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
    assert.equal(getPublicState().completions.every((completion) => completion.images.length === 0), true);
  } finally {
    closeDb();
    rmSync(dir, { recursive: true, force: true });
  }
});
