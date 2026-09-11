import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sanyuj - Offers and notifications",
    short_name: "Sanyuj",
    description:
      "Discover offers and local announcements without an account.",
    start_url: "/app/offerly",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#ecf3f1",
    theme_color: "#10549C",
    categories: ["lifestyle", "news", "shopping"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
