import { Router } from "express";
import * as products from "../controllers/productController.js";
import { adminOnly } from "../middleware/adminAuth.js";
import { validateBody, validateIdParam } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { productInputSchema } from "../validators/productSchema.js";
import { bulkProductDeleteSchema } from "@aba-mart/shared";
import { bulkProductDeleteLimiter } from "../middleware/security.js";

export const productRouter = Router();
productRouter.get("/", asyncHandler(products.listProducts));
productRouter.get("/:slug", asyncHandler(products.getProductBySlug));

export const adminProductRouter = Router();
adminProductRouter.use(...adminOnly);
adminProductRouter.get("/", asyncHandler(products.adminListProducts));
adminProductRouter.post("/", validateBody(productInputSchema), asyncHandler(products.adminCreateProduct));
adminProductRouter.post("/bulk-delete", bulkProductDeleteLimiter, validateBody(bulkProductDeleteSchema), asyncHandler(products.adminBulkDeleteProducts));
adminProductRouter.get("/:id", validateIdParam, asyncHandler(products.adminGetProduct));
adminProductRouter.patch("/:id", validateIdParam, asyncHandler(products.adminUpdateProduct));
adminProductRouter.delete("/:id", validateIdParam, asyncHandler(products.adminArchiveProduct));
adminProductRouter.delete("/:id/permanent", validateIdParam, asyncHandler(products.adminPermanentlyDeleteProduct));
adminProductRouter.post("/:id/restore", validateIdParam, asyncHandler(products.adminRestoreProduct));
