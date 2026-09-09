"use client";

import { useRef } from "react";

function initials(name: string | null | undefined) {
  if (!name?.trim()) return "📷";
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function BusinessAvatar({
  name,
  photoUrl,
  size = 48,
  className = "",
}: {
  name?: string | null;
  photoUrl?: string | null;
  size?: number;
  className?: string;
}) {
  const rounded = size >= 80 ? "rounded-[28px]" : size >= 52 ? "rounded-[16px]" : "rounded-[15px]";
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt=""
        width={size}
        height={size}
        className={`shrink-0 object-cover ${rounded} ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className={`flex shrink-0 items-center justify-center bg-teal-soft font-display font-bold text-teal ${rounded} ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(12, size * 0.32) }}
    >
      {initials(name)}
    </div>
  );
}

export function BusinessPhotoPicker({
  photoUrl,
  name,
  uploading,
  onPick,
  onRemove,
}: {
  photoUrl: string | null;
  name?: string;
  uploading?: boolean;
  onPick: (file: File) => void;
  onRemove?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="relative flex h-[88px] w-[88px] items-center justify-center rounded-[28px] border-2 border-dashed border-blue-deep bg-blue-soft text-blue-deep disabled:opacity-60"
        aria-label="Choose business photo"
      >
        <span className="absolute inset-0 overflow-hidden rounded-[26px]">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-2xl">
              {name?.trim() ? initials(name) : "📷"}
            </span>
          )}
        </span>
        <span className="absolute -bottom-1.5 -right-1.5 z-10 flex h-8 w-8 items-center justify-center rounded-[11px] border-[3px] border-white text-lg text-white grad-hero">
          {uploading ? "…" : photoUrl ? "✎" : "+"}
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) onPick(file);
        }}
      />
      <p className="mt-2.5 text-xs font-bold text-ink-soft">
        {uploading ? "Uploading photo…" : photoUrl ? "Change business photo" : "Add business photo"}
      </p>
      {photoUrl && onRemove ? (
        <button
          type="button"
          disabled={uploading}
          onClick={onRemove}
          className="mt-1 text-[11px] font-semibold text-rose disabled:opacity-60"
        >
          Remove photo
        </button>
      ) : null}
    </div>
  );
}
