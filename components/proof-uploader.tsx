"use client";

import { useEffect, useRef, useState } from "react";
import { Lightbox, type LightboxImage } from "@/components/lightbox";
import { Button } from "@/components/ui/button";
import type { ProofImageRef, PublicState } from "@/lib/types";

const ACCEPT = "image/png,image/jpeg,image/webp,image/gif";
const MAX_BYTES = 10 * 1024 * 1024;

export function ProofUploader({
  teamId,
  tileId,
  tileName,
  note,
  marked,
  images,
  onBoard,
}: {
  teamId: string;
  tileId: string;
  tileName: string;
  note: string;
  marked: boolean;
  images: ProofImageRef[];
  onBoard: (state: PublicState, message: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<(files: File[]) => Promise<void>>(async () => {});
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const noteRef = useRef(note);
  noteRef.current = note;

  async function upload(files: File[]) {
    setError(null);
    const tooBig = files.find((file) => file.size > MAX_BYTES);
    if (tooBig) {
      setError("Each image must be 10MB or smaller.");
      return;
    }
    setBusy(true);
    try {
      let ready = marked;
      if (!ready) {
        const markedResponse = await fetch("/api/admin/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ teamId, tileId, note: noteRef.current }),
        });
        const markedBody = (await markedResponse.json()) as PublicState & { error?: string };
        if (!markedResponse.ok) {
          setError(markedBody.error || "Could not mark the tile.");
          return;
        }
        onBoard(markedBody, "Tile marked.");
        ready = true;
      }
      const body = new FormData();
      body.set("teamId", teamId);
      body.set("tileId", tileId);
      for (const file of files) body.append("files", file);
      const response = await fetch("/api/admin/proofs", { method: "POST", body });
      const data = (await response.json()) as PublicState & { error?: string };
      if (response.status === 401) {
        setError("The admin session expired. Log in again.");
        return;
      }
      if (!response.ok) {
        setError(data.error || "Upload failed.");
        return;
      }
      onBoard(data, files.length === 1 ? "Screenshot saved." : "Screenshots saved.");
    } catch {
      setError("The server could not be reached.");
    } finally {
      setBusy(false);
      setDragging(false);
    }
  }

  uploadRef.current = upload;

  useEffect(() => {
    function onPaste(event: ClipboardEvent) {
      const files = [...(event.clipboardData?.files ?? [])].filter((file) => file.type.startsWith("image/"));
      if (files.length === 0) return;
      event.preventDefault();
      void uploadRef.current(files);
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  async function remove(id: string) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/proofs/${id}`, { method: "DELETE" });
      const data = (await response.json()) as PublicState & { error?: string };
      if (!response.ok) {
        setError(data.error || "Could not remove that screenshot.");
        return;
      }
      onBoard(data, "Screenshot removed.");
      setLightbox(null);
    } catch {
      setError("The server could not be reached.");
    } finally {
      setBusy(false);
    }
  }

  const slides: LightboxImage[] = images.map((image, index) => ({
    src: image.url,
    alt: `${tileName} screenshot ${index + 1}`,
    caption: tileName,
  }));

  return (
    <div className="space-y-2">
      <div
        className={`rounded-sm border-2 border-dashed px-3 py-4 text-center ${dragging ? "border-[#c4963a] bg-[#fff4d2]" : "border-[#6b542c] bg-[#fff8e8]"}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          const files = [...event.dataTransfer.files];
          if (files.length) void upload(files);
        }}
      >
        <p className="text-sm font-semibold">Drop screenshots here, or paste from the clipboard.</p>
        <p className="mt-1 text-xs text-[#6d5638]">PNG, JPG, WEBP, or GIF. Up to 10MB each.</p>
        <Button className="mt-3" type="button" variant="outline" disabled={busy} onClick={() => inputRef.current?.click()}>
          {busy ? "Uploading..." : "Choose images"}
        </Button>
        <input
          ref={inputRef}
          className="sr-only"
          type="file"
          accept={ACCEPT}
          multiple
          onChange={(event) => {
            const files = [...(event.target.files ?? [])];
            event.target.value = "";
            if (files.length) void upload(files);
          }}
        />
      </div>
      {images.length > 0 ? (
        <ul className="grid grid-cols-3 gap-2">
          {images.map((image, index) => (
            <li key={image.id} className="relative">
              <button type="button" className="block w-full" onClick={() => setLightbox(index)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.url} alt="" className="aspect-square w-full rounded-sm border border-[#6b542c] object-cover" />
              </button>
              <button
                type="button"
                className="absolute top-1 right-1 min-h-9 rounded-sm bg-[#2a1c0e] px-2 text-xs font-bold text-[#f6e7c2]"
                onClick={() => void remove(image.id)}
                disabled={busy}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-[#6d5638]">{marked ? "No screenshots on this mark yet." : "Marking happens automatically if you upload first."}</p>
      )}
      {error ? <p className="text-sm font-semibold text-[#9d2c2c]">{error}</p> : null}
      {lightbox !== null ? (
        <Lightbox images={slides} index={lightbox} onIndex={setLightbox} onClose={() => setLightbox(null)} />
      ) : null}
    </div>
  );
}
