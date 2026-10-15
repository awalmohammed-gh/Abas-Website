import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { connectedDatabaseName, isMongoDBConnected } from "../../../config/mongodb.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { apiLimiter, originGuard } from "./middleware/security.js";
import { apiRouter } from "./routes/index.js";

export function createApp(): Express {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", env.TRUST_PROXY);

  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) => callback(null, !origin || env.CLIENT_ORIGIN.includes(origin)),
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      allowedHeaders: ["Content-Type", "X-CSRF-Token"],
      maxAge: 600,
    }),
  );
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());
  app.use(originGuard);

  app.get("/api/health", (_req, res) => {
    const database = isMongoDBConnected();
    res.status(database ? 200 : 503).json({
      success: database,
      data: {
        status: database ? "ok" : "degraded",
        database,
        // Outside production, report which database this server writes to so tooling can verify it.
        ...(env.isProduction ? {} : { databaseName: connectedDatabaseName() }),
      },
    });
  });

  app.use("/api", apiLimiter, apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
