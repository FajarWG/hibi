"use client";

import { cn } from "@/lib/utils";

/**
 * Avatar reaktif-audio. Lingkaran yang membesar mengikuti amplitudo suara AI.
 * Placeholder ringan yang bisa diverifikasi lewat build; slot ini dirancang
 * agar avatar VRM 3D (aset di read-japan/public/models) bisa dipasang nanti
 * tanpa mengubah TalkRoom.
 */
export function Avatar({
  amplitude,
  active,
}: {
  amplitude: number;
  active: boolean;
}) {
  const scale = 1 + Math.min(0.5, amplitude * 2);
  return (
    <div
      className="relative flex h-52 items-center justify-center"
      aria-hidden
    >
      <div
        className="absolute size-32 rounded-full bg-primary/15 transition-transform duration-100 ease-out"
        style={{ transform: `scale(${scale})` }}
      />
      <div
        className={cn(
          "absolute size-24 rounded-full transition-colors",
          active ? "bg-primary/30" : "bg-muted",
        )}
        style={{ transform: `scale(${1 + Math.min(0.25, amplitude)})` }}
      />
      <div
        className={cn(
          "size-16 rounded-full transition-colors",
          active ? "bg-primary" : "bg-muted-foreground/40",
        )}
      />
    </div>
  );
}
