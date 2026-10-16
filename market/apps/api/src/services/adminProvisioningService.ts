import bcrypt from "bcryptjs";
import type { AdminRole } from "@aba-mart/shared";
import { Admin } from "../models/Admin.js";
import { hashPassword } from "./authService.js";

export interface EnvironmentAdmin {
  email: string;
  password: string;
  name: string;
  role: AdminRole;
}

/** Apply server-side environment credentials without rotating sessions on every restart. */
export async function synchronizeEnvironmentAdmin(credentials: EnvironmentAdmin | null): Promise<boolean> {
  if (!credentials) return false;
  const email = credentials.email.trim().toLowerCase();

  // A compare-and-set update also makes concurrent API startups harmless.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const existing = await Admin.findOne({ email }).select("+passwordHash");
    if (!existing) {
      try {
        await Admin.create({ email, name: credentials.name, role: credentials.role, passwordHash: await hashPassword(credentials.password), status: "active" });
        return true;
      } catch (error) {
        if ((error as { code?: number }).code === 11000) continue;
        throw error;
      }
    }

    const passwordMatches = await bcrypt.compare(credentials.password, existing.passwordHash);
    const sessionChanged = !passwordMatches || existing.role !== credentials.role || existing.status !== "active";
    if (!sessionChanged && existing.name === credentials.name) return false;
    const result = await Admin.updateOne(
      { _id: existing._id, tokenVersion: existing.tokenVersion, passwordHash: existing.passwordHash },
      {
        $set: {
          name: credentials.name,
          role: credentials.role,
          status: "active",
          ...(!passwordMatches ? { passwordHash: await hashPassword(credentials.password) } : {}),
        },
        ...(sessionChanged ? { $inc: { tokenVersion: 1 } } : {}),
      },
    );
    if (result.matchedCount) return true;
  }
  throw new Error("Could not synchronize the environment administrator. Restart the API and try again.");
}
