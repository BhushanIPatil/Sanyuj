import Image from "next/image";

export function isImageUrl(value: string | null | undefined) {
  if (!value?.trim()) return false;
  const v = value.trim();
  return v.startsWith("http://") || v.startsWith("https://") || v.startsWith("/");
}

export function ImageOrEmoji({
  value,
  alt,
  size = 32,
  className = "",
}: {
  value: string | null | undefined;
  alt?: string;
  size?: number;
  className?: string;
}) {
  if (!value?.trim()) {
    return <span className={`text-ink-faint ${className}`}>—</span>;
  }

  if (isImageUrl(value)) {
    return (
      <span
        className={`relative inline-flex shrink-0 overflow-hidden rounded-[10px] border border-line bg-surface ${className}`}
        style={{ width: size, height: size }}
      >
        <Image
          src={value.trim()}
          alt={alt ?? "Image"}
          fill
          className="object-cover"
          unoptimized
        />
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center justify-center text-xl ${className}`} style={{ width: size, height: size }}>
      {value}
    </span>
  );
}

export function ImagePreview({
  src,
  alt,
  className = "",
  height = 160,
}: {
  src: string | null | undefined;
  alt?: string;
  className?: string;
  height?: number;
}) {
  if (!src?.trim() || !isImageUrl(src)) return null;

  return (
    <div
      className={`relative w-full overflow-hidden rounded-[16px] border border-line bg-surface ${className}`}
      style={{ height }}
    >
      <Image
        src={src.trim()}
        alt={alt ?? "Preview"}
        fill
        className="object-cover"
        unoptimized
      />
    </div>
  );
}
