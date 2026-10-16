import { z } from "zod";
import { ORDER_STATUSES, orderStatusUpdateSchema, quoteRequestSchema, whatsappOrderSchema } from "@aba-mart/shared";

export { orderStatusUpdateSchema, quoteRequestSchema, whatsappOrderSchema };

export const adminOrderQuerySchema = z.object({
  status: z.enum(["all", ...ORDER_STATUSES]).default("all"),
  q: z.string().trim().max(100).default(""),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type AdminOrderQuery = z.output<typeof adminOrderQuerySchema>;
