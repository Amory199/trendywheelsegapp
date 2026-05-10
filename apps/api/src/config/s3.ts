// Storage moved to local filesystem (apps/api/src/utils/storage.ts).
// This module is kept to avoid breaking any straggling imports — it
// re-exports compatibility shims so old code paths fail fast at runtime
// rather than at module-load time.

export const s3 = {} as never;
export const S3_BUCKET = "" as never;
