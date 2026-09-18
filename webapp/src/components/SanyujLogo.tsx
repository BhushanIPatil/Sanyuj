import Image from "next/image";
import Link from "next/link";

/** Full lockup with gradient background baked in (icon + white wordmark). */
const LOGO_SRC = "/brand/sanyuj-lockup.png";
const LOGO_ASPECT = 736 / 763;

type LogoMarkProps = {
  /** Render height of the logo, in pixels. */
  size?: number;
  className?: string;
  priority?: boolean;
};

export function SanyujLogoMark({
  size = 48,
  className = "",
  priority,
}: LogoMarkProps) {
  const height = size;
  const width = Math.round(height * LOGO_ASPECT);

  return (
    <Image
      src={LOGO_SRC}
      alt="Sanyuj"
      width={width}
      height={height}
      priority={priority}
      className={`inline-block shrink-0 object-contain ${className}`}
      style={{ width, height }}
    />
  );
}

type BrandProps = {
  /** Transparent mark with a separate wordmark for light headers. */
  light?: boolean;
  href?: string;
  size?: number;
  /** @deprecated Lockup asset includes gradient; kept for call-site compatibility. */
  plate?: boolean;
  showName?: boolean;
  nameClassName?: string;
  className?: string;
  priority?: boolean;
};

export function SanyujBrand({
  light = false,
  href,
  size = 48,
  showName = false,
  nameClassName = "font-display text-xl font-extrabold tracking-tight text-ink",
  className = "inline-flex items-center gap-2.5",
  priority,
}: BrandProps) {
  const content = (
    <span className={className}>
      {light ? <Image src="/brand/sanyuj-mark.png" alt={showName ? "" : "Sanyuj"} width={size} height={size} priority={priority} className="shrink-0 object-contain" style={{ width: size, height: size }} /> : <SanyujLogoMark size={size} priority={priority} />}
      {showName ? <span className={nameClassName}>Sanyuj</span> : null}
    </span>
  );

  if (href) {
    return (
      <Link href={href} aria-label="Sanyuj" className="inline-flex shrink-0">
        {content}
      </Link>
    );
  }

  return content;
}
