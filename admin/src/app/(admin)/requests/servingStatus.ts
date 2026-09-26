export type LinkedContent = {
  id: string;
  title: string;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  is_deleted: boolean;
};

export const CONTENT_FIELDS = "id,title,starts_at,ends_at,is_active,is_deleted";

export function servingStatus(content: LinkedContent | null, now: number): string {
  if (!content) return "Not linked";
  if (content.is_deleted) return "Deleted";
  if (!content.is_active) return "Inactive";
  if (content.ends_at && new Date(content.ends_at).getTime() <= now) return "Expired";
  if (content.starts_at && new Date(content.starts_at).getTime() > now) return "Upcoming";
  return "Currently serving";
}
