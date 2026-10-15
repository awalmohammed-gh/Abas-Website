/**
 * Cloudinary configuration for ABA Mart: the single place credentials are applied.
 * Credentials stay on the server; only image URLs and public ids are stored in MongoDB.
 */
import { v2 as cloudinary } from "cloudinary";

export interface CloudinaryCredentials {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

/** Applies credentials to the shared Cloudinary SDK client and returns it. */
export function configureCloudinary({ cloudName, apiKey, apiSecret }: CloudinaryCredentials): typeof cloudinary {
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
  return cloudinary;
}

export { cloudinary };
