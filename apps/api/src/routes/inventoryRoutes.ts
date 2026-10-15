import { Router } from "express";
import * as inventory from "../controllers/inventoryController.js";
import { adminOnly } from "../middleware/adminAuth.js";
import { uploadLimiter } from "../middleware/security.js";
import { singleImageUpload } from "../middleware/upload.js";
import { validateBody, validateIdParam } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { stockUpdateSchema } from "../validators/productSchema.js";

export const adminInventoryRouter = Router();
adminInventoryRouter.use(...adminOnly);
adminInventoryRouter.get("/", asyncHandler(inventory.listInventory));
adminInventoryRouter.patch("/:id", validateIdParam, validateBody(stockUpdateSchema), asyncHandler(inventory.updateStock));

export const adminUploadRouter = Router();
adminUploadRouter.use(...adminOnly);
adminUploadRouter.post("/", uploadLimiter, ...singleImageUpload, asyncHandler(inventory.uploadAdminImage));
