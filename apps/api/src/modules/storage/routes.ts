import { Router, type Router as RouterType } from "express";
import multer from "multer";

import { authenticate } from "../../middleware/auth.js";
import { AppError } from "../../utils/errors.js";
import { uploadObject } from "../../utils/storage.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const ok = ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.mimetype);
    if (ok) cb(null, true);
    else cb(null, false);
  },
});

const router: RouterType = Router();

router.post("/images", authenticate, upload.single("file"), async (req, res) => {
  if (!req.file) throw AppError.badRequest("No file uploaded");
  const { key, url } = await uploadObject("uploads", req.file.buffer, req.file.mimetype);
  res.status(201).json({ key, url });
});

router.post(
  "/vehicles/:vehicleId/images",
  authenticate,
  upload.single("file"),
  async (req, res) => {
    if (!req.file) throw AppError.badRequest("No file uploaded");
    const { key, url } = await uploadObject(
      `vehicles/${req.params.vehicleId}`,
      req.file.buffer,
      req.file.mimetype,
    );
    res.status(201).json({ key, url });
  },
);

export { router as storageRoutes };
