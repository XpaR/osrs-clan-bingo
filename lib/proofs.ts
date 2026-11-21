import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type Database from "better-sqlite3";

export const MAX_PROOF_BYTES = 10 * 1024 * 1024;
export const MAX_PROOFS_PER_TILE = 8;

const EXT_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

export function proofsDirectory() {
  const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "bingo.sqlite");
  return path.join(path.dirname(dbPath), "proofs");
}

export function sniffImage(bytes: Buffer): { mime: string; ext: string } | null {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return { mime: "image/png", ext: "png" };
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mime: "image/jpeg", ext: "jpg" };
  }
  if (bytes.length >= 6) {
    const header = bytes.subarray(0, 6).toString("ascii");
    if (header === "GIF87a" || header === "GIF89a") return { mime: "image/gif", ext: "gif" };
  }
  if (
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return { mime: "image/webp", ext: "webp" };
  }
  return null;
}

function safeFilename(filename: string) {
  return /^[0-9a-f-]{36}\.(png|jpg|webp|gif)$/i.test(filename);
}

export function unlinkProofFiles(filenames: string[]) {
  const directory = proofsDirectory();
  for (const filename of filenames) {
    if (!safeFilename(filename)) continue;
    fs.rmSync(path.join(directory, filename), { force: true });
  }
}

export function forgetProofFiles(db: Database.Database) {
  const table = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'proof_images'").get();
  if (!table) return;
  const rows = db.prepare("SELECT filename FROM proof_images").all() as { filename: string }[];
  unlinkProofFiles(rows.map((row) => row.filename));
}

export function proofImageUrl(id: string) {
  return `/api/proofs/${id}`;
}

export interface StoredProof {
  id: string;
  completionId: string;
  filename: string;
  mime: string;
  bytes: number;
  createdAt: string;
}

export function addProofImages(
  db: Database.Database,
  input: { completionId: string; files: Buffer[] },
) {
  if (input.files.length === 0) throw new Error("Choose at least one image.");
  const prepared = input.files.map((bytes) => {
    if (bytes.length > MAX_PROOF_BYTES) throw new Error("Each image must be 10MB or smaller.");
    const sniffed = sniffImage(bytes);
    if (!sniffed || !EXT_BY_MIME[sniffed.mime]) {
      throw new Error("Images must be PNG, JPG, WEBP, or GIF.");
    }
    return { bytes, ...sniffed };
  });
  const existing = db.prepare("SELECT COUNT(*) AS count FROM proof_images WHERE completion_id = ?").get(input.completionId) as {
    count: number;
  };
  if (existing.count + prepared.length > MAX_PROOFS_PER_TILE) {
    throw new Error(`A tile can hold up to ${MAX_PROOFS_PER_TILE} screenshots for one team.`);
  }
  fs.mkdirSync(proofsDirectory(), { recursive: true });
  const written: string[] = [];
  try {
    const insert = db.prepare(
      `INSERT INTO proof_images (id, completion_id, filename, mime, bytes, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    );
    const apply = db.transaction(() => {
      for (const file of prepared) {
        const id = randomUUID();
        const filename = `${id}.${file.ext}`;
        const fullPath = path.join(proofsDirectory(), filename);
        fs.writeFileSync(fullPath, file.bytes);
        written.push(filename);
        insert.run(id, input.completionId, filename, file.mime, file.bytes.length, new Date().toISOString());
      }
      db.prepare("UPDATE event SET revision = revision + 1 WHERE id = 1").run();
    });
    apply();
  } catch (error) {
    unlinkProofFiles(written);
    throw error;
  }
}

export function deleteProofImage(db: Database.Database, id: string) {
  const row = db.prepare("SELECT filename FROM proof_images WHERE id = ?").get(id) as { filename: string } | undefined;
  if (!row) throw new Error("That screenshot is already gone.");
  const apply = db.transaction(() => {
    db.prepare("DELETE FROM proof_images WHERE id = ?").run(id);
    db.prepare("UPDATE event SET revision = revision + 1 WHERE id = 1").run();
  });
  apply();
  unlinkProofFiles([row.filename]);
}

export function proofFilesForCompletions(db: Database.Database, completionIds: string[]) {
  if (completionIds.length === 0) return [];
  const placeholders = completionIds.map(() => "?").join(", ");
  const rows = db.prepare(`SELECT filename FROM proof_images WHERE completion_id IN (${placeholders})`).all(...completionIds) as {
    filename: string;
  }[];
  return rows.map((row) => row.filename);
}

export function readProofFile(db: Database.Database, id: string) {
  const row = db.prepare("SELECT filename, mime FROM proof_images WHERE id = ?").get(id) as
    | { filename: string; mime: string }
    | undefined;
  if (!row || !safeFilename(row.filename)) return null;
  const directory = path.resolve(proofsDirectory());
  const fullPath = path.resolve(directory, row.filename);
  if (!fullPath.startsWith(directory + path.sep)) return null;
  if (!fs.existsSync(fullPath)) return null;
  return { mime: row.mime, bytes: fs.readFileSync(fullPath) };
}
