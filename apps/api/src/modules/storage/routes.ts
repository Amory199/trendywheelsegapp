import express, { Router, type Router as RouterType } from "express";
import multer from "multer";

import { presignUploadSchema } from "@trendywheels/validators";

import { authenticate, authorize } from "../../middleware/auth.js";
import { AppError } from "../../utils/errors.js";
import {
  deleteObject,
  presignUpload,
  uploadObject,
  verifyUploadSignature,
  writeObjectAtKey,
} from "../../utils/storage.js";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, ALLOWED_MIME_TYPES.includes(file.mimetype));
  },
});

// Customer-facing prefixes are namespaced per-user; staff/admin may
// upload to broader buckets (e.g. vehicle hero shots, KB attachments).
const CUSTOMER_PREFIX_ALLOWLIST = [
  "uploads",
  "license-photos",
  "avatars",
  "reviews",
  "trade-ins",
  "sales",
  "rental-listings",
];

const router: RouterType = Router();

// Direct upload (API proxies to MinIO)
router.post("/images", authenticate, upload.single("file"), async (req, res) => {
  if (!req.file) throw AppError.badRequest("No file uploaded or unsupported type");
  const { key, url } = await uploadObject("uploads", req.file.buffer, req.file.mimetype);
  res.status(201).json({ key, url });
});

router.post(
  "/vehicles/:vehicleId/images",
  authenticate,
  upload.single("file"),
  async (req, res) => {
    if (!req.file) throw AppError.badRequest("No file uploaded or unsupported type");
    const { key, url } = await uploadObject(
      `vehicles/${req.params.vehicleId}`,
      req.file.buffer,
      req.file.mimetype,
    );
    res.status(201).json({ key, url });
  },
);

// Presigned upload URL (client uploads directly to MinIO)
router.post("/presign", authenticate, async (req, res) => {
  const parsed = presignUploadSchema.safeParse(req.body);
  if (!parsed.success) throw AppError.badRequest(parsed.error.message);

  const isStaff = req.user!.accountType === "admin" || req.user!.accountType === "staff";
  let prefix = parsed.data.prefix.replace(/^\/+|\/+$/g, "");
  if (!isStaff) {
    const root = prefix.split("/")[0];
    if (!CUSTOMER_PREFIX_ALLOWLIST.includes(root)) {
      throw AppError.forbidden("Prefix not allowed for customer accounts");
    }
    // Customers always upload under their own user-scoped subfolder so
    // they cannot poison another user's namespace.
    prefix = `${root}/${req.user!.userId}`;
  }

  const { uploadUrl, key, fileUrl } = await presignUpload(prefix, parsed.data.mimeType);
  res.json({ uploadUrl, key, fileUrl });
});

// Raw PUT upload — receives the file body directly (mimics S3 PutObject
// presigned URL). Auth is provided by the HMAC sig in the query string,
// not by the bearer token (clients fetch the URL from /presign first,
// then PUT to it without re-attaching their JWT). 10 MB cap.
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
router.put("/put", express.raw({ type: "*/*", limit: MAX_UPLOAD_BYTES }), async (req, res) => {
  const key = String(req.query.key ?? "");
  const mimeType = String(req.query.mimeType ?? "");
  const exp = Number(req.query.exp ?? 0);
  const sig = String(req.query.sig ?? "");
  if (!key || !mimeType || !exp || !sig) {
    throw AppError.badRequest("Missing upload parameters");
  }
  if (!verifyUploadSignature(key, mimeType, exp, sig)) {
    throw AppError.badRequest("Invalid or expired upload signature");
  }
  if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
    throw AppError.badRequest("Empty request body");
  }
  await writeObjectAtKey(key, req.body);
  res.status(200).json({ key });
});

// Delete an object — admin/staff only. Customer-driven cleanup happens
// implicitly when the parent record is deleted, so customers do not
// need direct DELETE access (which would otherwise let any user remove
// vehicle hero images, license photos, review attachments, etc.).
router.delete("/:key(*)", authenticate, authorize("admin", "staff"), async (req, res) => {
  const key = req.params.key;
  if (!key) throw AppError.badRequest("Missing key");
  await deleteObject(key);
  res.json({ success: true });
});

export { router as storageRoutes };
