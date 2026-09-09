export const GUEST_COOKIE = "sanyuj_guest";
const GUEST_MAX_AGE = 60 * 60 * 24 * 30;

export function hasGuestCookie(cookieHeader: string | null | undefined) {
  return /(?:^|;\s*)sanyuj_guest=1(?:;|$)/.test(cookieHeader ?? "");
}

export function setGuestCookie(on: boolean) {
  if (typeof document === "undefined") return;
  document.cookie = on
    ? `${GUEST_COOKIE}=1; Path=/; Max-Age=${GUEST_MAX_AGE}; SameSite=Lax`
    : `${GUEST_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

const AUTH_REQUIRED = [
  /^\/app\/business(\/.*)?$/,
  /^\/app\/profile\/edit\/?$/,
];

export function isAuthRequiredPath(path: string) {
  return AUTH_REQUIRED.some((re) => re.test(path));
}

export function loginUrl(next?: string | null) {
  if (next && next.startsWith("/app")) {
    return `/auth/login?next=${encodeURIComponent(next)}`;
  }
  return "/auth/login";
}

export function postAuthPath(
  onboardingComplete: boolean | null | undefined,
  next: string | null | undefined,
) {
  if (!onboardingComplete) return "/auth/onboarding";
  if (next && next.startsWith("/app")) return next;
  return "/app";
}
