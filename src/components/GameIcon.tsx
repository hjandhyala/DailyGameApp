"use client";
import { useState } from "react";
import { category } from "@/lib/shared/categories";

export function GameIcon({ name, iconUrl, cat, size = 48 }: { name: string; iconUrl: string | null; cat: string; size?: number }) {
  const [broken, setBroken] = useState(false);
  const c = category(cat);
  const radius = Math.round(size * 0.28);
  if (iconUrl && !broken) {
    return (
      <span
        className="grid shrink-0 place-items-center overflow-hidden bg-white ring-1 ring-line"
        style={{ width: size, height: size, borderRadius: radius }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={iconUrl}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setBroken(true)}
          className="h-[78%] w-[78%] object-contain"
        />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center font-black text-white"
      style={{ width: size, height: size, borderRadius: radius, background: c.color, fontSize: size * 0.42 }}
    >
      {name.trim()[0]?.toUpperCase() ?? "?"}
    </span>
  );
}
