import { randomUUID } from "crypto";

import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { env } from "../config/env.js";
import { S3_BUCKET, s3 } from "../config/s3.js";

import { logger } from "./logger.js";

function publicUrl(key: string): string {
  // Strip any trailing slash on the public URL so we always emit a single slash.
  const base = env.S3_PUBLIC_URL.replace(/\/+$/, "");
  return `${base}/${S3_BUCKET}/${key}`;
}

export async function ensureBucket(): Promise<void> {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: S3_BUCKET }));
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: S3_BUCKET }));
    logger.info({ bucket: S3_BUCKET }, "Created S3 bucket");
  }
}

export async function uploadObject(
  prefix: string,
  buffer: Buffer,
  mimeType: string,
): Promise<{ key: string; url: string }> {
  const ext = mimeType.split("/")[1] ?? "bin";
  const key = `${prefix}/${randomUUID()}.${ext}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    }),
  );

  return { key, url: publicUrl(key) };
}

export async function deleteObject(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }));
}

export async function presignUpload(
  prefix: string,
  mimeType: string,
  expiresIn = 300,
): Promise<{ uploadUrl: string; key: string; fileUrl: string }> {
  const ext = mimeType.split("/")[1] ?? "bin";
  const key = `${prefix}/${randomUUID()}.${ext}`;
  const uploadUrl = await getSignedUrl(
    s3,
    new PutObjectCommand({ Bucket: S3_BUCKET, Key: key, ContentType: mimeType }),
    { expiresIn },
  );
  return { uploadUrl, key, fileUrl: publicUrl(key) };
}

export async function presignDownload(key: string, expiresIn = 3600): Promise<string> {
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }), { expiresIn });
}
