import type { Request, Response } from "express";
import { parseQuery } from "../middleware/validate.js";
import * as productService from "../services/productService.js";
import { ApiError } from "../utils/ApiError.js";
import { sendSuccess, setPublicCache } from "../utils/respond.js";
import { adminProductQuerySchema, publicProductQuerySchema } from "../validators/productSchema.js";

const id = (req: Request) => String(req.params.id);

export async function listProducts(req: Request, res: Response) {
  const query = parseQuery(publicProductQuerySchema, req.query);
  setPublicCache(res);
  sendSuccess(res, await productService.listPublicProducts(query));
}

export async function getProductBySlug(req: Request, res: Response) {
  const slug = String(req.params.slug ?? "");
  if (!/^[a-z0-9-]{1,140}$/i.test(slug)) throw ApiError.notFound("This product is not available.");
  setPublicCache(res);
  sendSuccess(res, await productService.getPublicProduct(slug));
}

export async function adminListProducts(req: Request, res: Response) {
  sendSuccess(res, await productService.listAdminProducts(parseQuery(adminProductQuerySchema, req.query)));
}

export async function adminGetProduct(req: Request, res: Response) {
  sendSuccess(res, await productService.getAdminProduct(id(req)));
}

export async function adminCreateProduct(req: Request, res: Response) {
  sendSuccess(res, await productService.createProduct(req.body), 201);
}

export async function adminUpdateProduct(req: Request, res: Response) {
  if (typeof req.body !== "object" || req.body === null || Array.isArray(req.body)) {
    throw ApiError.badRequest("Send the fields to update as a JSON object.");
  }
  sendSuccess(res, await productService.updateProduct(id(req), req.body as Record<string, unknown>));
}

export async function adminArchiveProduct(req: Request, res: Response) {
  sendSuccess(res, await productService.archiveProduct(id(req)));
}

export async function adminRestoreProduct(req: Request, res: Response) {
  sendSuccess(res, await productService.restoreProduct(id(req)));
}

export async function adminPermanentlyDeleteProduct(req: Request, res: Response) {
  sendSuccess(res, await productService.permanentlyDeleteProduct(id(req)));
}

export async function adminBulkDeleteProducts(req: Request, res: Response) {
  sendSuccess(res, await productService.permanentlyDeleteProducts(req.body.ids));
}
