import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Nunito } from "next/font/google";
import { RegisterPwa } from "@/components/RegisterPwa";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  weight: ["400", "500", "600", "700", "800", "900"],
  subsets: ["latin"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  weight: ["500", "600", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Sanyuj — Local help, right when you need it",
    template: "%s · Sanyuj",
  },
  description:
    "Find live local help nearby, or list your business free and get found by neighbours.",
  applicationName: "Sanyuj",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Sanyuj",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "any", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: [{ url: "/favicon.png", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#10549C" },
    { media: "(prefers-color-scheme: dark)", color: "#0E8094" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${nunito.variable} ${mono.variable} h-full`}>
      <body className="min-h-full antialiased">
        {children}
        <RegisterPwa />
      </body>
    </html>
  );
}
