import Image from "next/image";
import Link from "next/link";

const LOGO_SRC = "/brand/sanyuj-logo.png";
const LOGO_SCALE = 1.15;

type LogoMarkProps = {
  size?: number;
  scale?: number;
  className?: string;
  priority?: boolean;
};

export function SanyujLogoMark({
  size = 48,
  scale = LOGO_SCALE,
  className = "",
  priority,
}: LogoMarkProps) {
  const renderSize = Math.round(size * scale);

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src={LOGO_SRC}
        alt="Sanyuj"
        width={renderSize}
        height={renderSize}
        priority={priority}
        className="max-w-none object-contain"
        style={{ width: renderSize, height: renderSize }}
      />
    </span>
  );
}

type BrandProps = {
  href?: string;
  size?: number;
  showName?: boolean;
  nameClassName?: string;
  className?: string;
  priority?: boolean;
};

export function SanyujBrand({
  href,
  size = 48,
  showName = true,
  nameClassName = "font-display text-xl font-extrabold tracking-tight text-ink",
  className = "inline-flex items-center gap-2.5",
  priority,
}: BrandProps) {
  const content = (
    <span className={className}>
      <SanyujLogoMark size={size} priority={priority} />
      {showName ? <span className={nameClassName}>Sanyuj</span> : null}
    </span>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex">
        {content}
      </Link>
    );
  }

  return content;
}
