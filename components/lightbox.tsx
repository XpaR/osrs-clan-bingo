"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export interface LightboxImage {
  src: string;
  alt: string;
  caption?: string;
}

export function Lightbox({
  images,
  index,
  onIndex,
  onClose,
}: {
  images: LightboxImage[];
  index: number;
  onIndex: (index: number) => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [zoomed, setZoomed] = useState(false);
  const image = images[index];

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    dialog.showModal();
  }, []);

  useEffect(() => {
    setZoomed(false);
  }, [index]);

  if (!image) return null;

  function step(delta: number) {
    onIndex((index + delta + images.length) % images.length);
  }

  return (
    <dialog
      ref={dialogRef}
      className="lightbox m-0 h-[100dvh] max-h-[100dvh] w-screen max-w-none border-0 bg-transparent p-0 text-[#f6e7c2] backdrop:bg-black/80"
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          <p className="min-w-0 truncate text-sm">{image.caption}</p>
          <div className="flex shrink-0 gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={() => setZoomed((value) => !value)}>
              {zoomed ? "Fit" : "Zoom"}
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
        <div className={`min-h-0 flex-1 ${zoomed ? "overflow-auto" : "grid place-items-center overflow-hidden px-3"}`}>
          {/* Proof files are served by this app, not a remote image host. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image.src}
            alt={image.alt}
            className={zoomed ? "mx-auto w-[160%] max-w-none" : "max-h-[78dvh] max-w-full object-contain"}
          />
        </div>
        {images.length > 1 ? (
          <div className="flex items-center justify-between gap-2 px-3 py-3">
            <Button type="button" variant="secondary" onClick={() => step(-1)}>
              Previous
            </Button>
            <p className="text-sm">
              {index + 1} / {images.length}
            </p>
            <Button type="button" variant="secondary" onClick={() => step(1)}>
              Next
            </Button>
          </div>
        ) : (
          <div className="h-3" />
        )}
      </div>
    </dialog>
  );
}
