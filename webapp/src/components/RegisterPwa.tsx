"use client";

import { useEffect } from "react";

export function RegisterPwa() {
  useEffect(() => {
    // Erase credentials saved by earlier public-app versions on this origin.
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (url) {
        const key = "sb-" + new URL(url).hostname.split(".")[0] + "-auth-token";
        for (const storage of [localStorage, sessionStorage]) {
          storage.removeItem(key);
          storage.removeItem(key + "-code-verifier");
        }
      }
    } catch { /* Storage may be disabled by the browser. */ }
    if (!("serviceWorker" in navigator)) return;
    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.warn("[PWA] service worker registration failed", err);
      });
    };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}
