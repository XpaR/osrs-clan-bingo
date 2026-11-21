"use client";

import { useState } from "react";
import { isImageUrl } from "@/lib/format";

export function ProofImage({ url, alt }: { url: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (!url) return <p className="text-sm text-[#6b5436]">No screenshot linked yet.</p>;
  if (!isImageUrl(url) || failed) {
    return (
      <a className="text-sm font-bold text-[#6a3d12] underline" href={url} target="_blank" rel="noreferrer">
        Open proof
      </a>
    );
  }
  return (
    <a href={url} target="_blank" rel="noreferrer">
      {/* Proof links are chosen by the admin and are not a configured image host. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={alt}
        onError={() => setFailed(true)}
        className="max-h-72 w-full rounded-sm border border-[#6b542c] bg-black/10 object-contain"
        referrerPolicy="no-referrer"
      />
    </a>
  );
}
