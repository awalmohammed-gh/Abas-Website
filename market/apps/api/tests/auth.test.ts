import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { ADMIN_EMAIL, ORIGIN, createTestAdmin, loginAdmin, resetDatabase, startDatabase, stopDatabase } from "./helpers.js";

const app = createApp();

beforeAll(startDatabase);
afterAll(stopDatabase);
beforeEach(async () => {
  await resetDatabase();
  await createTestAdmin();
});

describe("admin authentication", () => {
  it("rejects wrong credentials with a generic message", async () => {
    const wrongPassword = await request(app)
      .post("/api/admin/auth/login")
      .set("Origin", ORIGIN)
      .send({ email: ADMIN_EMAIL, password: "nope-nope-1" })
      .expect(401);
    const unknownEmail = await request(app)
      .post("/api/admin/auth/login")
      .set("Origin", ORIGIN)
      .send({ email: "someone@else.test", password: "nope-nope-1" })
      .expect(401);
    expect(wrongPassword.body.error.message).toBe(unknownEmail.body.error.message);
    expect(wrongPassword.headers["set-cookie"]).toBeUndefined();
  });

  it("sets an HTTP-only session cookie and returns a CSRF token on login", async () => {
    const res = await request(app)
      .post("/api/admin/auth/login")
      .set("Origin", ORIGIN)
      .send({ email: ADMIN_EMAIL.toUpperCase(), password: "correct-horse-42" })
      .expect(200);
    const cookie = (res.headers["set-cookie"] as unknown as string[])[0]!;
    expect(cookie).toMatch(/^aba_admin_session=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(cookie).toMatch(/Path=\/api\/admin/);
    expect(res.body.data.csrfToken).toEqual(expect.any(String));
    expect(res.body.data.admin).toMatchObject({ email: ADMIN_EMAIL, role: "super_admin" });
    expect(JSON.stringify(res.body)).not.toContain("passwordHash");
  });

  it("protects admin routes without a session", async () => {
    await request(app).get("/api/admin/auth/me").expect(401);
    await request(app).get("/api/admin/products").expect(401);
    await request(app).get("/api/admin/orders").expect(401);
    await request(app).get("/api/admin/dashboard").expect(401);
    await request(app)
      .post("/api/admin/categories")
      .set("Origin", ORIGIN)
      .send({ name: "Soaps" })
      .expect(401);
  });

  it("rejects a forged session token", async () => {
    await request(app).get("/api/admin/auth/me").set("Cookie", "aba_admin_session=not.a.jwt").expect(401);
  });

  it("requires the CSRF token for state-changing admin requests", async () => {
    const admin = await loginAdmin(app);
    await request(app)
      .post("/api/admin/categories")
      .set("Cookie", admin.cookie)
      .set("Origin", ORIGIN)
      .send({ name: "Soaps" })
      .expect(403);
    await request(app)
      .post("/api/admin/categories")
      .set("Cookie", admin.cookie)
      .set("Origin", ORIGIN)
      .set("X-CSRF-Token", "wrong-token")
      .send({ name: "Soaps" })
      .expect(403);
    await admin.post("/api/admin/categories", { name: "Soaps" }).expect(201);
  });

  it("blocks state-changing requests from unknown origins", async () => {
    const admin = await loginAdmin(app);
    const res = await request(app)
      .post("/api/admin/categories")
      .set("Cookie", admin.cookie)
      .set("Origin", "https://evil.example")
      .set("X-CSRF-Token", admin.csrf)
      .send({ name: "Soaps" })
      .expect(403);
    expect(res.body.error.code).toBe("ORIGIN_NOT_ALLOWED");
  });

  it("returns the session from /me and ends it on logout", async () => {
    const admin = await loginAdmin(app);
    const me = await admin.get("/api/admin/auth/me").expect(200);
    expect(me.body.data.csrfToken).toBe(admin.csrf);

    const logout = await admin.post("/api/admin/auth/logout").expect(200);
    expect((logout.headers["set-cookie"] as unknown as string[])[0]).toMatch(/aba_admin_session=;/);

    // The old token is revoked server-side even if a copy of the cookie survives.
    await admin.get("/api/admin/auth/me").expect(401);
  });
});
