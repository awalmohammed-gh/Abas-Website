import dotenv from "dotenv";
import { z } from "zod";
import { normalizePhoneNumber } from "@aba-mart/shared";

// Tests provide their own environment and must never pick up real credentials.
if (process.env.NODE_ENV !== "test") dotenv.config({ quiet: true });

const booleanString = z
  .enum(["true", "false", "1", "0"])
  .transform((value) => value === "true" || value === "1");

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.coerce.number().int().min(1).max(65535).default(5000),

    MONGODB_URI: z
      .string("MONGODB_URI is required")
      .refine((v) => /^mongodb(\+srv)?:\/\//.test(v), "MONGODB_URI must start with mongodb:// or mongodb+srv://"),
    MONGODB_DB_NAME: z.string().min(1).default("aba-mart"),
    /** Optional DNS resolvers for mongodb+srv lookups, e.g. "1.1.1.1,8.8.8.8". */
    DNS_SERVERS: z
      .string()
      .transform((v) => v.split(",").map((s) => s.trim()).filter(Boolean))
      .refine((servers) => servers.every((s) => /^[\d.:a-f]+$/i.test(s)), "DNS_SERVERS must be a comma-separated list of IP addresses")
      .optional(),

    JWT_SECRET: z.string("JWT_SECRET is required").min(32, "JWT_SECRET must be at least 32 characters"),
    JWT_EXPIRES_IN_HOURS: z.coerce.number().int().min(1).max(168).default(8),

    CLIENT_ORIGIN: z
      .string("CLIENT_ORIGIN is required")
      .transform((v) =>
        v
          .split(",")
          .map((origin) => origin.trim().replace(/\/+$/, ""))
          .filter(Boolean),
      )
      .refine((origins) => origins.length > 0, "CLIENT_ORIGIN must list at least one origin")
      .refine((origins) => origins.every((o) => /^https?:\/\/[^/\s]+$/.test(o)), "CLIENT_ORIGIN entries must look like https://example.com"),

    COOKIE_SAME_SITE: z.enum(["lax", "strict", "none"]).default("lax"),
    COOKIE_SECURE: booleanString.optional(),
    COOKIE_DOMAIN: z.string().optional(),
    TRUST_PROXY: z.coerce.number().int().min(0).max(10).default(0),

    CLOUDINARY_CLOUD_NAME: z.string("CLOUDINARY_CLOUD_NAME is required").min(1),
    CLOUDINARY_API_KEY: z.string("CLOUDINARY_API_KEY is required").min(1),
    CLOUDINARY_API_SECRET: z.string("CLOUDINARY_API_SECRET is required").min(1),
    CLOUDINARY_FOLDER: z
      .string()
      .regex(/^[a-z0-9_-]+$/i, "CLOUDINARY_FOLDER may only contain letters, numbers, - and _")
      .default("aba-mart"),
    MAX_UPLOAD_MB: z.coerce.number().min(1).max(10).default(5),

    /** WhatsApp number used when store settings are first created. Admins can change it later in Settings. */
    STORE_WHATSAPP_NUMBER: z
      .string()
      .transform((value, ctx) => {
        const normalized = normalizePhoneNumber(value);
        if (!normalized) {
          ctx.addIssue({ code: "custom", message: "STORE_WHATSAPP_NUMBER must be a phone number with country code, e.g. +233241234567" });
          return z.NEVER;
        }
        return normalized;
      })
      .optional(),

    WEB_REVALIDATE_URL: z.url().optional(),
    REVALIDATE_SECRET: z.string().min(24, "REVALIDATE_SECRET must be at least 24 characters").optional(),
  })
  .superRefine((value, ctx) => {
    const secure = value.COOKIE_SECURE ?? value.NODE_ENV === "production";
    if (value.COOKIE_SAME_SITE === "none" && !secure) {
      ctx.addIssue({
        code: "custom",
        path: ["COOKIE_SECURE"],
        message: "COOKIE_SAME_SITE=none requires secure cookies (COOKIE_SECURE=true)",
      });
    }
    if (value.WEB_REVALIDATE_URL && !value.REVALIDATE_SECRET) {
      ctx.addIssue({
        code: "custom",
        path: ["REVALIDATE_SECRET"],
        message: "REVALIDATE_SECRET is required when WEB_REVALIDATE_URL is set",
      });
    }
  });

// Treat empty values in .env files ("COOKIE_DOMAIN=") as unset.
const raw = Object.fromEntries(
  Object.entries(process.env).filter(([, value]) => value !== undefined && value.trim() !== ""),
);

const parsed = envSchema.safeParse(raw);

if (!parsed.success) {
  const problems = parsed.error.issues.map((issue) => `  - ${issue.path.join(".") || "env"}: ${issue.message}`);
  throw new Error(`Invalid environment configuration:\n${problems.join("\n")}\nSee apps/api/.env.example.`);
}

const data = parsed.data;

export const env = {
  ...data,
  isProduction: data.NODE_ENV === "production",
  isTest: data.NODE_ENV === "test",
  cookieSecure: data.COOKIE_SECURE ?? data.NODE_ENV === "production",
  maxUploadBytes: Math.round(data.MAX_UPLOAD_MB * 1024 * 1024),
  /** Options for market/config/mongodb.ts */
  mongo: {
    uri: data.MONGODB_URI,
    dbName: data.MONGODB_DB_NAME,
    dnsServers: data.DNS_SERVERS,
    log: data.NODE_ENV !== "test",
  },
  /** Credentials for market/config/cloudinary.ts */
  cloudinary: {
    cloudName: data.CLOUDINARY_CLOUD_NAME,
    apiKey: data.CLOUDINARY_API_KEY,
    apiSecret: data.CLOUDINARY_API_SECRET,
  },
} as const;

export type Env = typeof env;
