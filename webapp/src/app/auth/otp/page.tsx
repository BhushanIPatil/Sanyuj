"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function OtpRedirect() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const q = new URLSearchParams();
    const next = params.get("next");
    if (next) q.set("next", next);
    const email = params.get("email");
    if (email) q.set("email", email);
    const suffix = q.toString();
    router.replace(suffix ? `/auth/login?${suffix}` : "/auth/login");
  }, [params, router]);

  return <div className="p-10 text-center text-ink-soft">Redirecting to email login…</div>;
}

/** Phone OTP page retired — email + password is the only auth path. */
export default function OtpPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-ink-soft">Loading…</div>}>
      <OtpRedirect />
    </Suspense>
  );
}
