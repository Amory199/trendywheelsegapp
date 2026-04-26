import { Router, type Router as RouterType } from "express";
import multer from "multer";
import { z } from "zod";

import { authenticate } from "../../middleware/auth.js";
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

router.post("/vehicles/:vehicleId/images", authenticate, upload.single("file"), async (req, res) => {
  if (!req.file) throw AppError.badRequest("No file uploaded or unsupported type");
  const { key, url } = await uploadObject(
    `vehicles/${req.params.vehicleId}`,
    req.file.buffer,
    req.file.mimetype,
  );
  res.status(201).json({ key, url });
});

// Presigned upload URL (client uploads directly to MinIO)
router.post("/presign", authenticate, async (req, res) => {
  const parsed = presignBodySchema.safeParse(req.body);
  if (!parsed.success) throw AppError.badRequest(parsed.error.message);
  const { uploadUrl, key, fileUrl } = await presignUpload(parsed.data.prefix, parsed.data.mimeType);
  res.json({ uploadUrl, key, fileUrl });
});

// Delete an object
router.delete("/:key(*)", authenticate, async (req, res) => {
  const key = req.params.key;
  if (!key) throw AppError.badRequest("Missing key");
  await deleteObject(key);
  res.json({ success: true });
});

export { router as storageRoutes };
