// Shared image-upload helper. Both sell/create and sell/trade-in (and
// sell/list-for-rent) bounce local URIs through /api/storage/presign and PUT
// the bytes. This loop used to be inlined in three places.

import { api } from "./api";

/**
 * Uploads each local file URI via a presigned PUT and returns the resulting
 * remote URLs in input order. Failures per-file are swallowed (matches the
 * pre-extraction behaviour in sell/create.tsx) so a single bad photo doesn't
 * tank an entire submission.
 *
 * The MIME type is assumed `image/jpeg` because expo-image-picker emits jpeg
 * on both iOS and Android. If we ever expand to video, plumb the type
 * through.
 */
export async function uploadImages(uris: string[], prefix: string): Promise<string[]> {
  const out: string[] = [];
  for (const localUri of uris) {
    try {
      const mimeType = "image/jpeg";
      const { uploadUrl, fileUrl } = await api.getUploadUrl(mimeType, prefix);
      const blob = await fetch(localUri).then((r) => r.blob());
      await fetch(uploadUrl, {
        method: "PUT",
        body: blob,
        headers: { "Content-Type": mimeType },
      });
      out.push(fileUrl);
    } catch {
      // Swallow per-photo errors so partial uploads still produce a listing.
    }
  }
  return out;
}
