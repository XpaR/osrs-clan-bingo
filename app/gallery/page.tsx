import type { Metadata } from "next";
import { ProofGallery } from "@/components/proof-gallery";
import { getPublicState } from "@/lib/state";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata: Metadata = { title: "Proof gallery" };

export default function GalleryPage() {
  return <ProofGallery initial={getPublicState()} />;
}
