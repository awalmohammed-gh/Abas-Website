import { Schema, model, type Types } from "mongoose";
import { ADMIN_ROLES, type AdminRole } from "@aba-mart/shared";

export interface AdminDoc {
  _id: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: AdminRole;
  status: "active" | "disabled";
  /** Incremented on logout and password change to invalidate existing sessions. */
  tokenVersion: number;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const adminSchema = new Schema<AdminDoc>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ADMIN_ROLES, default: "admin" },
    status: { type: String, enum: ["active", "disabled"], default: "active" },
    tokenVersion: { type: Number, default: 0 },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true },
);

adminSchema.index({ email: 1 }, { unique: true });

export const Admin = model<AdminDoc>("Admin", adminSchema);
