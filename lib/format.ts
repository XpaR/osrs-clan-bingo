import type { TeamScore } from "./scoring";

export function eventPhase(startAt: string, endAt: string, nowIso: string): "upcoming" | "live" | "ended" {
  const now = new Date(nowIso).getTime();
  const start = new Date(startAt).getTime();
  const end = new Date(endAt).getTime();
  if (Number.isNaN(now) || Number.isNaN(start) || Number.isNaN(end)) return "live";
  if (now < start) return "upcoming";
  if (now > end) return "ended";
  return "live";
}

export function formatUtc(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const formatted = new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
  return `${formatted} UTC`;
}

export function formatRemaining(targetIso: string, nowIso: string): string {
  const ms = new Date(targetIso).getTime() - new Date(nowIso).getTime();
  if (Number.isNaN(ms)) return "";
  const minutesTotal = Math.max(0, Math.floor(Math.abs(ms) / 60000));
  const days = Math.floor(minutesTotal / (60 * 24));
  const hours = Math.floor((minutesTotal % (60 * 24)) / 60);
  const minutes = minutesTotal % 60;
  const parts: string[] = [];
  if (days) parts.push(`${days}d`);
  if (days || hours) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);
  return parts.join(" ");
}

export function inkFor(hex: string): string {
  const raw = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(raw)) return "#fffaf0";
  const value = Number.parseInt(raw, 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
  return luminance > 0.64 ? "#2a1c0e" : "#fffaf0";
}

export function isImageUrl(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
  } catch {
    return false;
  }
  return (
    /\.(png|jpe?g|gif|webp|bmp|avif)(\?|#|$)/i.test(url) ||
    /(?:imgur\.com|i\.redd\.it|cdn\.discordapp\.com|media\.discordapp\.net)/i.test(url)
  );
}

export function lineSummary(score: Pick<TeamScore, "rows" | "columns" | "diagonals" | "blackout">): string {
  const parts: string[] = [];
  if (score.rows) parts.push(`${score.rows} row${score.rows === 1 ? "" : "s"}`);
  if (score.columns) parts.push(`${score.columns} column${score.columns === 1 ? "" : "s"}`);
  if (score.diagonals) parts.push(`${score.diagonals} diagonal${score.diagonals === 1 ? "" : "s"}`);
  if (score.blackout) parts.push("blackout");
  return parts.join(", ");
}

export function totalBreakdown(score: Pick<TeamScore, "tilePoints" | "lineBonus" | "blackoutBonus" | "total">): string {
  const bits = [`${score.tilePoints} tile`];
  if (score.lineBonus) bits.push(`${score.lineBonus} lines`);
  if (score.blackoutBonus) bits.push(`${score.blackoutBonus} blackout`);
  return `${bits.join(" + ")} = ${score.total}`;
}

export function formatPlace(place: number): string {
  if (place === 1) return "1st";
  if (place === 2) return "2nd";
  if (place === 3) return "3rd";
  return `${place}th`;
}

export function toDatetimeLocal(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function cellLabel(position: number, size = 5): string {
  return `Row ${Math.floor(position / size) + 1}, column ${(position % size) + 1}`;
}
