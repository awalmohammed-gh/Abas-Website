/**
 * Creates (or updates the password of) an administrator from environment variables:
 *
 *   ADMIN_EMAIL=owner@example.com ADMIN_PASSWORD='a long passphrase' ADMIN_NAME='Store Owner' npm run create-admin
 *
 * There is intentionally no public registration endpoint and no default account.
 */
import { z } from "zod";
import { ADMIN_ROLES } from "@aba-mart/shared";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { Admin } from "../models/Admin.js";
import { hashPassword } from "../services/authService.js";

const inputSchema = z.object({
  ADMIN_EMAIL: z.string("ADMIN_EMAIL is required").trim().toLowerCase().pipe(z.email("ADMIN_EMAIL must be a valid email")),
  ADMIN_PASSWORD: z
    .string("ADMIN_PASSWORD is required")
    .min(10, "ADMIN_PASSWORD must be at least 10 characters")
    .max(200)
    .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), "ADMIN_PASSWORD must contain letters and numbers"),
  ADMIN_NAME: z.string().trim().min(2).max(80).default("Store Administrator"),
  ADMIN_ROLE: z.enum(ADMIN_ROLES).default("super_admin"),
});

async function main(): Promise<void> {
  const parsed = inputSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Cannot create admin:");
    for (const issue of parsed.error.issues) console.error(`  - ${issue.message}`);
    process.exitCode = 1;
    return;
  }
  const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME, ADMIN_ROLE } = parsed.data;

  await connectDatabase();
  try {
    const passwordHash = await hashPassword(ADMIN_PASSWORD);
    const existing = await Admin.findOne({ email: ADMIN_EMAIL });
    if (existing) {
      existing.passwordHash = passwordHash;
      existing.status = "active";
      existing.tokenVersion += 1; // sign out existing sessions after a password reset
      await existing.save();
      console.log(`Updated password for existing admin ${ADMIN_EMAIL}. Existing sessions were signed out.`);
    } else {
      await Admin.create({ email: ADMIN_EMAIL, name: ADMIN_NAME, passwordHash, role: ADMIN_ROLE, status: "active" });
      console.log(`Created ${ADMIN_ROLE} account for ${ADMIN_EMAIL}.`);
    }
  } finally {
    await disconnectDatabase();
  }
}

main().catch((error: unknown) => {
  console.error("Failed to create admin:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
