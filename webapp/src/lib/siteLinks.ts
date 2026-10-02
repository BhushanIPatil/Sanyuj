// NEXT_PUBLIC values are embedded at build time; redeploy after changing them.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://sanyuj.vercel.app").replace(/\/$/, "");
