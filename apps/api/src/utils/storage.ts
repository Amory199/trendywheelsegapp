import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";

import { env } from "../config/env.js";

import { logger } from "./logger.js";

// Filesystem-backed storage. Files live at <UPLOADS_DIR>/<prefix>/<uuid>.<ext>
// and are served publicly by nginx at <UPLOADS_PUBLIC_URL>/<prefix>/<uuid>.<ext>.
//
// Presigned uploads are emulated via an HMAC-signed PUT URL on this API:
// the server signs key + exp + content-type, the client PUTs the file body
// to that URL, the API verifies the sig and writes to disk.

const UPLOADS_DIR = env.UPLOADS_DIR;
const PUBLIC_URL = env.UPLOADS_PUBLIC_URL.replace(/\/+$/, "");
const SIGNING_SECRET = env.STORAGE_SIGNING_SECRET;

function publicUrl(key: string): string {
  return `${PUBLIC_URL}/${key}`;
}

function uploadEndpoint(): string {
  // Where the client PUTs the file body (full URL, since clients live on
  // different origins). Use the configured API public origin.
  const base = env.API_PUBLIC_URL.replace(/\/+$/, "");
  return `${base}/api/storage/put`;
}

function safeKey(prefix: string, mimeType: string): string {
  const ext = (mimeType.split("/")[1] ?? "bin").replace(/[^a-z0-9]/gi, "");
  // Normalize prefix: strip leading/trailing slashes and any "../" segments.
  const cleanPrefix = prefix
    .split("/")
    .filter((part) => part.length > 0 && part !== "..")
    .join("/");
  return `${cleanPrefix}/${randomUUID()}.${ext}`;
}

export function signUploadKey(key: string, mimeType: string, expiresAt: number): string {
  const h = createHmac("sha256", SIGNING_SECRET);
  h.update(`${key}|${mimeType}|${expiresAt}`);
  return h.digest("hex");
}

export function verifyUploadSignature(
  key: string,
  mimeType: string,
  expiresAt: number,
  sig: string,
): boolean {
  if (Date.now() > expiresAt) return false;
  const expected = signUploadKey(key, mimeType, expiresAt);
  if (expected.length !== sig.length) return false;
  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(sig, "hex"));
}

async function ensureDir(absDir: string): Promise<void> {
  await mkdir(absDir, { recursive: true });
}

function fullPath(key: string): string {
  // Resolve under UPLOADS_DIR; reject any traversal.
  const resolved = path.resolve(UPLOADS_DIR, key);
  if (!resolved.startsWith(path.resolve(UPLOADS_DIR) + path.sep)) {
    throw new Error("Path traversal blocked");
  }
  return resolved;
}

export async function ensureBucket(): Promise<void> {
  await ensureDir(UPLOADS_DIR);
  logger.info({ dir: UPLOADS_DIR }, "Local upload directory ready");
}

export async function uploadObject(
  prefix: string,
  buffer: Buffer,
  mimeType: string,
): Promise<{ key: string; url: string }> {
  const key = safeKey(prefix, mimeType);
  const dest = fullPath(key);
  await ensureDir(path.dirname(dest));
  await writeFile(dest, buffer);
  return { key, url: publicUrl(key) };
}

export async function writeObjectAtKey(
  key: string,
  buffer: Buffer,
): Promise<{ key: string; url: string }> {
  const dest = fullPath(key);
  await ensureDir(path.dirname(dest));
  await writeFile(dest, buffer);
  return { key, url: publicUrl(key) };
}

export async function deleteObject(key: string): Promise<void> {
  try {
    await unlink(fullPath(key));
  } catch (err) {
    const error = err as NodeJS.ErrnoException;
    if (error.code !== "ENOENT") throw err;
    // Already gone — treat as success.
  }
}

export async function presignUpload(
  prefix: string,
  mimeType: string,
  expiresIn = 300,
): Promise<{ uploadUrl: string; key: string; fileUrl: string }> {
  const key = safeKey(prefix, mimeType);
  const expiresAt = Date.now() + expiresIn * 1000;
  const sig = signUploadKey(key, mimeType, expiresAt);
  const params = new URLSearchParams({
    key,
    mimeType,
    exp: String(expiresAt),
    sig,
  });
  const uploadUrl = `${uploadEndpoint()}?${params.toString()}`;
  return { uploadUrl, key, fileUrl: publicUrl(key) };
}

export function presignDownload(key: string): Promise<string> {
  // No download signing needed — files are public via nginx.
  return Promise.resolve(publicUrl(key));
}
