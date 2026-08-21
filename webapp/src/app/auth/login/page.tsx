"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Mode = "login" | "register" | "otp";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function applySession(session: {
    access_token: string;
    refresh_token: string;
    user: { id: string };
  }) {
    const supabase = createClient();
    const { error: sessErr } = await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });
    if (sessErr) throw sessErr;

    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_complete")
      .eq("id", session.user.id)
      .maybeSingle();

    router.replace(profile?.onboarding_complete ? "/app" : "/auth/onboarding");
    router.refresh();
  }

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (mode === "register" && password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const endpoint = mode === "register" ? "/api/auth/register" : "/api/auth/login";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Authentication failed");
      await applySession(data.session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send OTP");
      const q = new URLSearchParams({ phone: data.phone });
      if (data.dev_otp) q.set("hint", data.dev_otp);
      router.push(`/auth/otp?${q.toString()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-page px-4 py-10">
      <div className="w-full max-w-lg rounded-[28px] border border-line bg-white p-7 shadow-pop sm:p-10">
        <Link href="/" className="inline-flex items-center gap-2">
          <span className="flex h-11 w-11 items-center justify-center rounded-[14px] grad-hero text-white">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M3 12l9-8 9 8" />
              <path d="M6 10v10h12V10" />
            </svg>
          </span>
          <span className="font-display text-xl font-extrabold">Sanyuj</span>
        </Link>
        <h1 className="mt-6 font-display text-2xl font-extrabold">Welcome</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          One account for everything — find trusted local help, or list your own business for free.
        </p>

        {mode !== "otp" ? (
          <>
            <div className="mt-6 grid grid-cols-2 gap-1 rounded-[16px] border border-line bg-surface p-1">
              <button
                type="button"
                className={`rounded-[12px] py-2.5 text-sm font-bold transition ${
                  mode === "login" ? "bg-white text-ink shadow-card" : "text-ink-soft"
                }`}
                onClick={() => {
                  setMode("login");
                  setError("");
                }}
              >
                Log in
              </button>
              <button
                type="button"
                className={`rounded-[12px] py-2.5 text-sm font-bold transition ${
                  mode === "register" ? "bg-white text-ink shadow-card" : "text-ink-soft"
                }`}
                onClick={() => {
                  setMode("register");
                  setError("");
                }}
              >
                Create account
              </button>
            </div>

            <form onSubmit={submitPassword} className="mt-5">
              <label className="mb-2 block text-xs font-bold">Mobile Number</label>
              <div className="flex overflow-hidden rounded-[18px] border-[1.5px] border-line bg-white focus-within:border-blue-deep">
                <span className="border-r border-line px-3 py-3.5 font-mono text-sm font-bold text-ink-soft">
                  +91
                </span>
                <input
                  className="flex-1 px-3 py-3.5 font-mono text-[15px] font-semibold outline-none"
                  inputMode="numeric"
                  placeholder="98230 12345"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^\d\s]/g, "").slice(0, 12))}
                  required
                  autoComplete="tel"
                />
              </div>

              <label className="mb-2 mt-4 block text-xs font-bold">Password</label>
              <input
                type="password"
                className="w-full rounded-[18px] border-[1.5px] border-line bg-white px-3 py-3.5 text-[15px] font-semibold outline-none focus:border-blue-deep"
                placeholder={mode === "register" ? "At least 6 characters" : "Your password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={mode === "register" ? "new-password" : "current-password"}
              />

              {mode === "register" ? (
                <>
                  <label className="mb-2 mt-4 block text-xs font-bold">Confirm password</label>
                  <input
                    type="password"
                    className="w-full rounded-[18px] border-[1.5px] border-line bg-white px-3 py-3.5 text-[15px] font-semibold outline-none focus:border-blue-deep"
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                </>
              ) : null}

              {error ? <p className="mt-3 text-sm font-semibold text-rose">{error}</p> : null}
              <button type="submit" className="btn-primary mt-5" disabled={loading}>
                {loading
                  ? mode === "register"
                    ? "Creating…"
                    : "Signing in…"
                  : mode === "register"
                    ? "Create account"
                    : "Log in"}
              </button>
            </form>

            <button
              type="button"
              className="mt-4 w-full text-center text-sm font-semibold text-blue-deep"
              onClick={() => {
                setMode("otp");
                setError("");
                setPassword("");
                setConfirmPassword("");
              }}
            >
              Continue with OTP instead
            </button>
          </>
        ) : (
          <>
            <form onSubmit={sendOtp} className="mt-6">
              <p className="mb-4 rounded-[14px] bg-blue-soft px-3 py-2 text-xs font-semibold text-blue-deep">
                SMS is bypassed for now — you&apos;ll get a fixed code on the next screen.
              </p>
              <label className="mb-2 block text-xs font-bold">Mobile Number</label>
              <div className="flex overflow-hidden rounded-[18px] border-[1.5px] border-line bg-white focus-within:border-blue-deep">
                <span className="border-r border-line px-3 py-3.5 font-mono text-sm font-bold text-ink-soft">
                  +91
                </span>
                <input
                  className="flex-1 px-3 py-3.5 font-mono text-[15px] font-semibold outline-none"
                  inputMode="numeric"
                  placeholder="98230 12345"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^\d\s]/g, "").slice(0, 12))}
                  required
                />
              </div>
              {error ? <p className="mt-3 text-sm font-semibold text-rose">{error}</p> : null}
              <button type="submit" className="btn-primary mt-5" disabled={loading}>
                {loading ? "Sending…" : "Continue with OTP"}
              </button>
            </form>
            <button
              type="button"
              className="mt-4 w-full text-center text-sm font-semibold text-blue-deep"
              onClick={() => {
                setMode("login");
                setError("");
              }}
            >
              Back to password login
            </button>
          </>
        )}

        <p className="mt-4 text-center text-xs leading-relaxed text-ink-faint">
          By continuing you agree to Sanyuj&apos;s Terms &amp; Privacy Policy
        </p>
      </div>
    </div>
  );
}
