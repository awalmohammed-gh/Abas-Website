import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import type { ImageAsset, UploadFolder } from "@aba-mart/shared";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
});

const URL_PREFIX = `https://res.cloudinary.com/${env.CLOUDINARY_CLOUD_NAME}/image/upload/`;
const PUBLIC_ID_PREFIX = `${env.CLOUDINARY_FOLDER}/`;

/** Uploads an image buffer to Cloudinary. Only the URL and public id are stored in MongoDB. */
export async function uploadImage(buffer: Buffer, folder: UploadFolder): Promise<ImageAsset> {
  const result = await new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `${env.CLOUDINARY_FOLDER}/${folder}`,
        resource_type: "image",
        overwrite: false,
        unique_filename: true,
        use_filename: false,
        // Strip metadata and cap the stored original at a sensible size.
        transformation: [{ width: 2400, height: 2400, crop: "limit" }],
      },
      (error, response) => {
        if (error || !response) reject(error ?? new Error("Empty upload response"));
        else resolve(response);
      },
    );
    stream.end(buffer);
  }).catch((error: unknown) => {
    console.error("[images] upload failed", error);
    throw new ApiError(502, "UPLOAD_FAILED", "The image could not be uploaded. Please try again.");
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
    width: result.width,
    height: result.height,
  };
}

/**
 * Uploads a local file under a fixed public id (used by the seed script).
 * Re-running reuses the existing image instead of creating duplicates.
 */
export async function uploadLocalImage(filePath: string, folder: UploadFolder, name: string): Promise<ImageAsset> {
  const result = await cloudinary.uploader.upload(filePath, {
    public_id: `${env.CLOUDINARY_FOLDER}/${folder}/${name}`,
    resource_type: "image",
    overwrite: false,
    transformation: [{ width: 2400, height: 2400, crop: "limit" }],
  });
  return { url: result.secure_url, publicId: result.public_id, width: result.width, height: result.height };
}

/** True when an image was uploaded through this API to this store's Cloudinary folder. */
export function isOwnedImage(image: Pick<ImageAsset, "url" | "publicId">): boolean {
  return image.url.startsWith(URL_PREFIX) && image.publicId.startsWith(PUBLIC_ID_PREFIX) && !image.publicId.includes("..");
}

/** Rejects image references that did not come from this store's uploads. */
export function assertOwnedImages(images: (Pick<ImageAsset, "url" | "publicId"> | null | undefined)[], field = "images"): void {
  for (const image of images) {
    if (image && !isOwnedImage(image)) {
      throw ApiError.badRequest("Images must be uploaded through the admin portal.", { fields: { [field]: "Invalid image source" } });
    }
  }
}

/** Best-effort removal of images that are no longer referenced. Never throws. */
export async function deleteImages(publicIds: string[]): Promise<void> {
  const owned = publicIds.filter((id) => id.startsWith(PUBLIC_ID_PREFIX));
  await Promise.all(
    owned.map((publicId) =>
      cloudinary.uploader.destroy(publicId, { invalidate: true }).catch((error: unknown) => {
        console.warn(`[images] could not delete ${publicId}`, error);
      }),
    ),
  );
}

/** Deletes images present in `before` but missing from `after`. */
export function cleanupRemovedImages(
  before: (ImageAsset | null | undefined)[],
  after: (ImageAsset | null | undefined)[],
): void {
  const keep = new Set(after.filter(Boolean).map((image) => image!.publicId));
  const removed = before.filter((image): image is ImageAsset => !!image && !keep.has(image.publicId)).map((i) => i.publicId);
  if (removed.length) void deleteImages(removed);
}
