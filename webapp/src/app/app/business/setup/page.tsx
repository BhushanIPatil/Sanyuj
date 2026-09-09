"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchCategoryTree, type CategoryTreeGroup } from "@/lib/categories";
import { CategoryPicker } from "@/components/CategoryPicker";
import { BusinessPhotoPicker } from "@/components/BusinessPhotoPicker";
import { GuestCta } from "@/components/GuestCta";
import { normalizePhone } from "@/lib/auth/phone";
import { useToast } from "@/components/Toast";
import { visible } from "@/lib/db/visible";
import { EditProfileSkeleton } from "@/components/ui/Skeleton";
import { removeBusinessPhoto, uploadBusinessPhoto } from "@/lib/business/photos";

function digitsFromPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  return digits.slice(0, 10);
}

type ExistingBusiness = {
  id: string;
  name: string;
  photo_url: string | null;
  category_id: string;
};

export default function BusinessSetupPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [guest, setGuest] = useState(false);
  const [ready, setReady] = useState(false);
  const [business, setBusiness] = useState<ExistingBusiness | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [tree, setTree] = useState<CategoryTreeGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  useEffect(() => {
    return () => {
      if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    };
  }, [pendingPreview]);

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setGuest(true);
          return;
        }

        const [{ data: prof }, { data: biz }, groups] = await Promise.all([
          visible(supabase.from("profiles").select("phone")).eq("id", user.id).maybeSingle(),
          visible(
            supabase.from("businesses").select("id, name, photo_url, category_id"),
          )
            .eq("owner_id", user.id)
            .maybeSingle(),
          fetchCategoryTree(supabase),
        ]);

        setTree(groups);
        if (prof?.phone) setPhone(digitsFromPhone(prof.phone));

        const existing = biz as ExistingBusiness | null;
        if (existing) {
          setBusiness(existing);
          setName(existing.name);
          setPhotoUrl(existing.photo_url);
          setCategoryId(existing.category_id);
        } else {
          const first = groups[0]?.categories[0];
          if (first) setCategoryId(first.id);
        }
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Could not load business");
      } finally {
        setCategoriesLoading(false);
        setReady(true);
      }
    };
    void load();
  }, [showToast]);

  function setPickedFile(file: File) {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingFile(file);
    setPendingPreview(URL.createObjectURL(file));
  }

  async function handlePick(file: File) {
    if (!business) {
      setPickedFile(file);
      return;
    }
    setUploading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const url = await uploadBusinessPhoto(supabase, user.id, file, photoUrl);
      const { error } = await supabase
        .from("businesses")
        .update({ photo_url: url })
        .eq("id", business.id)
        .eq("owner_id", user.id);
      if (error) throw error;
      setPhotoUrl(url);
      setBusiness({ ...business, photo_url: url });
      showToast("Business photo updated");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not upload photo");
    } finally {
      setUploading(false);
    }
  }

  async function handleRemovePhoto() {
    if (!business) {
      if (pendingPreview) URL.revokeObjectURL(pendingPreview);
      setPendingFile(null);
      setPendingPreview(null);
      return;
    }
    setUploading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      await removeBusinessPhoto(supabase, photoUrl);
      const { error } = await supabase
        .from("businesses")
        .update({ photo_url: null })
        .eq("id", business.id)
        .eq("owner_id", user.id);
      if (error) throw error;
      setPhotoUrl(null);
      setBusiness({ ...business, photo_url: null });
      showToast("Business photo removed");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not remove photo");
    } finally {
      setUploading(false);
    }
  }

  async function savePhone(supabase: ReturnType<typeof createClient>, userId: string) {
    const normalized = normalizePhone(phone);
    if (!normalized) throw new Error("Enter a valid 10-digit Indian mobile number");
    const { error: phoneErr } = await supabase
      .from("profiles")
      .update({ phone: normalized })
      .eq("id", userId)
      .eq("is_active", true)
      .eq("is_deleted", false);
    if (phoneErr) {
      if (/unique|duplicate/i.test(phoneErr.message)) {
        throw new Error("This mobile number is already used by another account");
      }
      throw phoneErr;
    }
    return normalized;
  }

  async function create() {
    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      if (!name.trim()) throw new Error("Enter a business name");
      if (!categoryId) throw new Error("Select a category");
      await savePhone(supabase, user.id);

      const { data: created, error } = await supabase
        .from("businesses")
        .insert({
          owner_id: user.id,
          name: name.trim(),
          category_id: categoryId,
          is_active: true,
          is_deleted: false,
        })
        .select("id, name, photo_url, category_id")
        .single();
      if (error) throw error;

      let url = created.photo_url as string | null;
      if (pendingFile) {
        url = await uploadBusinessPhoto(supabase, user.id, pendingFile, url);
        const { error: photoErr } = await supabase
          .from("businesses")
          .update({ photo_url: url })
          .eq("id", created.id);
        if (photoErr) throw photoErr;
      }

      showToast("Business profile created — set where you provide service");
      router.push("/app/business/coverage");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not create business");
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!business) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      if (!name.trim()) throw new Error("Enter a business name");
      if (!categoryId) throw new Error("Select a category");
      await savePhone(supabase, user.id);

      const { error } = await supabase
        .from("businesses")
        .update({
          name: name.trim(),
          category_id: categoryId,
        })
        .eq("id", business.id)
        .eq("owner_id", user.id);
      if (error) throw error;
      setBusiness({ ...business, name: name.trim(), category_id: categoryId });
      showToast("Business details saved");
      router.push("/app/business");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not save business");
    } finally {
      setLoading(false);
    }
  }

  if (!ready) return <EditProfileSkeleton />;

  if (guest) {
    return (
      <div className="page-pad max-w-2xl">
        <h1 className="font-display text-lg font-bold">Your Business</h1>
        <div className="mt-6">
          <GuestCta
            title="Log in to manage your business"
            body="Create or edit your listing so neighbours nearby can find and call you."
            next="/app/business/setup"
          />
        </div>
      </div>
    );
  }

  const editing = !!business;
  const shownPhoto = pendingPreview || photoUrl;

  return (
    <div className="page-pad max-w-2xl">
      <header className="mb-4 flex items-center gap-3">
        <Link
          href="/app/business"
          className="flex h-10 w-10 items-center justify-center rounded-[13px] border border-line bg-white shadow-card"
        >
          ←
        </Link>
        <div>
          <h1 className="font-display text-lg font-bold">
            {editing ? "Edit business" : "Set up your business"}
          </h1>
        </div>
      </header>

      <p className="mb-4 text-[12.5px] leading-relaxed text-ink-soft">
        {editing
          ? "Update how neighbours see your listing. Customers call the mobile number on your account."
          : "Customers need a contact number to call you. Your pincode & address are already on your account."}
      </p>

      <BusinessPhotoPicker
        photoUrl={shownPhoto}
        name={name}
        uploading={uploading}
        onPick={(file) => void handlePick(file)}
        onRemove={() => void handleRemovePhoto()}
      />

      <label className="mb-2 mt-5 block text-xs font-bold">Business name</label>
      <input
        className="input-box"
        placeholder="e.g. Patil Plumbing Works"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <label className="mb-2 mt-5 block text-xs font-bold">
        Contact mobile number <span className="text-rose">*</span>
      </label>
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
        />
      </div>
      <p className="mt-1.5 text-[11px] text-ink-faint">
        Required to list as a provider. Shown to customers when they want to call you.
      </p>

      <label className="mb-2 mt-5 block text-xs font-bold">What do you provide?</label>
      <CategoryPicker
        tree={tree}
        value={categoryId}
        onChange={setCategoryId}
        loading={categoriesLoading}
      />

      {editing ? (
        <>
          <button className="btn-primary mt-6" disabled={loading || uploading} onClick={() => void save()}>
            {loading ? "Saving…" : "Save changes"}
          </button>
          <Link
            href="/app/business/coverage"
            className="mt-3 block rounded-full border-[1.5px] border-line bg-white py-3 text-center text-[13px] font-bold"
          >
            Service areas
          </Link>
        </>
      ) : (
        <button className="btn-primary mt-6" disabled={loading || uploading} onClick={() => void create()}>
          {loading ? "Creating…" : "Create Business Profile"}
        </button>
      )}
    </div>
  );
}
