"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ProviderScene, SeekerScene, ValueLoop } from "@/components/LandingScenes";
import { SanyujBrand } from "@/components/SanyujLogo";

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden">
      <header
        className={`sticky top-0 z-40 transition-all duration-300 ${
          scrolled ? "border-b border-line bg-white/90 shadow-card backdrop-blur" : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <SanyujBrand href="/" size={52} priority />
          <Link
            href="/auth/login"
            className="rounded-full grad-hero px-5 py-2.5 text-sm font-bold text-white shadow-card"
          >
            Get started
          </Link>
        </div>
      </header>

      <main>
        {/* Hero — brand + one thought + living scene */}
        <section className="relative">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(46,134,214,0.22),transparent),radial-gradient(ellipse_70%_50%_at_90%_40%,rgba(31,174,122,0.16),transparent),radial-gradient(ellipse_60%_40%_at_10%_80%,rgba(14,165,165,0.12),transparent)]"
          />
          <div className="relative mx-auto grid max-w-5xl gap-12 px-5 pb-20 pt-10 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-16 lg:pb-28 lg:pt-16">
            <div className="land-fade-up text-center lg:text-left">
              <h1 className="font-display text-5xl font-black tracking-tight text-ink sm:text-6xl lg:text-[4.25rem]">
                Sanyuj
              </h1>
              <p className="mx-auto mt-4 max-w-sm font-display text-lg font-semibold leading-snug text-ink-soft sm:text-xl lg:mx-0">
                Local help. Right when you need it.
              </p>
              <div className="mt-8 flex justify-center lg:justify-start">
                <Link
                  href="/auth/login"
                  className="inline-flex rounded-full grad-hero px-8 py-3.5 text-sm font-bold text-white shadow-pop transition-transform hover:-translate-y-0.5"
                >
                  Open Sanyuj
                </Link>
              </div>
            </div>

            <div className="land-fade-up" style={{ animationDelay: "0.15s" }}>
              <SeekerScene />
            </div>
          </div>
        </section>

        {/* Product value — three beats, almost no copy */}
        <section className="border-y border-line/70 bg-white/55 py-16 sm:py-20">
          <div className="mx-auto max-w-5xl px-5 text-center">
            <h2 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">
              Need someone now?
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft sm:text-base">
              Post once. See who&apos;s interested. Call who&apos;s live nearby.
            </p>
            <div className="mt-10">
              <ValueLoop />
            </div>
          </div>
        </section>

        {/* Provider story */}
        <section className="relative py-16 sm:py-24">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(31,174,122,0.14),transparent_55%)]"
          />
          <div className="relative mx-auto grid max-w-5xl gap-12 px-5 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-16">
            <div className="order-2 lg:order-1">
              <ProviderScene />
            </div>
            <div className="order-1 text-center lg:order-2 lg:text-left">
              <h2 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">
                Have a skill?
              </h2>
              <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-ink-soft sm:text-base lg:mx-0">
                Free listing. Nearby jobs. Market yourself to your neighbourhood.
              </p>
              <Link
                href="/auth/login"
                className="mt-7 inline-flex rounded-full border border-line bg-white px-6 py-3 text-sm font-bold text-ink shadow-card transition-transform hover:-translate-y-0.5"
              >
                List for free
              </Link>
            </div>
          </div>
        </section>

        {/* Close */}
        <section className="px-5 pb-20 pt-4">
          <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[32px] grad-hero px-6 py-12 text-center text-white shadow-pop sm:px-12 sm:py-16">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/10 blur-2xl"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-24 -left-10 h-64 w-64 rounded-full bg-black/10 blur-2xl"
            />
            <p className="relative font-display text-2xl font-extrabold sm:text-3xl">
              Your neighbourhood, connected.
            </p>
            <p className="relative mx-auto mt-3 max-w-md text-sm text-white/85 sm:text-base">
              Find help. Get found. One account.
            </p>
            <Link
              href="/auth/login"
              className="relative mt-8 inline-flex rounded-full bg-white px-8 py-3.5 text-sm font-bold text-blue-deep shadow-card transition-transform hover:-translate-y-0.5"
            >
              Get started
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-white/80 py-8">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-5 text-sm text-ink-soft sm:flex-row sm:items-center sm:justify-between">
          <span className="font-display font-bold text-ink">Sanyuj</span>
          <nav className="flex flex-wrap gap-x-4 gap-y-2 font-semibold">
            <Link href="/terms" className="hover:text-blue-deep">
              Terms of Use
            </Link>
            <Link href="/privacy" className="hover:text-blue-deep">
              Privacy Policy
            </Link>
            <Link href="/help" className="hover:text-blue-deep">
              Help &amp; Support
            </Link>
          </nav>
          <span>© {new Date().getFullYear()} Sanyuj</span>
        </div>
      </footer>
    </div>
  );
}
