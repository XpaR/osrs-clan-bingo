import { PublicBoard } from "@/components/public-board";
import { getPublicState } from "@/lib/state";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function HomePage() {
  const state = getPublicState();
  return <PublicBoard initial={state} />;
}
