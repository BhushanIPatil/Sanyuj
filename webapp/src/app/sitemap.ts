import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/siteLinks";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["/", "/about", "/faq", "/help", "/contact", "/app", "/app/offerly", "/app/notifications", "/app/requests", "/privacy", "/terms"].map(path => ({ url: SITE_URL + path }));
}
