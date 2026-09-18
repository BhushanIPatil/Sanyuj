type SocialPlatform = "linkedin" | "instagram" | "x" | "facebook" | "youtube";

/** Small, dependency-free social marks; the enclosing link supplies its label. */
export function SocialIcon({ platform }: { platform: SocialPlatform }) {
  if (platform === "linkedin") return <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M5 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM3.3 9H6.7V21H3.3ZM9 9h3.3v1.6c.7-1.2 1.9-1.9 3.5-1.9 3.4 0 4.2 2.2 4.2 5.1V21h-3.4v-6.4c0-1.5-.3-2.7-1.9-2.7-1.8 0-2.3 1.4-2.3 3V21H9Z" /></svg>;
  if (platform === "instagram") return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg>;
  if (platform === "youtube") return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="4" /><path d="m10 9 5 3-5 3Z" fill="currentColor" stroke="none" /></svg>;
  if (platform === "facebook") return <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M14 22v-9h3l.5-3H14V8c0-1 .3-1.5 1.7-1.5H18V3.2c-.4-.1-1.8-.2-3-.2-3 0-5 1.8-5 5v2H7v3h3v9Z" /></svg>;
  return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="m4 3 12 18h4L8 3ZM20 3l-7 8M4 21l7-8" /></svg>;
}
