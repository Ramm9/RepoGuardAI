"use client";

import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";

import { cn } from "@/lib/utils";

/**
 * Avatar with a deterministic monogram fallback.
 *
 * GitHub avatars are remote images that can fail or be absent; the fallback is
 * derived from the username so the same person is always the same colour.
 */
function Avatar({
  className,
  size = "md",
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root> & {
  size?: "xs" | "sm" | "md" | "lg";
}) {
  const sizes = {
    xs: "size-5 text-[9px]",
    sm: "size-6 text-[10px]",
    md: "size-8 text-xs",
    lg: "size-10 text-sm",
  } as const;

  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(
        "relative flex shrink-0 overflow-hidden rounded-full",
        "ring-1 ring-border",
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}

function AvatarImage({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("aspect-square size-full object-cover", className)}
      {...props}
    />
  );
}

const MONOGRAM_TONES = [
  "bg-[#1c3a4a] text-[#7dd3fc]",
  "bg-[#25324a] text-[#a5b4fc]",
  "bg-[#2a2a44] text-[#c4b5fd]",
  "bg-[#1e3a35] text-[#6ee7b7]",
  "bg-[#3a3220] text-[#fcd34d]",
  "bg-[#3a2820] text-[#fdba74]",
] as const;

function monogramTone(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return MONOGRAM_TONES[hash % MONOGRAM_TONES.length];
}

function AvatarFallback({
  className,
  seed,
  children,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback> & {
  /** Value the fallback colour is derived from; usually the username. */
  seed?: string;
}) {
  const label =
    typeof children === "string" ? children.slice(0, 2).toUpperCase() : children;

  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "flex size-full items-center justify-center font-semibold uppercase",
        monogramTone(seed ?? (typeof children === "string" ? children : "rg")),
        className,
      )}
      {...props}
    >
      {label}
    </AvatarPrimitive.Fallback>
  );
}

export { Avatar, AvatarImage, AvatarFallback };
