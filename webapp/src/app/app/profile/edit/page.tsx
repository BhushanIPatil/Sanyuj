"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { normalizePhone } from "@/lib/auth/phone";
import { detectLocation } from "@/lib/geo/location";
import { LocalityPicker } from "@/components/LocalityPicker";
import { AreaPicker } from "@/components/AreaPicker";
import { assertAreaIfRequired } from "@/lib/geo/areas";
import { useToast } from "@/components/Toast";
import { visible } from "@/lib/db/visible";
import { EditProfileSkeleton } from "@/components/ui/Skeleton";

export default function EditProfilePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneDigits, setPhoneDigits] = useState("");
  const [hasBusiness, setHasBusiness] = useState(false);
  const [fullName, setFullName] = useState("");
  const [pincode, setPincode] = useState("");
  const [locality, setLocality] = useState("");
  const [areaId, setAreaId] = useState("");
  const [areaName, setAreaName] = useState("");
  const [areaRequired, setAreaRequired] = useState(false);
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
        supabase
          .from("profiles")
          .select("full_name, email, phone, pincode, locality, area, area_id, address, lat, lng"),
      )
        .eq("id", user.id)
        .single();
      if (!prof) {
        showToast("Could not load profile");
        return;
      }
      const { data: biz } = await visible(supabase.from("businesses").select("id"))
        .eq("owner_id", user.id)
        .maybeSingle();
      setEmail(prof.email ?? user.email ?? "");
      setPhone(prof.phone ?? "");
      setPhoneDigits(
        prof.phone
          ? (() => {
              const d = prof.phone.replace(/\D/g, "");
              return d.length === 12 && d.startsWith("91") ? d.slice(2) : d.slice(0, 10);
            })()
          : "",
      );
      setHasBusiness(!!biz);
      setFullName(prof.full_name ?? "");
      setPincode(prof.pincode ?? "");
      setLocality(prof.locality ?? "");
      setAreaId(prof.area_id ?? "");
      setAreaName(prof.area ?? "");
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
        setAreaId("");
        setAreaName("");
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
      if (hasBusiness || phoneDigits.trim()) {
        const normalized = normalizePhone(phoneDigits);
        if (!normalized) throw new Error("Enter a valid 10-digit Indian mobile number");
      }
      if (pincode.length !== 6) throw new Error("Enter a valid 6-digit pincode");
      if (!locality.trim()) throw new Error("Select your locality");
      if (!address.trim()) throw new Error("Enter your address");

      const supabase = createClient();
      await assertAreaIfRequired(supabase, pincode, locality, areaId);
      if (areaRequired && !areaId) throw new Error("Select your area / colony");
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const phoneValue =
        hasBusiness || phoneDigits.trim() ? normalizePhone(phoneDigits) : phone || null;

      const { error: updErr } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          phone: phoneValue,
          pincode,
          locality: locality.trim(),
          area_id: areaId || null,
          area: areaName || null,
          address: address.trim(),
          lat,
          lng,
        })
        .eq("id", user.id)
        .eq("is_active", true)
        .eq("is_deleted", false);
      if (updErr) {
        if (/unique|duplicate/i.test(updErr.message)) {
          throw new Error("This mobile number is already used by another account");
        }
        throw updErr;
      }

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
    <div className="page-pad">
      <header className="mb-5 flex items-center gap-3">
        <Link
          href="/app/profile"
          className="flex h-10 w-10 items-center justify-center rounded-[13px] border border-line bg-white shadow-card"
        >
          ←
        </Link>
        <div>
          <h1 className="font-display text-lg font-bold">Edit profile</h1>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <section className="rounded-[22px] border border-line bg-white p-5 shadow-card">
          <p className="text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">
            Account details
          </p>

          <label className="mb-2 mt-4 block text-xs font-bold">Full name</label>
          <input
            className="input-box"
            placeholder="Priya Deshmukh"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
          />

          <label className="mb-2 mt-5 block text-xs font-bold">Email</label>
          <input
            className="input-box text-ink-soft"
            type="email"
            value={email}
            disabled
            readOnly
          />
          <p className="mt-1.5 text-[11px] text-ink-faint">
            Email is used to sign in and can’t be changed here.
          </p>

          <label className="mb-2 mt-5 block text-xs font-bold">
            Mobile number{hasBusiness ? <span className="text-rose"> *</span> : null}
          </label>
          <div className="flex overflow-hidden rounded-[18px] border-[1.5px] border-line bg-white focus-within:border-blue-deep">
            <span className="border-r border-line px-3 py-3.5 font-mono text-sm font-bold text-ink-soft">
              +91
            </span>
            <input
              className="flex-1 px-3 py-3.5 font-mono text-[15px] font-semibold outline-none"
              inputMode="numeric"
              placeholder="98230 12345"
              value={phoneDigits}
              onChange={(e) => setPhoneDigits(e.target.value.replace(/[^\d\s]/g, "").slice(0, 12))}
              autoComplete="tel"
              required={hasBusiness}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-ink-faint">
            {hasBusiness
              ? "Required for your business listing so customers can call you."
              : "Optional for customers. Required when you list a business."}
          </p>
        </section>

        <section className="rounded-[22px] border border-line bg-white p-5 shadow-card">
          <p className="text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">Location</p>
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
              setAreaId("");
              setAreaName("");
            }}
          />

          <label className="mb-2 mt-4 block text-xs font-bold">Locality</label>
          <LocalityPicker
            pincode={pincode}
            value={locality}
            onChange={(next) => {
              setLocality(next);
              setAreaId("");
              setAreaName("");
            }}
          />

          {locality ? (
            <>
              <label className="mb-2 mt-4 block text-xs font-bold">Area / colony</label>
              <AreaPicker
                pincode={pincode}
                locality={locality}
                value={areaId}
                onChange={(id, name) => {
                  setAreaId(id);
                  setAreaName(name);
                }}
                onAvailabilityChange={setAreaRequired}
              />
              {!areaRequired ? (
                <p className="mt-1.5 text-[11px] text-ink-soft">
                  Areas for this locality will appear once they are added.
                </p>
              ) : null}
            </>
          ) : null}

          <label className="mb-2 mt-4 block text-xs font-bold">Address</label>
          <textarea
            className="input-box min-h-[110px] resize-y"
            placeholder="House / street, landmark"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </section>
      </div>

      {error ? <p className="mt-4 text-sm font-semibold text-rose">{error}</p> : null}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          className="btn-primary sm:w-auto sm:min-w-[200px]"
          disabled={
            loading ||
            locating ||
            !fullName.trim() ||
            pincode.length !== 6 ||
            !locality.trim() ||
            (areaRequired && !areaId) ||
            !address.trim()
          }
          onClick={() => void save()}
        >
          {loading ? "Saving…" : "Save changes"}
        </button>
        <Link
          href="/app/profile"
          className="rounded-[18px] border-[1.5px] border-line bg-white px-5 py-3.5 text-center text-sm font-bold text-ink shadow-card sm:w-auto"
        >
          Cancel
        </Link>
      </div>
    </div>
  );
}
