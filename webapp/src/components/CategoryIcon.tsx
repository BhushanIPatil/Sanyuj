"use client";

import { useState } from "react";
import { isCategoryImageUrl } from "@/lib/categories";

type Size = "tile" | "chip" | "avatar";

const box: Record<Size, string> = {
  tile: "h-12 w-12 text-xl",
  chip: "h-5 w-5 shrink-0 text-sm",
  avatar: "h-11 w-11 text-base",
};

export function CategoryIcon({
  value,
  alt = "",
  fallback = "•",
  size = "tile",
}: {
  value: string | null | undefined;
  alt?: string;
  fallback?: string;
  size?: Size;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = !failed && isCategoryImageUrl(value);

  return (
    <span className={`inline-flex items-center justify-center overflow-hidden ${box[size]}`}>
      {showImage ? (
        // Arbitrary URLs from the emoji column; next/image needs a fixed remote host list.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={value!.trim()}
          alt={alt}
          className="h-full w-full object-contain"
          onError={() => setFailed(true)}
        />
      ) : (
        (value && !isCategoryImageUrl(value) ? value : fallback)
      )}
    </span>
  );
}
