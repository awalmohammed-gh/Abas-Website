import type { RequestHandler } from "express";
import multer from "multer";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;

/**
 * Checks the file signature, not just the declared MIME type, so renamed
 * executables or HTML files are rejected.
 */
export function sniffImageType(buffer: Buffer): (typeof ALLOWED_IMAGE_TYPES)[number] | null {
  if (buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  if (buffer.toString("ascii", 4, 8) === "ftyp" && /^avi[fs]$/.test(buffer.toString("ascii", 8, 12))) return "image/avif";
  return null;
}

const multerUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.maxUploadBytes, files: 1, fields: 5 },
  fileFilter: (_req, file, callback) => {
    if ((ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.mimetype)) return callback(null, true);
    callback(new ApiError(415, "UNSUPPORTED_FILE_TYPE", "Only JPEG, PNG, WebP or AVIF images can be uploaded."));
  },
});

/** Accepts one image in the "image" field and verifies its signature. */
export const singleImageUpload: RequestHandler[] = [
  multerUpload.single("image"),
  (req, _res, next) => {
    if (!req.file) return next(ApiError.badRequest("Choose an image to upload."));
    const detected = sniffImageType(req.file.buffer);
    if (!detected) {
      return next(new ApiError(415, "UNSUPPORTED_FILE_TYPE", "That file is not a valid JPEG, PNG, WebP or AVIF image."));
    }
    next();
  },
];
