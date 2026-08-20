"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-[28px] border border-line bg-white p-7 shadow-pop sm:p-9">
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

        <form onSubmit={sendOtp} className="mt-6">
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
            {loading ? "Sending…" : "Send OTP"}
          </button>
        </form>
        <p className="mt-4 text-center text-xs leading-relaxed text-ink-faint">
          By continuing you agree to Sanyuj&apos;s Terms &amp; Privacy Policy
        </p>
      </div>
    </div>
  );
}
