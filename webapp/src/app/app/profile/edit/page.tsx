"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { displayPhone } from "@/lib/auth/phone";
import { detectLocation } from "@/lib/geo/location";
import { LocalityPicker } from "@/components/LocalityPicker";
import { useToast } from "@/components/Toast";
import { visible } from "@/lib/db/visible";
import { EditProfileSkeleton } from "@/components/ui/Skeleton";

export default function EditProfilePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [pincode, setPincode] = useState("");
  const [locality, setLocality] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationNote, setLocationNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/auth/login");
        return;
      }
      const { data: prof } = await visible(
        supabase.from("profiles").select("full_name, phone, pincode, locality, address, lat, lng"),
      )
        .eq("id", user.id)
        .single();
      if (!prof) {
        showToast("Could not load profile");
        return;
      }
      setPhone(prof.phone ?? "");
      setFullName(prof.full_name ?? "");
      setPincode(prof.pincode ?? "");
      setLocality(prof.locality ?? "");
      setAddress(prof.address ?? "");
      setLat(prof.lat ?? null);
      setLng(prof.lng ?? null);
      setReady(true);
    };
    void load();
  }, [router, showToast]);

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
        setLocality("");
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

  async function save() {
    setLoading(true);
    setError("");
    try {
      if (!fullName.trim()) throw new Error("Enter your full name");
      if (pincode.length !== 6) throw new Error("Enter a valid 6-digit pincode");
      if (!locality.trim()) throw new Error("Select your locality");
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
          locality: locality.trim(),
          address: address.trim(),
          lat,
          lng,
        })
        .eq("id", user.id)
        .eq("is_active", true)
        .eq("is_deleted", false);
      if (updErr) throw updErr;

      showToast("Profile updated");
      router.replace("/app/profile");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setLoading(false);
    }
  }

  if (!ready) {
    return <EditProfileSkeleton />;
  }

  return (
    <div className="page-pad max-w-2xl">
      <header className="mb-4 flex items-center gap-3">
        <Link
          href="/app/profile"
          className="flex h-10 w-10 items-center justify-center rounded-[13px] border border-line bg-white shadow-card"
        >
          ←
        </Link>
        <div>
          <p className="eyebrow">Account</p>
          <h1 className="font-display text-lg font-bold">Edit profile</h1>
        </div>
      </header>

      <label className="mb-2 block text-xs font-bold">Full name</label>
      <input
        className="input-box"
        placeholder="Priya Deshmukh"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        autoComplete="name"
      />

      <label className="mb-2 mt-5 block text-xs font-bold">Mobile number</label>
      <input
        className="input-box font-mono text-ink-soft"
        value={phone ? displayPhone(phone) : ""}
        disabled
        readOnly
      />
      <p className="mt-1.5 text-[11px] text-ink-faint">Phone number can’t be changed.</p>

      <div className="mt-6 border-t border-line pt-5">
        <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">Location</p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">
          Used to show nearby providers and match jobs in your area.
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

        <label className="mb-2 mt-4 block text-xs font-bold">Pincode</label>
        <input
          className="input-box font-mono text-base font-bold tracking-wide"
          inputMode="numeric"
          maxLength={6}
          placeholder="425001"
          value={pincode}
          onChange={(e) => {
            setPincode(e.target.value.replace(/\D/g, "").slice(0, 6));
            setLocality("");
          }}
        />

        <label className="mb-2 mt-4 block text-xs font-bold">Locality</label>
        <LocalityPicker pincode={pincode} value={locality} onChange={setLocality} />

        <label className="mb-2 mt-4 block text-xs font-bold">Address</label>
        <textarea
          className="input-box min-h-[110px] resize-y"
          placeholder="House / street, landmark"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
      </div>

      {error ? <p className="mt-4 text-sm font-semibold text-rose">{error}</p> : null}

      <button
        className="btn-primary mt-6"
        disabled={
          loading ||
          locating ||
          !fullName.trim() ||
          pincode.length !== 6 ||
          !locality.trim() ||
          !address.trim()
        }
        onClick={() => void save()}
      >
        {loading ? "Saving…" : "Save changes"}
      </button>
    </div>
  );
}
