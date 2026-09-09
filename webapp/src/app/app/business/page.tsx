"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MapPin, Phone, Map as MapIcon, Store } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { visible } from "@/lib/db/visible";
import { GuestCta } from "@/components/GuestCta";
import { GoLiveCard } from "@/components/GoLiveCard";
import { BusinessAvatar } from "@/components/BusinessPhotoPicker";
import { CategoryIcon } from "@/components/CategoryIcon";
import { EmptyState } from "@/components/EmptyState";
import { EditProfileSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialog";
import { displayPhone } from "@/lib/auth/phone";
import { removeBusinessPhoto } from "@/lib/business/photos";

type BusinessDetail = {
  id: string;
  name: string;
  photo_url: string | null;
  categories: { id: string; name: string; slug: string; emoji: string | null } | null;
};

/** Read-only listing overview. "Edit business" opens the form at `/app/business/setup`. */
export default function YourBusinessPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [guest, setGuest] = useState(false);
  const [ready, setReady] = useState(false);
  const [business, setBusiness] = useState<BusinessDetail | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [pincode, setPincode] = useState<string | null>(null);
  const [areaCount, setAreaCount] = useState(0);
  const [deleting, setDeleting] = useState(false);

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

        const [{ data: prof }, { data: biz }] = await Promise.all([
          visible(supabase.from("profiles").select("phone, address, pincode"))
            .eq("id", user.id)
            .maybeSingle(),
          visible(
            supabase
              .from("businesses")
              .select("id, name, photo_url, categories(id, name, slug, emoji)"),
          )
            .eq("owner_id", user.id)
            .maybeSingle(),
        ]);

        setPhone(prof?.phone ?? null);
        setAddress(prof?.address ?? null);
        setPincode(prof?.pincode ?? null);

        const existing = biz as BusinessDetail | null;
        setBusiness(existing);
        if (existing) {
          const { count } = await visible(
            supabase.from("business_service_areas").select("id", { count: "exact", head: true }),
          ).eq("business_id", existing.id);
          setAreaCount(count ?? 0);
        }
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Could not load business");
      } finally {
        setReady(true);
      }
    };
    void load();
  }, [showToast]);

  async function removeListing() {
    if (!business) return;
    const ok = await confirm({
      title: "Delete your business?",
      message:
        "Neighbours will no longer see this listing. You can create a new business later. Your Sanyuj account stays active.",
      confirmLabel: "Delete business",
      tone: "danger",
    });
    if (!ok) return;

    setDeleting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("delete_own_business");
      if (error) throw error;
      await removeBusinessPhoto(supabase, business.photo_url);
      setBusiness(null);
      setAreaCount(0);
      showToast("Business listing removed");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not delete business");
    } finally {
      setDeleting(false);
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
            next="/app/business"
          />
        </div>
      </div>
    );
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
        <h1 className="font-display text-lg font-bold">Your Business</h1>
      </header>

      {!business ? (
        <EmptyState
          icon={Store}
          title="No listing yet"
          message="List your business so neighbours nearby can find and call you."
          actionLabel="List your business"
          actionHref="/app/business/setup"
        />
      ) : (
        <>
          <GoLiveCard businessId={business.id} pincode={pincode} className="mb-5" />

          <div className="rounded-[18px] border border-line bg-white p-4 shadow-card">
            <div className="flex items-start gap-3.5">
              <BusinessAvatar name={business.name} photoUrl={business.photo_url} size={60} />
              <div className="min-w-0 flex-1">
                <p className="text-base font-bold">{business.name}</p>
                {business.categories ? (
                  <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-blue-soft px-2.5 py-1 text-[11px] font-bold text-blue-deep">
                    {business.categories.emoji ? (
                      <CategoryIcon value={business.categories.emoji} size="chip" alt="" />
                    ) : null}
                    {business.categories.name}
                  </span>
                ) : null}
              </div>
            </div>

            <dl className="mt-4 space-y-3">
              <DetailRow
                icon={<Phone size={16} />}
                label="Contact number"
                value={phone ? displayPhone(phone) : "Not shared"}
              />
              <DetailRow
                icon={<MapPin size={16} />}
                label="Address"
                value={address?.trim() || "Not shared"}
              />
              <DetailRow
                icon={<MapIcon size={16} />}
                label="Service areas"
                value={
                  areaCount === 0
                    ? "None added yet"
                    : `${areaCount} ${areaCount === 1 ? "area" : "areas"} covered`
                }
              />
            </dl>
          </div>

          <button
            type="button"
            className="btn-primary mt-5"
            onClick={() => router.push("/app/business/setup")}
          >
            Edit business
          </button>
          <Link
            href="/app/business/coverage"
            className="mt-3 block rounded-full border-[1.5px] border-line bg-white py-3 text-center text-[13px] font-bold"
          >
            Service areas
          </Link>

          <div className="mt-8">
            <p className="px-1 text-[10.5px] font-bold uppercase tracking-wide text-rose">Danger zone</p>
            <div className="mt-2 rounded-[18px] border border-line bg-white p-3.5 shadow-card">
              <p className="text-[12.5px] leading-relaxed text-ink-soft">
                Remove this listing from Sanyuj. Your account stays active and you can list again later.
              </p>
              <button
                type="button"
                disabled={deleting}
                onClick={() => void removeListing()}
                className="mt-3 w-full cursor-pointer rounded-[14px] border-[1.5px] border-rose py-3 text-sm font-bold text-rose disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleting ? "Deleting…" : "Delete business"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 text-ink-faint">{icon}</span>
      <div className="min-w-0">
        <dt className="text-[11px] text-ink-faint">{label}</dt>
        <dd className="text-[13px] font-semibold">{value}</dd>
      </div>
    </div>
  );
}
