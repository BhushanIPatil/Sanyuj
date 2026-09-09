export type ContentCategoryKind = "offer" | "notice";

export type ContentCategory = {
  id: string;
  kind: ContentCategoryKind;
  slug: string;
  name: string;
  emoji: string | null;
  sort_order: number;
  is_active: boolean;
  is_deleted: boolean;
};

export type ContentCategoryRef = {
  id: string;
  slug: string;
  name: string;
  emoji: string | null;
};

export function slugFromName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

export function nestedContentCategory(raw: unknown): ContentCategoryRef | null {
  if (!raw) return null;
  const row = Array.isArray(raw) ? raw[0] : raw;
  if (!row || typeof row !== "object") return null;
  const o = row as Record<string, unknown>;
  if (typeof o.id !== "string") return null;
  return {
    id: o.id,
    slug: typeof o.slug === "string" ? o.slug : "",
    name: typeof o.name === "string" ? o.name : "",
    emoji: typeof o.emoji === "string" ? o.emoji : null,
  };
}

export function contentCategoryKindLabel(kind: ContentCategoryKind) {
  return kind === "offer" ? "Offer" : "Notify";
}
