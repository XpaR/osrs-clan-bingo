import type { Metadata } from "next";
import { RulesView } from "@/components/rules-view";
import { SiteFrame } from "@/components/site-frame";
import { getPublicState } from "@/lib/state";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata: Metadata = { title: "Event rules" };

export default function RulesPage() {
  const state = getPublicState();
  return (
    <SiteFrame event={state.event} now={state.serverTime}>
      <RulesView state={state} />
    </SiteFrame>
  );
}
