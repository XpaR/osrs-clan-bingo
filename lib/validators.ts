import type { Difficulty } from "./types";

export function cleanName(value: unknown, label: string, max: number): string {
  const name = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!name) throw new Error(`${label} is required.`);
  if (name.length > max) throw new Error(`${label} must be ${max} characters or fewer.`);
  return name;
}

export function cleanText(value: unknown, max: number): string {
  const text = String(value ?? "").trim();
  if (text.length > max) throw new Error(`That text must be ${max} characters or fewer.`);
  return text;
}

export function cleanColor(value: unknown): string {
  const color = String(value ?? "").trim();
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
    throw new Error("Colour must be a hex value like #1f9d55.");
  }
  return color.toLowerCase();
}

export function cleanMembers(value: unknown): string[] {
  const source = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[\n,]/)
      : null;
  if (!source) throw new Error("Members should be a list of names.");
  const names = source.map((entry) => String(entry).trim()).filter(Boolean);
  if (names.length > 16) throw new Error("A team can list up to 16 members.");
  for (const name of names) {
    if (name.length > 20) throw new Error("Member names must be 20 characters or fewer.");
  }
  return names;
}

export function cleanPoints(value: unknown): number {
  const points = Number(value);
  if (!Number.isInteger(points) || points < 0 || points > 50) {
    throw new Error("Points must be a whole number from 0 to 50.");
  }
  return points;
}

export function cleanBonus(value: unknown, label: string): number {
  const amount = Number(value);
  if (!Number.isInteger(amount) || amount < 0 || amount > 100) {
    throw new Error(`${label} must be a whole number from 0 to 100.`);
  }
  return amount;
}

export function cleanDifficulty(value: unknown): Difficulty {
  const difficulty = String(value ?? "");
  if (difficulty === "easy" || difficulty === "medium" || difficulty === "hard" || difficulty === "free") {
    return difficulty;
  }
  throw new Error("Difficulty must be easy, medium, hard, or free.");
}

export function cleanIcon(value: unknown): string {
  const icon = String(value ?? "").trim();
  if (!icon) return "⭐";
  if (/^https?:\/\//i.test(icon)) {
    return cleanProof(icon);
  }
  if (icon.length > 16) throw new Error("Icon must be a short emoji or an image link.");
  return icon;
}

export function cleanProof(value: unknown): string {
  const proof = String(value ?? "").trim();
  if (!proof) return "";
  if (proof.length > 500) throw new Error("That link must be 500 characters or fewer.");
  let url: URL;
  try {
    url = new URL(proof);
  } catch {
    throw new Error("Proof must be a full http or https link.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Proof must be a full http or https link.");
  }
  return proof;
}

export function cleanNote(value: unknown): string {
  const note = String(value ?? "").trim();
  if (note.length > 280) throw new Error("Notes must be 280 characters or fewer.");
  return note;
}

export function cleanIso(value: unknown, label: string): string {
  const raw = String(value ?? "").trim();
  const date = new Date(raw);
  if (!raw || Number.isNaN(date.getTime())) throw new Error(`${label} is not a valid date.`);
  return date.toISOString();
}
