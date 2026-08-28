"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Suspense, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { visible } from "@/lib/db/visible";
import { postAuthPath, setGuestCookie, isAuthRequiredPath } from "@/lib/auth/guest";
import { SanyujBrand } from "@/components/SanyujLogo";

type Mode = "login" | "register" | "otp" | "restore";

function digitsFromPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  return digits.slice(0, 10);
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-ink-soft">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<Mode>(params.get("restore") === "1" ? "restore" : "login");
  const [phone, setPhone] = useState(() => {
    const raw = params.get("phone") ?? "";
    return raw ? digitsFromPhone(raw) : "";
  });
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

    const { data: profile } = await visible(supabase.from("profiles").select("onboarding_complete"))
      .eq("id", session.user.id)
      .maybeSingle();

    setGuestCookie(false);
    router.replace(postAuthPath(profile?.onboarding_complete, params.get("next")));
    router.refresh();
  }

  function continueAsGuest() {
    setGuestCookie(true);
    const next = params.get("next");
    window.location.assign(
      next && next.startsWith("/app") && !isAuthRequiredPath(next) ? next : "/app",
    );
  }

  function enterRestore() {
    setMode("restore");
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
    setError("");
  }

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if ((mode === "register" || mode === "restore") && password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const endpoint =
        mode === "restore"
          ? "/api/auth/restore"
          : mode === "register"
            ? "/api/auth/register"
            : "/api/auth/login";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });
      const data = await res.json();
      if (res.status === 409 && data.restore_available) {
        enterRestore();
        return;
      }
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
      const next = params.get("next");
      if (next) q.set("next", next);
      router.push(`/auth/otp?${q.toString()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const submitLabel =
    loading
      ? mode === "restore"
        ? "Restoring…"
        : mode === "register"
          ? "Creating…"
          : "Signing in…"
      : mode === "restore"
        ? "Restore account"
        : mode === "register"
          ? "Create account"
          : "Log in";

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-page px-4 py-10">
      <div className="w-full max-w-lg rounded-[28px] border border-line bg-white p-7 shadow-pop sm:p-10">
        <SanyujBrand href="/" size={56} priority />
        <h1 className="mt-6 font-display text-2xl font-extrabold">
          {mode === "restore" ? "Restore your account" : "Welcome"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          {mode === "restore"
            ? "An account already exists with this contact. Set a new password to restore it."
            : "One account for everything — find trusted local help, or list your own business for free."}
        </p>

        {mode !== "otp" ? (
          <>
            {mode !== "restore" ? (
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
            ) : (
              <div className="mt-6 rounded-[14px] bg-blue-soft px-3.5 py-3 text-sm font-semibold leading-relaxed text-blue-deep">
                Do you want to restore this account? Choose a new password below.
              </div>
            )}

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
                  readOnly={mode === "restore"}
                />
              </div>

              <label className="mb-2 mt-4 block text-xs font-bold">
                {mode === "restore" ? "New password" : "Password"}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className="w-full rounded-[18px] border-[1.5px] border-line bg-white px-3 py-3.5 pr-12 text-[15px] font-semibold outline-none focus:border-blue-deep"
                  placeholder={
                    mode === "restore" || mode === "register"
                      ? "At least 6 characters"
                      : "Your password"
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center px-3.5 text-ink-soft transition hover:text-ink"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} strokeWidth={1.8} /> : <Eye size={18} strokeWidth={1.8} />}
                </button>
              </div>

              {mode === "register" || mode === "restore" ? (
                <>
                  <label className="mb-2 mt-4 block text-xs font-bold">Confirm password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      className="w-full rounded-[18px] border-[1.5px] border-line bg-white px-3 py-3.5 pr-12 text-[15px] font-semibold outline-none focus:border-blue-deep"
                      placeholder="Re-enter password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 flex items-center px-3.5 text-ink-soft transition hover:text-ink"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={18} strokeWidth={1.8} />
                      ) : (
                        <Eye size={18} strokeWidth={1.8} />
                      )}
                    </button>
                  </div>
                </>
              ) : null}

              {error ? <p className="mt-3 text-sm font-semibold text-rose">{error}</p> : null}
              <button type="submit" className="btn-primary mt-5" disabled={loading}>
                {submitLabel}
              </button>
            </form>

            {mode === "restore" ? (
              <button
                type="button"
                className="mt-4 w-full text-center text-sm font-semibold text-blue-deep"
                onClick={() => {
                  setMode("register");
                  setError("");
                }}
              >
                Back to create account
              </button>
            ) : (
              <button
                type="button"
                className="mt-4 w-full text-center text-sm font-semibold text-blue-deep"
                onClick={() => {
                  setMode("otp");
                  setError("");
                  setPassword("");
                  setConfirmPassword("");
                  setShowPassword(false);
                  setShowConfirmPassword(false);
                }}
              >
                Continue with OTP instead
              </button>
            )}
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

        <div className="mt-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-line" />
          <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">or</span>
          <span className="h-px flex-1 bg-line" />
        </div>
        <button
          type="button"
          className="mt-4 w-full rounded-[18px] border-[1.5px] border-line bg-white py-3.5 text-sm font-bold text-ink shadow-card transition hover:border-blue-deep"
          onClick={continueAsGuest}
        >
          Continue as guest
        </button>
        <p className="mt-2 text-center text-[11px] text-ink-faint">
          Browse providers nearby. Log in when you want to post a job.
        </p>
      </div>
    </div>
  );
}
