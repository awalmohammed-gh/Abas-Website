import { z } from "zod";
import { ADMIN_ROLES, adminIdentifierSchema } from "@aba-mart/shared";

export const environmentAdminSchema = z.object({
  ADMIN_EMAIL: adminIdentifierSchema.optional(),
  ADMIN_PASSWORD: z.string().min(8, "ADMIN_PASSWORD must be at least 8 characters").max(200)
    .refine((value) => /[A-Za-z]/.test(value) && /\d/.test(value), "ADMIN_PASSWORD must contain letters and numbers").optional(),
  ADMIN_NAME: z.string().trim().min(2).max(80).default("Store Administrator"),
  ADMIN_ROLE: z.enum(ADMIN_ROLES).default("super_admin"),
}).superRefine((value, ctx) => {
  if (Boolean(value.ADMIN_EMAIL) !== Boolean(value.ADMIN_PASSWORD)) {
    ctx.addIssue({ code: "custom", path: ["ADMIN_PASSWORD"], message: "Set ADMIN_EMAIL and ADMIN_PASSWORD together" });
  }
});
