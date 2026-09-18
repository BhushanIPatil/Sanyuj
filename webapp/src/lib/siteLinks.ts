// Social URLs are placeholders until the official profiles are configured.
// NEXT_PUBLIC values are embedded at build time; redeploy after changing them.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://sanyuj.vercel.app").replace(/\/$/, "");
export const SOCIAL_LINKS = [
  { name: "LinkedIn", key: "linkedin", url: process.env.NEXT_PUBLIC_LINKEDIN_URL || "https://example.com/sanyuj/linkedin" },
  { name: "Instagram", key: "instagram", url: process.env.NEXT_PUBLIC_INSTAGRAM_URL || "https://example.com/sanyuj/instagram" },
  { name: "X", key: "x", url: process.env.NEXT_PUBLIC_X_URL || "https://example.com/sanyuj/x" },
  { name: "Facebook", key: "facebook", url: process.env.NEXT_PUBLIC_FACEBOOK_URL || "https://example.com/sanyuj/facebook" },
  { name: "YouTube", key: "youtube", url: process.env.NEXT_PUBLIC_YOUTUBE_URL || "https://example.com/sanyuj/youtube" },
] as const;
