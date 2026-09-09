"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SanyujBrand } from "@/components/SanyujLogo";
import { PasswordInput } from "@/components/PasswordInput";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(
    searchParams.get("error") === "unauthorized"
      ? "You do not have admin access."
      : "",
  );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { data, error: signInErr } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInErr || !data.user) {
      setError(signInErr?.message ?? "Could not sign in.");
      setLoading(false);
      return;
    }

    const { data: admin } = await supabase
      .from("admins")
      .select("id")
      .eq("id", data.user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (!admin) {
      await supabase.auth.signOut();
      setError("This account is not authorized for admin access.");
      setLoading(false);
      return;
    }

    const next = searchParams.get("next") || "/dashboard";
    router.push(next);
    router.refresh();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-page px-4 py-10">
      <div className="w-full max-w-md rounded-[28px] border border-line bg-white p-7 shadow-pop">
        <div className="mb-6 flex justify-center">
          <SanyujBrand size={112} priority />
        </div>
        <h1 className="text-center font-display text-2xl font-bold">Sign in</h1>
        <p className="mt-2 text-center text-sm text-ink-soft">
          Use your admin email and password.
        </p>

        <form onSubmit={(e) => void onSubmit(e)} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-ink-soft">Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              className="input-box"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-ink-soft">Password</span>
            <PasswordInput
              value={password}
              onChange={setPassword}
              required
              autoComplete="current-password"
              className="input-box pr-12"
            />
          </label>
          {error ? (
            <p className="rounded-[14px] bg-rose-soft px-3 py-2 text-sm font-semibold text-rose">
              {error}
            </p>
          ) : null}
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
