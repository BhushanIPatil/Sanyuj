/* eslint-disable @typescript-eslint/no-explicit-any -- supabase builders trigger TS2589 if constrained */
/** Restrict a query to rows that are active and not soft-deleted. */
export function visible(query: any): any {
  return query.eq("is_active", true).eq("is_deleted", false);
}
