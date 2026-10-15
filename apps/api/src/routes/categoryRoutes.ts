import { Router } from "express";
import * as categories from "../controllers/categoryController.js";
import { adminOnly } from "../middleware/adminAuth.js";
import { validateBody, validateIdParam } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { categoryInputSchema } from "../validators/categorySchema.js";

export const categoryRouter = Router();
categoryRouter.get("/", asyncHandler(categories.listCategories));

export const adminCategoryRouter = Router();
adminCategoryRouter.use(...adminOnly);
adminCategoryRouter.get("/", asyncHandler(categories.adminListCategories));
adminCategoryRouter.post("/", validateBody(categoryInputSchema), asyncHandler(categories.adminCreateCategory));
adminCategoryRouter.patch("/:id", validateIdParam, asyncHandler(categories.adminUpdateCategory));
adminCategoryRouter.delete("/:id", validateIdParam, asyncHandler(categories.adminDeleteCategory));
