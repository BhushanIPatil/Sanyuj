import type { SupabaseClient } from "@supabase/supabase-js";

export const BUSINESS_PHOTOS_BUCKET = "business-photos";
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/jpg"]);

export function assertBusinessPhotoFile(file: File) {
  if (!ALLOWED.has(file.type) && !file.type.startsWith("image/")) {
    throw new Error("Choose a JPG, PNG, or WebP image");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Photo must be 5 MB or smaller");
  }
}

export function storagePathFromPublicUrl(url: string | null | undefined) {
  if (!url) return null;
  const marker = `/object/public/${BUSINESS_PHOTOS_BUCKET}/`;
  const i = url.indexOf(marker);
  if (i === -1) return null;
  const path = decodeURIComponent(url.slice(i + marker.length).split("?")[0] ?? "");
  return path || null;
}

function extFromFile(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && ["jpg", "jpeg", "png", "webp"].includes(fromName)) {
    return fromName === "jpeg" ? "jpg" : fromName;
  }
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

export async function removeBusinessPhoto(
  supabase: SupabaseClient,
  photoUrl: string | null | undefined,
) {
  const path = storagePathFromPublicUrl(photoUrl);
  if (!path) return;
  await supabase.storage.from(BUSINESS_PHOTOS_BUCKET).remove([path]);
}

export async function uploadBusinessPhoto(
  supabase: SupabaseClient,
  userId: string,
  file: File,
  previousUrl?: string | null,
) {
  assertBusinessPhotoFile(file);
  const path = `${userId}/profile-${Date.now()}.${extFromFile(file)}`;
  const { error } = await supabase.storage.from(BUSINESS_PHOTOS_BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || "image/jpeg",
  });
  if (error) throw error;
  await removeBusinessPhoto(supabase, previousUrl);
  const { data } = supabase.storage.from(BUSINESS_PHOTOS_BUCKET).getPublicUrl(path);
  return `${data.publicUrl}?t=${Date.now()}`;
}
