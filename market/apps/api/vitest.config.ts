import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 300_000,
    env: {
      NODE_ENV: "test",
      MONGODB_URI: "mongodb://127.0.0.1:1/placeholder",
      MONGODB_DB_NAME: "aba-mart-test",
      JWT_SECRET: "test-secret-that-is-long-enough-for-hs256-signing",
      CLIENT_ORIGIN: "http://localhost:3000",
      CLOUDINARY_CLOUD_NAME: "test-cloud",
      CLOUDINARY_API_KEY: "test-key",
      CLOUDINARY_API_SECRET: "test-secret",
      // Throwaway key pair for tests only; push sends are mocked.
      VAPID_PUBLIC_KEY: "BF0i2eaga3WeezRBIPfj-4Whu28pV7Mxod-5Z2Kg7lz1zP2daH3mzWR6J1hmfPgy10r5d9nsUTIYRMPKiJsG5KM",
      VAPID_PRIVATE_KEY: "aAk0JSgJy9QXTP_sUOZFUcrAd7aytikKlq3IpXv-Xk4",
      VAPID_SUBJECT: "mailto:tests@abamart.test",
    },
  },
});
