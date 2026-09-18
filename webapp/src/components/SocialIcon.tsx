import Image from "next/image";

type SocialPlatform = "linkedin" | "instagram" | "x" | "facebook" | "youtube";

/** Brand-coloured marks; the enclosing link supplies the accessible label. */
export function SocialIcon({ platform }: { platform: SocialPlatform }) {
  return (
    <Image
      src={`/brand/social/${platform}.svg`}
      width={22}
      height={22}
      alt=""
      aria-hidden="true"
      unoptimized
    />
  );
}
