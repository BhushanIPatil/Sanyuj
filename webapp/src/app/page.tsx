"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen">
      <header
        className={`sticky top-0 z-40 transition-all ${
          scrolled ? "bg-white/90 backdrop-blur border-b border-line shadow-card" : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-[14px] grad-hero text-white shadow-card">
              <HomeGlyph />
            </span>
            <span className="font-display text-xl font-800 font-extrabold tracking-tight text-ink">
              Sanyuj
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="hidden sm:inline text-sm font-semibold text-ink-soft hover:text-ink"
            >
              Log in
            </Link>
            <Link
              href="/auth/login"
              className="rounded-full grad-hero px-5 py-2.5 text-sm font-bold text-white shadow-card"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(46,134,214,0.18),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(31,174,122,0.16),transparent_45%)]" />
          <div className="relative mx-auto grid max-w-6xl gap-10 px-5 pb-16 pt-10 lg:grid-cols-2 lg:items-center lg:pb-24 lg:pt-16">
            <div>
              <p className="eyebrow text-green-deep">Hyperlocal · India</p>
              <h1 className="mt-3 font-display text-4xl font-extrabold leading-[1.1] tracking-tight text-ink sm:text-5xl lg:text-[3.4rem]">
                Sanyuj
              </h1>
              <p className="mt-4 max-w-md text-base leading-relaxed text-ink-soft sm:text-lg">
                Find trusted local help near your pincode — or list your business for free and get
                job requests from neighbours.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/auth/login"
                  className="rounded-full grad-hero px-7 py-3.5 text-sm font-bold text-white shadow-pop"
                >
                  Sign up / Log in
                </Link>
                <a
                  href="#how"
                  className="rounded-full border border-line bg-white px-7 py-3.5 text-sm font-bold text-ink shadow-card"
                >
                  How it works
                </a>
              </div>
              <p className="mt-5 text-xs text-ink-faint">
                Free to use · Phone OTP · One account for customers &amp; providers
              </p>
            </div>

            <div className="relative mx-auto w-full max-w-[380px]">
              <div className="rounded-[36px] bg-[#0f1720] p-3 shadow-pop">
                <div className="overflow-hidden rounded-[28px] bg-white">
                  <div className="flex items-center justify-between px-5 py-3 font-mono text-xs font-semibold">
                    <span>9:41</span>
                    <span className="text-ink-faint">Sanyuj</span>
                  </div>
                  <div className="grad-hero mx-4 mb-4 rounded-[22px] p-5 text-white">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-white/75">
                      Near you now
                    </p>
                    <p className="mt-2 font-display text-lg font-bold leading-snug">
                      Plumbers &amp; electricians live in your pincode
                    </p>
                    <div className="mt-4 inline-flex rounded-full bg-white px-3 py-1.5 text-xs font-bold text-blue-deep">
                      Call in one tap
                    </div>
                  </div>
                  <div className="space-y-2.5 px-4 pb-6">
                    {[
                      ["RP", "Ramesh Patil", "Plumber · 0.6 km"],
                      ["SC", "Suresh C.", "Electrician · 0.9 km"],
                      ["OK", "Om Karpe", "Carpenter · 1.1 km"],
                    ].map(([av, name, meta]) => (
                      <div
                        key={name}
                        className="flex items-center gap-3 rounded-[16px] border border-line bg-white p-3 shadow-card"
                      >
                        <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-blue-soft font-display text-sm font-bold text-blue-deep">
                          {av}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold">{name}</p>
                          <p className="text-xs text-ink-soft">{meta}</p>
                        </div>
                        <span className="rounded-full bg-green-soft px-2 py-1 text-[10px] font-bold text-green-deep">
                          LIVE
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="how" className="border-t border-line/80 bg-white/70 py-16">
          <div className="mx-auto max-w-6xl px-5">
            <h2 className="font-display text-2xl font-bold text-ink sm:text-3xl">How Sanyuj works</h2>
            <p className="mt-2 max-w-xl text-ink-soft">
              Built for Indian neighbourhoods — match by pincode and address, then call directly.
            </p>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {[
                {
                  t: "Post what you need",
                  d: "Describe the job, set a budget and urgency. Nearby providers see it instantly.",
                },
                {
                  t: "Providers send interest",
                  d: "Local businesses respond with interest. You see who is nearby and ready.",
                },
                {
                  t: "Call & close",
                  d: "Call the right person, get the work done, and close the job — simple.",
                },
              ].map((item, i) => (
                <div key={item.t} className="rounded-[22px] border border-line bg-white p-6 shadow-card">
                  <div className="font-mono text-sm font-bold text-blue-deep">0{i + 1}</div>
                  <h3 className="mt-3 font-display text-lg font-bold">{item.t}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">{item.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="mx-auto max-w-6xl px-5">
            <div className="overflow-hidden rounded-[28px] grad-hero p-8 text-white shadow-pop sm:p-12">
              <h2 className="font-display text-2xl font-bold sm:text-3xl">Have a skill or a shop?</h2>
              <p className="mt-3 max-w-lg text-white/90">
                List your business free on Sanyuj, open the job feed, and Go Live when you are
                working in an area.
              </p>
              <Link
                href="/auth/login"
                className="mt-6 inline-flex rounded-full bg-white px-6 py-3 text-sm font-bold text-blue-deep"
              >
                Create free account
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-white/80 py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 text-sm text-ink-soft sm:flex-row sm:items-center sm:justify-between">
          <span className="font-display font-bold text-ink">Sanyuj</span>
          <span>© {new Date().getFullYear()} Sanyuj. Trusted local connections.</span>
        </div>
      </footer>
    </div>
  );
}

function HomeGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 12l9-8 9 8" />
      <path d="M6 10v10h12V10" />
      <path d="M10 20v-6h4v6" />
    </svg>
  );
}
