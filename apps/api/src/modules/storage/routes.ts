import { Router, type Router as RouterType } from "express";
import multer from "multer";
import { z } from "zod";

import { authenticate, authorize } from "../../middleware/auth.js";
import { AppError } from "../../utils/errors.js";
import { deleteObject, presignUpload, uploadObject } from "../../utils/storage.js";

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
const CUSTOMER_PREFIX_ALLOWLIST = ["uploads", "license-photos", "avatars", "reviews"];

const presignBodySchema = z.object({
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]),
  prefix: z.string().min(1).max(100).default("uploads"),
});

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
  const parsed = presignBodySchema.safeParse(req.body);
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
