import { Router } from "express";
import * as settings from "../controllers/settingsController.js";
import { adminOnly, requireRole } from "../middleware/adminAuth.js";
import { validateBody } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { settingsInputSchema } from "../validators/categorySchema.js";

export const settingsRouter = Router();
settingsRouter.get("/public", asyncHandler(settings.getPublicSettings));

export const adminSettingsRouter = Router();
adminSettingsRouter.use(...adminOnly);
adminSettingsRouter.get("/", asyncHandler(settings.adminGetSettings));
adminSettingsRouter.put(
  "/",
  requireRole("super_admin", "admin"),
  validateBody(settingsInputSchema),
  asyncHandler(settings.adminUpdateSettings),
);
