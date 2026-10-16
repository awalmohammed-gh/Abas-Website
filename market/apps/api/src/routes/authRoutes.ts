import { Router } from "express";
import { adminLoginSchema } from "@aba-mart/shared";
import * as auth from "../controllers/authController.js";
import { requireAdmin } from "../middleware/adminAuth.js";
import { loginLimiter } from "../middleware/security.js";
import { validateBody } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const authRouter = Router();
authRouter.post("/login", loginLimiter, validateBody(adminLoginSchema), asyncHandler(auth.login));
authRouter.post("/logout", asyncHandler(auth.logout));
authRouter.get("/me", requireAdmin, asyncHandler(auth.me));
