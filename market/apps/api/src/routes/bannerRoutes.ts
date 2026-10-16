import { Router } from "express";
import * as banners from "../controllers/bannerController.js";
import { adminOnly } from "../middleware/adminAuth.js";
import { validateBody, validateIdParam } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { bannerInputSchema } from "../validators/categorySchema.js";

export const bannerRouter = Router();
bannerRouter.get("/", asyncHandler(banners.listBanners));

export const adminBannerRouter = Router();
adminBannerRouter.use(...adminOnly);
adminBannerRouter.get("/", asyncHandler(banners.adminListBanners));
adminBannerRouter.post("/", validateBody(bannerInputSchema), asyncHandler(banners.adminCreateBanner));
adminBannerRouter.patch("/:id", validateIdParam, asyncHandler(banners.adminUpdateBanner));
adminBannerRouter.delete("/:id", validateIdParam, asyncHandler(banners.adminDeleteBanner));
