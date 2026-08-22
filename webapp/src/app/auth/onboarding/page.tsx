"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { detectLocation } from "@/lib/geo/location";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [fullName, setFullName] = useState("");
  const [pincode, setPincode] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationNote, setLocationNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchLocation = useCallback(async () => {
    setLocating(true);
    setError("");
    setLocationNote("Detecting your location…");
    try {
      const loc = await detectLocation();
      setAddress(loc.address);
      setLat(loc.lat);
      setLng(loc.lng);
      if (loc.pincode) {
        setPincode(loc.pincode);
        setLocationNote("Location detected — confirm or edit if needed.");
      } else {
        setLocationNote("Address found, but no pincode detected. Enter your 6-digit pincode.");
      }
    } catch (err) {
      setLocationNote("");
      setError(err instanceof Error ? err.message : "Could not detect location");
    } finally {
      setLocating(false);
    }
  }, []);

  useEffect(() => {
    if (step !== 2) return;
    void fetchLocation();
  }, [step, fetchLocation]);

  async function finish() {
    setLoading(true);
    setError("");
    try {
      if (pincode.length !== 6) throw new Error("Enter a valid 6-digit pincode");
      if (!address.trim()) throw new Error("Enter your address");

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const { error: updErr } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          pincode,
          address: address.trim(),
          lat,
          lng,
          onboarding_complete: true,
        })
        .eq("id", user.id)
        .eq("is_active", true)
        .eq("is_deleted", false);
      if (updErr) throw updErr;
      router.replace("/app");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-page px-4 py-10">
      <div className="w-full max-w-lg rounded-[28px] border border-line bg-white p-7 shadow-pop sm:p-10">
        <div className="mb-6 flex gap-1.5">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded ${s <= step ? "grad-hero" : "bg-line"}`}
            />
          ))}
        </div>

        {step === 1 && (
          <>
            <p className="text-[11px] font-bold uppercase tracking-wide text-green-deep">Step 1</p>
            <h1 className="mt-2 font-display text-2xl font-extrabold">What should we call you?</h1>
            <p className="mt-2 text-sm text-ink-soft">Your name helps neighbours trust you.</p>
            <label className="mb-2 mt-5 block text-xs font-bold">Full name</label>
            <input
              className="input-box"
              placeholder="Priya Deshmukh"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
            <button
              className="btn-primary mt-6"
              disabled={!fullName.trim()}
              onClick={() => setStep(2)}
            >
              Continue
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <button className="mb-4 text-sm font-bold text-blue-deep" onClick={() => setStep(1)}>
              ← Back
            </button>
            <p className="text-[11px] font-bold uppercase tracking-wide text-green-deep">Step 2</p>
            <h1 className="mt-2 font-display text-2xl font-extrabold">Where are you located?</h1>
            <p className="mt-2 text-sm text-ink-soft">
              We use your GPS to fill address and pincode so we can show help nearby.
            </p>

            <button
              type="button"
              className="mt-4 w-full rounded-[16px] border border-line bg-blue-soft px-3.5 py-3 text-sm font-bold text-blue-deep disabled:opacity-60"
              disabled={locating}
              onClick={() => void fetchLocation()}
            >
              {locating ? "Detecting location…" : "Use my current location"}
            </button>

            {locationNote ? (
              <div className="mt-3 rounded-[14px] bg-green-soft px-3.5 py-3 text-xs font-bold text-green-deep">
                {locationNote}
              </div>
            ) : null}

            <label className="mb-2 mt-5 block text-xs font-bold">Address</label>
            <textarea
              className="input-box min-h-[96px] resize-y"
              placeholder="House / street, area, city"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />

            <label className="mb-2 mt-4 block text-xs font-bold">Pincode</label>
            <input
              className="input-box font-mono text-base font-bold tracking-wide"
              inputMode="numeric"
              maxLength={6}
              placeholder="425001"
              value={pincode}
              onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            />

            {error ? <p className="mt-3 text-sm font-semibold text-rose">{error}</p> : null}
            <button
              className="btn-primary mt-6"
              disabled={loading || locating || pincode.length !== 6 || !address.trim()}
              onClick={() => void finish()}
            >
              {loading ? "Saving…" : "Continue to Sanyuj"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
