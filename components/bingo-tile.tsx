import type { ButtonHTMLAttributes, CSSProperties } from "react";
import { difficultyColor } from "@/lib/format";
import type { PublicTile } from "@/lib/types";
import { cn } from "@/lib/utils";

export function BingoTile({
  tile,
  marks,
  bigMarkColor,
  dim = false,
  onLine = false,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  tile: PublicTile;
  marks: { name: string; color: string }[];
  bigMarkColor?: string | null;
  dim?: boolean;
  onLine?: boolean;
}) {
  const marked = marks.map((mark) => mark.name).join(", ");
  const label = [
    tile.name,
    tile.isFree ? "Free space, filled for every team." : `${tile.points} points.`,
    marked ? `Marked by ${marked}.` : "No team marks yet.",
  ].join(" ");

  return (
    <button
      type="button"
      className={cn("parchment-tile", dim && "is-dim", onLine && "is-line", className)}
      data-done={bigMarkColor ? "true" : "false"}
      style={
        {
          "--diff": difficultyColor(tile.difficulty),
          "--mark": bigMarkColor ?? "transparent",
        } as CSSProperties
      }
      aria-label={label}
      title={tile.name}
      {...props}
    >
      <span className="points-badge">{tile.isFree ? "FREE" : tile.points}</span>
      <span className="tile-icon" aria-hidden="true">
        {tile.icon.startsWith("http") ? (
          // User-supplied tile art can be any remote image.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={tile.icon} alt="" />
        ) : (
          tile.icon
        )}
      </span>
      <span className="tile-name line-clamp-3">{tile.name}</span>
      <span className="tile-marks">
        {marks.map((mark) => (
          <span key={mark.name} className="team-x" style={{ color: mark.color }} title={mark.name}>
            X
          </span>
        ))}
      </span>
    </button>
  );
}
