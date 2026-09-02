"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { displayPhone } from "@/lib/auth/phone";
import { visible } from "@/lib/db/visible";
import { postAuthPath, setGuestCookie } from "@/lib/auth/guest";

function OtpForm() {
  const router = useRouter();
  const params = useSearchParams();
  const phone = params.get("phone") ?? "";
  const hint = params.get("hint");
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const otp = useMemo(() => digits.join(""), [digits]);

  function setDigit(i: number, v: string) {
    const d = v.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = d;
    setDigits(next);
    if (d && i < 5) refs.current[i + 1]?.focus();
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp }),
      });
      const data = await res.json();
      if (res.status === 409 && data.restore_available) {
        const q = new URLSearchParams({ phone, restore: "1" });
        router.replace(`/auth/login?${q.toString()}`);
        return;
      }
      if (!res.ok) throw new Error(data.error || "Verification failed");

      const supabase = createClient();
      const { error: sessErr } = await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });
      if (sessErr) throw sessErr;

      const { data: profile } = await visible(
        supabase.from("profiles").select("onboarding_complete"),
      )
        .eq("id", data.session.user.id)
        .maybeSingle();

      setGuestCookie(false);
      router.replace(postAuthPath(profile?.onboarding_complete, params.get("next")));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center brand-gradient px-4 py-10">
      <div className="w-full max-w-lg rounded-[28px] border border-white/20 bg-white p-7 shadow-pop sm:p-10">
        <Link href="/auth/login" className="mb-5 inline-flex h-10 w-10 items-center justify-center rounded-[13px] border border-line bg-white shadow-card">
          ←
        </Link>
        <h1 className="font-display text-2xl font-extrabold">Verify your number</h1>
        <p className="mt-2 text-sm text-ink-soft">
          We&apos;ve sent a 6-digit code to{" "}
          <b className="text-ink">{phone ? displayPhone(phone) : "your phone"}</b>
        </p>
        {hint ? (
          <p className="mt-3 rounded-[14px] bg-green-soft px-3 py-2 text-xs font-bold text-green-deep">
            SMS bypassed — use code: {hint}
          </p>
        ) : null}

        <form onSubmit={verify} className="mt-6">
          <div className="flex gap-2">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                className={`aspect-square w-full rounded-[14px] border-[1.5px] text-center font-mono text-xl font-bold outline-none ${
                  d ? "border-blue-deep bg-blue-soft text-blue-deep" : "border-line bg-white"
                }`}
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => setDigit(i, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
                }}
              />
            ))}
          </div>
          {error ? <p className="mt-3 text-sm font-semibold text-rose">{error}</p> : null}
          <button type="submit" className="btn-primary mt-6" disabled={loading || otp.length < 6}>
            {loading ? "Verifying…" : "Verify & Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function OtpPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-ink-soft">Loading…</div>}>
      <OtpForm />
    </Suspense>
  );
}
