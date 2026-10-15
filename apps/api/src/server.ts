import { env } from "./config/env.js";
import { connectMongoDB, disconnectMongoDB } from "../../../config/mongodb.js";
import { createApp } from "./app.js";

async function main(): Promise<void> {
  await connectMongoDB(env.mongo);
  const app = createApp();
  const server = app.listen(env.PORT, () => {
    console.log(`[api] ABA Mart API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  });

  const shutdown = (signal: string) => {
    console.log(`[api] ${signal} received, shutting down`);
    server.close(() => {
      disconnectMongoDB()
        .catch(() => undefined)
        .finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((error: unknown) => {
  console.error("[api] failed to start:", error instanceof Error ? error.message : error);
  process.exit(1);
});
