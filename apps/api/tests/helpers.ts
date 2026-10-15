import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import type { Express } from "express";
import { connectMongoDB } from "../../../config/mongodb.js";
import { Admin } from "../src/models/Admin.js";
import { hashPassword } from "../src/services/authService.js";

export const ORIGIN = "http://localhost:3000";
export const ADMIN_EMAIL = "owner@abamart.test";
export const ADMIN_PASSWORD = "correct-horse-42";

let replSet: MongoMemoryReplSet | null = null;

/** A replica set is needed because order confirmation uses transactions. */
export async function startDatabase(): Promise<void> {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: "wiredTiger" } });
  await connectMongoDB({ uri: replSet.getUri(), dbName: "aba-mart-test", log: false });
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
}

export async function stopDatabase(): Promise<void> {
  await mongoose.disconnect();
  await replSet?.stop();
  replSet = null;
}

export async function resetDatabase(): Promise<void> {
  const collections = await mongoose.connection.db!.collections();
  await Promise.all(collections.map((c) => c.deleteMany({})));
}

export async function createTestAdmin(): Promise<void> {
  await Admin.create({ name: "Owner", email: ADMIN_EMAIL, passwordHash: await hashPassword(ADMIN_PASSWORD), role: "super_admin" });
}

export interface AdminAgent {
  cookie: string;
  csrf: string;
  get: (path: string) => request.Test;
  post: (path: string, body?: object) => request.Test;
  patch: (path: string, body?: object) => request.Test;
  put: (path: string, body?: object) => request.Test;
  del: (path: string) => request.Test;
}

/** Logs in and returns helpers that send the session cookie, origin and CSRF header. */
export async function loginAdmin(app: Express): Promise<AdminAgent> {
  const res = await request(app)
    .post("/api/admin/auth/login")
    .set("Origin", ORIGIN)
    .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
    .expect(200);
  const setCookie = res.headers["set-cookie"] as unknown as string[];
  const cookie = setCookie.map((c) => c.split(";")[0]).join("; ");
  const csrf = res.body.data.csrfToken as string;

  const withAuth = (test: request.Test) => test.set("Cookie", cookie).set("Origin", ORIGIN).set("X-CSRF-Token", csrf);
  return {
    cookie,
    csrf,
    get: (path) => withAuth(request(app).get(path)),
    post: (path, body = {}) => withAuth(request(app).post(path)).send(body),
    patch: (path, body = {}) => withAuth(request(app).patch(path)).send(body),
    put: (path, body = {}) => withAuth(request(app).put(path)).send(body),
    del: (path) => withAuth(request(app).delete(path)),
  };
}

export function ownedImage(name = "photo") {
  return {
    url: `https://res.cloudinary.com/test-cloud/image/upload/v1/aba-mart/products/${name}.jpg`,
    publicId: `aba-mart/products/${name}`,
  };
}
