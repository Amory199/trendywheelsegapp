/**
 * The API serializes vehicle images as rows ({ url, sortOrder }); some older
 * cached payloads were plain strings. The Vehicle type declares images:string[]
 * (aspirational), so this normalizer is the safe way to read a usable URL off
 * the first image regardless of the runtime shape.
 */
export function vehicleImageUrl(img: unknown): string | undefined {
  if (typeof img === "string") return img;
  if (img && typeof img === "object" && "url" in img) {
    const url = (img as { url?: unknown }).url;
    return typeof url === "string" ? url : undefined;
  }
  return undefined;
}
