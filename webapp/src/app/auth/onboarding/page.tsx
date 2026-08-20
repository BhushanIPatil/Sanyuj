"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Landmark = {
  id: string;
  name: string;
  area_label: string | null;
  city: string;
  pincode: string;
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [fullName, setFullName] = useState("");
  const [pincode, setPincode] = useState("425001");
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [landmarkId, setLandmarkId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (step !== 2) return;
    const run = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("landmarks")
        .select("*")
        .eq("pincode", pincode)
        .order("name");
      setLandmarks(data ?? []);
      setNote(
        data && data.length
          ? `Found ${data.length} landmarks for ${pincode}${data[0]?.city ? `, ${data[0].city}` : ""}`
          : "No landmarks for this pincode yet — you can still continue.",
      );
      if (data?.[0]) setLandmarkId(data[0].id);
    };
    void run();
  }, [step, pincode]);

  async function finish() {
    setLoading(true);
    setError("");
    try {
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
          landmark_id: landmarkId || null,
          onboarding_complete: true,
        })
        .eq("id", user.id);
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
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-[28px] border border-line bg-white p-7 shadow-pop sm:p-9">
        <div className="mb-6 flex gap-1.5">
          {[1, 2, 3].map((s) => (
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
            <h1 className="font-display text-2xl font-extrabold">Where are you located?</h1>
            <p className="mt-2 text-sm text-ink-soft">
              This helps us show help nearby, and connect you with nearby customers if you list a
              business.
            </p>
            <label className="mb-2 mt-5 block text-xs font-bold">Pincode</label>
            <input
              className="input-box font-mono text-base font-bold tracking-wide"
              inputMode="numeric"
              maxLength={6}
              value={pincode}
              onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            />
            {note ? (
              <div className="mt-4 flex items-center gap-2 rounded-[14px] bg-green-soft px-3.5 py-3 text-xs font-bold text-green-deep">
                ✓ {note}
              </div>
            ) : null}
            <button
              className="btn-primary mt-6"
              disabled={pincode.length !== 6}
              onClick={() => setStep(3)}
            >
              Continue
            </button>
          </>
        )}

        {step === 3 && (
          <>
            <button className="mb-4 text-sm font-bold text-blue-deep" onClick={() => setStep(2)}>
              ← Back
            </button>
            <h1 className="font-display text-2xl font-extrabold">Select your landmark</h1>
            <p className="mt-2 text-sm text-ink-soft">Pick the closest one — this helps match accurately.</p>
            <div className="mt-4 max-h-72 space-y-2.5 overflow-y-auto">
              {landmarks.map((lm) => (
                <button
                  key={lm.id}
                  type="button"
                  onClick={() => setLandmarkId(lm.id)}
                  className={`flex w-full items-center gap-3 rounded-[16px] border-[1.5px] p-3.5 text-left ${
                    landmarkId === lm.id
                      ? "border-blue-deep bg-blue-soft"
                      : "border-line bg-white"
                  }`}
                >
                  <span
                    className={`h-4.5 w-4.5 rounded-full border-2 ${
                      landmarkId === lm.id ? "border-blue-deep bg-blue-deep" : "border-line"
                    }`}
                  />
                  <span>
                    <span className="block text-sm font-bold">{lm.name}</span>
                    <span className="font-mono text-[11px] text-ink-soft">
                      {lm.pincode} · {lm.area_label ?? lm.city}
                    </span>
                  </span>
                </button>
              ))}
              {!landmarks.length ? (
                <p className="text-sm text-ink-soft">No landmarks listed — continue with pincode only.</p>
              ) : null}
            </div>
            {error ? <p className="mt-3 text-sm font-semibold text-rose">{error}</p> : null}
            <button className="btn-primary mt-6" disabled={loading} onClick={() => void finish()}>
              {loading ? "Saving…" : "Continue to Sanyuj"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
