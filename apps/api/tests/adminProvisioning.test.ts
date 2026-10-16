import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { environmentAdminSchema } from "../src/config/adminCredentials.js";
import { resolveApiEnvironment } from "../src/config/loadEnvironment.js";
import { Admin } from "../src/models/Admin.js";
import { synchronizeEnvironmentAdmin } from "../src/services/adminProvisioningService.js";
import { ORIGIN, resetDatabase, startDatabase, stopDatabase } from "./helpers.js";

const app = createApp();
const credentials = { email: "static@abamart.test", password: "configured-password-42", name: "Store Owner", role: "super_admin" as const };
beforeAll(startDatabase);
afterAll(stopDatabase);
beforeEach(resetDatabase);

async function login(password = credentials.password) {
  return request(app).post("/api/admin/auth/login").set("Origin", ORIGIN).send({ email: credentials.email, password });
}

describe("environment administrator", () => {
  it("validates credentials together and accepts the configured static admin identifier", () => {
    expect(environmentAdminSchema.safeParse({}).success).toBe(true);
    expect(environmentAdminSchema.safeParse({ ADMIN_EMAIL: credentials.email }).success).toBe(false);
    expect(environmentAdminSchema.safeParse({ ADMIN_PASSWORD: credentials.password }).success).toBe(false);
    expect(environmentAdminSchema.safeParse({ ADMIN_EMAIL: "invalid id", ADMIN_PASSWORD: credentials.password }).success).toBe(false);
    expect(environmentAdminSchema.safeParse({ ADMIN_EMAIL: "owner@aba_mart.test", ADMIN_PASSWORD: credentials.password }).success).toBe(true);
    expect(environmentAdminSchema.safeParse({ ADMIN_EMAIL: credentials.email, ADMIN_PASSWORD: "short" }).success).toBe(false);
  });

  it("uses root aliases ahead of API defaults, while deployment variables take priority", () => {
    const resolved = resolveApiEnvironment(
      { ADMIN_EMAIL: "old@test.example", JWT_SECRET: "old-key", MONGODB_URI: "mongodb://old/placeholder", CLIENT_ORIGIN: "http://localhost:3000" },
      { admin_email: "owner@aba_mart.test", admin_psd: "root-password-42", jwt_key: "root-key", CLOUD_NAME: "root-cloud", CLOUD_API_KEY: "public-test-key", CLOUD_SECRET_KEY: "private-test-value", MONGODB_URI: "mongodb://root/placeholder" },
      { JWT_SECRET: "deployment-key" },
    );
    expect(resolved).toMatchObject({ ADMIN_EMAIL: "owner@aba_mart.test", ADMIN_PASSWORD: "root-password-42", JWT_SECRET: "deployment-key", CLOUDINARY_CLOUD_NAME: "root-cloud", CLOUDINARY_API_KEY: "public-test-key", CLOUDINARY_API_SECRET: "private-test-value", MONGODB_URI: "mongodb://root/placeholder", CLIENT_ORIGIN: "http://localhost:3000" });
    for (const alias of ["admin_email", "admin_psd", "jwt_key", "CLOUD_NAME", "CLOUD_API_KEY", "CLOUD_SECRET_KEY"]) {
      expect(resolved).not.toHaveProperty(alias);
    }
  });

  it("supports static IDs that normal email validation rejects", async () => {
    const configured = { ...credentials, email: "owner@aba_mart.test" };
    await synchronizeEnvironmentAdmin(configured);
    await request(app).post("/api/admin/auth/login").set("Origin", ORIGIN).send({ email: configured.email, password: configured.password }).expect(200);
  });

  it("does not combine a root admin ID with a legacy API password", () => {
    const resolved = resolveApiEnvironment({ ADMIN_EMAIL: credentials.email, ADMIN_PASSWORD: credentials.password }, { admin_email: "root@aba_mart.test" }, {});
    expect(resolved.ADMIN_PASSWORD).toBeUndefined();
    expect(environmentAdminSchema.safeParse(resolved).success).toBe(false);
  });

  it("creates a hashed account from environment credentials that can sign in", async () => {
    expect(await synchronizeEnvironmentAdmin(credentials)).toBe(true);
    const admin = await Admin.findOne({ email: credentials.email }).select("+passwordHash").lean();
    expect(admin!.passwordHash).not.toBe(credentials.password);
    expect(admin!.passwordHash).toMatch(/^\$2/);
    const result = await login();
    expect(result.status).toBe(200);
    expect(result.body.data.admin).toMatchObject({ email: credentials.email, role: credentials.role });
    expect(JSON.stringify(result.body)).not.toContain(credentials.password);
  });

  it("does not change the password hash or revoke sessions on an unchanged restart", async () => {
    await synchronizeEnvironmentAdmin(credentials);
    const signedIn = await login();
    const cookie = (signedIn.headers["set-cookie"] as unknown as string[])[0]!.split(";")[0]!;
    const before = await Admin.findOne({ email: credentials.email }).select("+passwordHash").lean();
    expect(await synchronizeEnvironmentAdmin(credentials)).toBe(false);
    const after = await Admin.findById(before!._id).select("+passwordHash").lean();
    expect(after!.passwordHash).toBe(before!.passwordHash);
    expect(after!.tokenVersion).toBe(before!.tokenVersion);
    await request(app).get("/api/admin/auth/me").set("Cookie", cookie).expect(200);
  });

  it("uses a changed environment password and rejects the old password and session", async () => {
    await synchronizeEnvironmentAdmin(credentials);
    const signedIn = await login();
    const cookie = (signedIn.headers["set-cookie"] as unknown as string[])[0]!.split(";")[0]!;
    const password = "updated-static-password-84";
    await synchronizeEnvironmentAdmin({ ...credentials, password });
    expect((await login()).status).toBe(401);
    expect((await login(password)).status).toBe(200);
    await request(app).get("/api/admin/auth/me").set("Cookie", cookie).expect(401);
  });

  it("handles concurrent startup without duplicate accounts or password resets", async () => {
    await Promise.all([synchronizeEnvironmentAdmin(credentials), synchronizeEnvironmentAdmin(credentials)]);
    expect(await Admin.countDocuments({ email: credentials.email })).toBe(1);
    expect((await Admin.findOne({ email: credentials.email }).lean())!.tokenVersion).toBe(0);
  });

  it("does nothing when no static credentials are configured", async () => {
    expect(await synchronizeEnvironmentAdmin(null)).toBe(false);
    expect(await Admin.countDocuments()).toBe(0);
  });
});
