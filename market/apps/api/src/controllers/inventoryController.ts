import type { Request, Response } from "express";
import { UPLOAD_FOLDERS, type UploadFolder } from "@aba-mart/shared";
import { parseQuery } from "../middleware/validate.js";
import { uploadImage } from "../services/imageService.js";
import * as productService from "../services/productService.js";
import { ApiError } from "../utils/ApiError.js";
import { sendSuccess } from "../utils/respond.js";
import { inventoryQuerySchema } from "../validators/productSchema.js";

export async function listInventory(req: Request, res: Response) {
  sendSuccess(res, await productService.listInventory(parseQuery(inventoryQuerySchema, req.query)));
}

export async function updateStock(req: Request, res: Response) {
  const { variantId, stock } = req.body as { variantId?: string | null; stock: number };
  sendSuccess(res, await productService.setStock(String(req.params.id), variantId, stock));
}

/** POST /api/admin/uploads?folder=products  (multipart field "image") */
export async function uploadAdminImage(req: Request, res: Response) {
  const folder = String(req.query.folder ?? "products");
  if (!(UPLOAD_FOLDERS as readonly string[]).includes(folder)) {
    throw ApiError.badRequest(`Folder must be one of: ${UPLOAD_FOLDERS.join(", ")}`);
  }
  const asset = await uploadImage(req.file!.buffer, folder as UploadFolder);
  sendSuccess(res, asset, 201);
}
