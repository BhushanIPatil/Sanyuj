"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { visible } from "@/lib/db/visible";
import { postAuthPath, setGuestCookie, isAuthRequiredPath } from "@/lib/auth/guest";
import { SanyujBrand } from "@/components/SanyujLogo";

type Mode = "login" | "register" | "restore" | "forgot";
type OtpPurpose = "signup" | "restore" | "reset";
type Step = "form" | "otp" | "new-password";

type SessionPayload = {
  access_token: string;
  refresh_token: string;
  user: { id: string };
};

const SPAM_TIP =
  "If you don't see the email, check Spam / Junk (and Promotions). The code expires after a short time.";

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
  const [mode, setMode] = useState<Mode>(
    params.get("restore") === "1" ? "restore" : params.get("forgot") === "1" ? "forgot" : "login",
  );
  const [step, setStep] = useState<Step>("form");
  const [email, setEmail] = useState(() => (params.get("email") ?? "").trim());
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpPurpose, setOtpPurpose] = useState<OtpPurpose>("signup");
  const [resetSession, setResetSession] = useState<SessionPayload | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [unfinished, setUnfinished] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data: profile } = await visible(
        supabase.from("profiles").select("onboarding_complete"),
      )
        .eq("id", user.id)
        .maybeSingle();
      if (profile && profile.onboarding_complete !== true) {
        setUnfinished(true);
      }
    });
  }, []);

  async function applySession(session: SessionPayload) {
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

  async function continueAsGuest() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setGuestCookie(true);
    const next = params.get("next");
    window.location.assign(
      next && next.startsWith("/app") && !isAuthRequiredPath(next) ? next : "/app",
    );
  }

  function resetAuthState(nextMode: Mode = "login") {
    setMode(nextMode);
    setStep("form");
    setOtp("");
    setOtpPurpose("signup");
    setResetSession(null);
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
    setError("");
    setInfo("");
  }

  function enterRestore() {
    setMode("restore");
    setStep("form");
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
    setOtp("");
    setError("");
    setInfo("An account already exists with this email. Set a new password and verify the code we send.");
  }

  function enterOtp(purpose: OtpPurpose, sentEmail: string) {
    setEmail(sentEmail);
    setOtpPurpose(purpose);
    setOtp("");
    setStep("otp");
    setError("");
    setInfo(`We sent a 6-digit code to ${sentEmail}. ${SPAM_TIP}`);
  }

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");

    if ((mode === "register" || mode === "restore") && password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      if (mode === "forgot") {
        const res = await fetch("/api/auth/send-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            purpose: "reset",
            redirectTo: `${window.location.origin}/auth/login`,
          }),
        });
        const data = await res.json();
        if (res.status === 409 && data.restore_available) {
          enterRestore();
          return;
        }
        if (!res.ok) throw new Error(data.error || "Could not send reset code");
        enterOtp("reset", (data.email as string | undefined) || email.trim().toLowerCase());
        return;
      }

      const endpoint =
        mode === "restore"
          ? "/api/auth/restore"
          : mode === "register"
            ? "/api/auth/register"
            : "/api/auth/login";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          redirectTo: `${window.location.origin}/auth/login`,
        }),
      });
      const data = await res.json();
      if (res.status === 409 && data.restore_available) {
        enterRestore();
        return;
      }
      if (res.status === 403 && (data.otp_required || data.confirmation_required)) {
        enterOtp("signup", (data.email as string | undefined) || email.trim().toLowerCase());
        await fetch("/api/auth/send-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: (data.email as string | undefined) || email,
            purpose: "signup",
            redirectTo: `${window.location.origin}/auth/login`,
          }),
        });
        return;
      }
      if (!res.ok) throw new Error(data.error || "Authentication failed");
      if (data.otp_sent || data.confirmation_sent) {
        enterOtp(
          (data.purpose as OtpPurpose | undefined) || (mode === "restore" ? "restore" : "signup"),
          (data.email as string | undefined) || email.trim().toLowerCase(),
        );
        return;
      }
      await applySession(data.session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function submitOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          token: otp.trim(),
          purpose: otpPurpose,
          password: otpPurpose === "restore" ? password : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid or expired code");

      if (otpPurpose === "reset") {
        setResetSession(data.session as SessionPayload);
        setPassword("");
        setConfirmPassword("");
        setShowPassword(false);
        setShowConfirmPassword(false);
        setStep("new-password");
        setInfo("Code verified. Choose a new password to finish.");
        return;
      }

      await applySession(data.session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function submitNewPassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (!resetSession) {
      setError("Verify the email code before setting a new password");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          access_token: resetSession.access_token,
          refresh_token: resetSession.refresh_token,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not update password");

      const supabase = createClient();
      await supabase.auth.signOut();
      resetAuthState("login");
      setInfo("Password updated. Log in with your new password.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function resendOtp() {
    if (loading) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          purpose: otpPurpose,
          redirectTo: `${window.location.origin}/auth/login`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not resend code");
      setInfo(`We sent a new 6-digit code to ${email}. ${SPAM_TIP}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const title =
    step === "otp"
      ? "Enter verification code"
      : step === "new-password"
        ? "Set new password"
        : mode === "restore"
          ? "Restore your account"
          : mode === "forgot"
            ? "Forgot password"
            : "Welcome";

  const subtitle =
    step === "otp"
      ? `Enter the 6-digit code sent to ${email}.`
      : step === "new-password"
        ? "Enter and confirm your new password."
        : mode === "restore"
          ? "An account already exists with this email. Set a new password to restore it — we’ll email a verification code."
          : mode === "forgot"
            ? "Enter your email and we’ll send a 6-digit code to reset your password."
            : mode === "register"
              ? "One account for everything — find trusted local help, or list your own business for free."
              : "";

  const submitLabel =
    loading
      ? step === "otp"
        ? "Verifying…"
        : step === "new-password"
          ? "Saving…"
          : mode === "restore"
            ? "Sending code…"
            : mode === "register"
              ? "Creating…"
              : mode === "forgot"
                ? "Sending…"
                : "Signing in…"
      : step === "otp"
        ? "Verify code"
        : step === "new-password"
          ? "Update password"
          : mode === "restore"
            ? "Send restore code"
            : mode === "register"
              ? "Create account"
              : mode === "forgot"
                ? "Send reset code"
                : "Log in";

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-page px-4 py-10">
      <div className="w-full max-w-lg rounded-[28px] border border-line bg-white p-7 shadow-pop sm:p-10">
        <div className="mb-6 flex justify-center">
          <SanyujBrand href="/" size={112} priority />
        </div>
        <h1 className="font-display text-2xl font-extrabold">{title}</h1>
        {subtitle ? <p className="mt-2 text-sm leading-relaxed text-ink-soft">{subtitle}</p> : null}

        {info ? (
          <div className="mt-4 rounded-[14px] bg-blue-soft px-3.5 py-3 text-sm font-semibold leading-relaxed text-blue-deep">
            {info}
          </div>
        ) : null}

        {unfinished && step === "form" && mode === "login" ? (
          <div className="mt-4 rounded-[14px] bg-blue-soft px-3.5 py-3 text-sm font-semibold leading-relaxed text-blue-deep">
            You already started an account.{" "}
            <button
              type="button"
              className="font-bold underline"
              onClick={() => router.replace("/auth/onboarding")}
            >
              Finish setup
            </button>
            , or continue as guest below.
          </div>
        ) : null}

        {step === "form" && mode !== "restore" && mode !== "forgot" ? (
          <div className="mt-6 grid grid-cols-2 gap-1 rounded-[16px] border border-line bg-surface p-1">
            <button
              type="button"
              className={`rounded-[12px] py-2.5 text-sm font-bold transition ${
                mode === "login" ? "bg-white text-ink shadow-card" : "text-ink-soft"
              }`}
              onClick={() => resetAuthState("login")}
            >
              Log in
            </button>
            <button
              type="button"
              className={`rounded-[12px] py-2.5 text-sm font-bold transition ${
                mode === "register" ? "bg-white text-ink shadow-card" : "text-ink-soft"
              }`}
              onClick={() => resetAuthState("register")}
            >
              Create account
            </button>
          </div>
        ) : null}

        {step === "form" && mode === "restore" ? (
          <div className="mt-6 rounded-[14px] bg-blue-soft px-3.5 py-3 text-sm font-semibold leading-relaxed text-blue-deep">
            Do you want to restore this account? Choose a new password — we’ll email a code to confirm.
          </div>
        ) : null}

        {step === "form" ? (
          <form onSubmit={submitPassword} className="mt-5">
            <label className="mb-2 block text-xs font-bold">Email</label>
            <input
              type="email"
              className="w-full rounded-[18px] border-[1.5px] border-line bg-white px-3 py-3.5 text-[15px] font-semibold outline-none focus:border-blue-deep"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              readOnly={mode === "restore"}
            />

            {mode !== "forgot" ? (
              <>
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
                {mode === "login" ? (
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      className="text-sm font-semibold text-blue-deep"
                      onClick={() => resetAuthState("forgot")}
                    >
                      Forgot password?
                    </button>
                  </div>
                ) : null}
              </>
            ) : null}

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
        ) : null}

        {step === "otp" ? (
          <form onSubmit={submitOtp} className="mt-5">
            <label className="mb-2 block text-xs font-bold">6-digit code</label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              className="w-full rounded-[18px] border-[1.5px] border-line bg-white px-3 py-3.5 text-center text-[22px] font-bold tracking-[0.35em] outline-none focus:border-blue-deep"
              placeholder="••••••"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              required
            />
            {error ? <p className="mt-3 text-sm font-semibold text-rose">{error}</p> : null}
            <button type="submit" className="btn-primary mt-5" disabled={loading || otp.length !== 6}>
              {submitLabel}
            </button>
            <button
              type="button"
              className="mt-3 w-full text-center text-sm font-semibold text-blue-deep"
              onClick={() => void resendOtp()}
              disabled={loading}
            >
              Resend code
            </button>
            <button
              type="button"
              className="mt-2 w-full text-center text-sm font-semibold text-ink-soft"
              onClick={() => {
                setStep("form");
                setOtp("");
                setResetSession(null);
                setError("");
                setInfo("");
              }}
              disabled={loading}
            >
              Back
            </button>
          </form>
        ) : null}

        {step === "new-password" ? (
          <form onSubmit={submitNewPassword} className="mt-5">
            <label className="mb-2 block text-xs font-bold">New password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                className="w-full rounded-[18px] border-[1.5px] border-line bg-white px-3 py-3.5 pr-12 text-[15px] font-semibold outline-none focus:border-blue-deep"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
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

            <label className="mb-2 mt-4 block text-xs font-bold">Confirm new password</label>
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

            {error ? <p className="mt-3 text-sm font-semibold text-rose">{error}</p> : null}
            <button type="submit" className="btn-primary mt-5" disabled={loading}>
              {submitLabel}
            </button>
          </form>
        ) : null}

        {step === "form" && (mode === "restore" || mode === "forgot") ? (
          <button
            type="button"
            className="mt-4 w-full text-center text-sm font-semibold text-blue-deep"
            onClick={() => resetAuthState(mode === "restore" ? "register" : "login")}
          >
            {mode === "restore" ? "Back to create account" : "Back to log in"}
          </button>
        ) : null}

        <p className="mt-4 text-center text-xs leading-relaxed text-ink-faint">
          By continuing you agree to Sanyuj&apos;s{" "}
          <Link href="/terms" className="font-semibold text-ink-soft underline-offset-2 hover:underline">
            Terms of Use
          </Link>{" "}
          &amp;{" "}
          <Link href="/privacy" className="font-semibold text-ink-soft underline-offset-2 hover:underline">
            Privacy Policy
          </Link>
        </p>

        {step === "form" && mode !== "forgot" ? (
          <>
            <div className="mt-6 flex items-center gap-3">
              <span className="h-px flex-1 bg-line" />
              <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">or</span>
              <span className="h-px flex-1 bg-line" />
            </div>
            <button
              type="button"
              className="mt-4 w-full rounded-[18px] border-[1.5px] border-line bg-white py-3.5 text-sm font-bold text-ink shadow-card transition hover:border-blue-deep"
              onClick={() => void continueAsGuest()}
            >
              Continue as guest
            </button>
            <p className="mt-2 text-center text-[11px] text-ink-faint">
              Browse providers nearby. Log in when you want to list a business.
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}
