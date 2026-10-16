import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import * as database from "../../../config/mongodb.js";
import { env } from "../src/config/env.js";
import { Banner } from "../src/models/Banner.js";
import app from "../src/vercel.js";
import { ADMIN_EMAIL, ADMIN_PASSWORD, ORIGIN, createTestAdmin, ownedImage } from "./helpers.js";

let server: MongoMemoryServer;
const originalMongo = { ...env.mongo };

beforeAll(async () => {
  server = await MongoMemoryServer.create();
  Object.assign(env.mongo, { uri: server.getUri(), dbName: "aba-mart-recovery-test" });
  await database.connectMongoDB(env.mongo);
  await createTestAdmin();
  await Banner.create({ title: "Saved banner", desktopImage: ownedImage("recovery-banner"), isActive: true });
});

beforeEach(async () => {
  await database.connectMongoDB(env.mongo);
  // Ensure the Express app is already cached before simulating a lost connection.
  await request(app).get("/api/health").expect(200);
});

afterEach(() => vi.restoreAllMocks());
afterAll(async () => {
  await mongoose.disconnect();
  await server?.stop();
  Object.assign(env.mongo, originalMongo);
});

describe("Vercel database recovery", () => {
  it("does not cache database health responses", async () => {
    const response = await request(app).get("/api/health").expect(200);
    expect(response.headers["cache-control"]).toBe("no-store");
  });

  it("reconnects a warm instance and serves its existing banners and admin account", async () => {
    await mongoose.disconnect();
    const health = await request(app).get("/api/health").expect(200);
    expect(health.body.data.database).toBe(true);
    const banners = await request(app).get("/api/banners").expect(200);
    expect(banners.body.data.map((banner: { title: string }) => banner.title)).toContain("Saved banner");
    await request(app).post("/api/admin/auth/login").set("Origin", ORIGIN)
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }).expect(200);
  });

  it("shares one reconnect attempt between simultaneous requests", async () => {
    await mongoose.disconnect();
    const connect = vi.spyOn(mongoose, "connect");
    const responses = await Promise.all(Array.from({ length: 6 }, () => request(app).get("/api/health")));
    expect(responses.map((response) => response.status)).toEqual(Array(6).fill(200));
    expect(connect).toHaveBeenCalledTimes(1);
  });

  it("retries after a failed reconnect without caching the unavailable response", async () => {
    await mongoose.disconnect();
    vi.spyOn(console, "error").mockImplementation(() => {});
    const connect = vi.spyOn(mongoose, "connect").mockRejectedValueOnce(new Error("Connection interrupted"));
    const failed = await request(app).get("/api/health").expect(503);
    expect(failed.body.error.code).toBe("SERVICE_UNAVAILABLE");
    expect(failed.headers["cache-control"]).toBe("no-store");
    expect(failed.headers["retry-after"]).toBe("5");
    const recovered = await request(app).get("/api/health").expect(200);
    expect(recovered.body.data.database).toBe(true);
    expect(connect).toHaveBeenCalledTimes(2);
  });
});
