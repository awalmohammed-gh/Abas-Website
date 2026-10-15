import { Router } from "express";
import { authRouter } from "./authRoutes.js";
import { adminBannerRouter, bannerRouter } from "./bannerRoutes.js";
import { adminCategoryRouter, categoryRouter } from "./categoryRoutes.js";
import { adminInventoryRouter, adminUploadRouter } from "./inventoryRoutes.js";
import { adminDashboardRouter, adminOrderRouter, orderRouter } from "./orderRoutes.js";
import { adminProductRouter, productRouter } from "./productRoutes.js";
import { adminSettingsRouter, settingsRouter } from "./settingsRoutes.js";

export const apiRouter = Router();

// Public storefront routes
apiRouter.use("/products", productRouter);
apiRouter.use("/categories", categoryRouter);
apiRouter.use("/banners", bannerRouter);
apiRouter.use("/settings", settingsRouter);
apiRouter.use("/orders", orderRouter);

// Admin routes: each router below enforces the admin session and CSRF token itself
apiRouter.use("/admin/auth", authRouter);
apiRouter.use("/admin/dashboard", adminDashboardRouter);
apiRouter.use("/admin/products", adminProductRouter);
apiRouter.use("/admin/categories", adminCategoryRouter);
apiRouter.use("/admin/orders", adminOrderRouter);
apiRouter.use("/admin/inventory", adminInventoryRouter);
apiRouter.use("/admin/banners", adminBannerRouter);
apiRouter.use("/admin/settings", adminSettingsRouter);
apiRouter.use("/admin/uploads", adminUploadRouter);
