// Standard response envelopes. Use these for new endpoints so the shape stays
// consistent: every list response is `{ data, total?, page?, limit? }`,
// every singleton is `{ data }`, every action-only endpoint is `{ success: true }`.
//
// Existing endpoints still hand-build their JSON — migration is opportunistic.

export interface ListResponse<T> {
  data: T[];
  total?: number;
  page?: number;
  limit?: number;
}

export interface ItemResponse<T> {
  data: T;
}

export function ok<T>(data: T[], page?: number, limit?: number, total?: number): ListResponse<T>;
export function ok<T>(data: T): ItemResponse<T>;
export function ok<T>(
  data: T | T[],
  page?: number,
  limit?: number,
  total?: number,
): ListResponse<T> | ItemResponse<T> {
  if (Array.isArray(data)) {
    const out: ListResponse<T> = { data };
    if (total !== undefined) out.total = total;
    if (page !== undefined) out.page = page;
    if (limit !== undefined) out.limit = limit;
    return out;
  }
  return { data };
}
