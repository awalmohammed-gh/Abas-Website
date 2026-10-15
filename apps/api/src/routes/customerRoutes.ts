import { Router } from "express";
import { z } from "zod";
import { cartItemInputSchema, quoteRequestSchema } from "@aba-mart/shared";
import { requireCustomer, requireCustomerCsrf } from "../middleware/customerSession.js";
import { orderLimiter, quoteLimiter } from "../middleware/security.js";
import { parseQuery, validateBody, validateIdParam } from "../middleware/validate.js";
import { createCustomerSession, guestCsrf, issueRecoveryToken, recoverCustomerSession, resolveCustomerSession, resetCustomerSession } from "../services/customerSessionService.js";
import { cartKey, getCart, mutateCart } from "../services/cartService.js";
import { getCustomerOrder, listCustomerOrders, recordHandoff } from "../services/orderService.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { sendSuccess } from "../utils/respond.js";

export const customerRouter = Router();
customerRouter.use(quoteLimiter, (_req, res, next) => {
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("Vary", "Origin, Cookie");
  next();
});
customerRouter.get("/session", asyncHandler(async (req, res) => {
  const session = await resolveCustomerSession(req) ?? await createCustomerSession(res);
  sendSuccess(res, { csrfToken: guestCsrf(session), expiresAt: session.expiresAt.toISOString() });
}));
customerRouter.post("/session/reset", requireCustomer, requireCustomerCsrf, asyncHandler(async (req, res) => {
  const session = await resetCustomerSession(req.customerSession!, res);
  sendSuccess(res, { csrfToken: guestCsrf(session), expiresAt: session.expiresAt.toISOString() });
}));
customerRouter.post("/recovery-token", requireCustomer, requireCustomerCsrf, asyncHandler(async (req, res) => {
  sendSuccess(res, await issueRecoveryToken(req.customerSession!));
}));
customerRouter.post("/recover", orderLimiter, requireCustomer, requireCustomerCsrf,
  validateBody(z.object({ token: z.string().trim().regex(/^[A-Za-z0-9_-]{43}$/, "Enter a valid recovery code") })),
  asyncHandler(async (req, res) => {
    const session = await recoverCustomerSession(req.body.token as string, req.customerSession!, res);
    sendSuccess(res, { csrfToken: guestCsrf(session), expiresAt: session.expiresAt.toISOString() });
  }),
);

export const cartRouter = Router();
cartRouter.use(quoteLimiter, requireCustomer);
cartRouter.get("/", asyncHandler(async (req, res) => sendSuccess(res, await getCart(req.customerSession!))));
cartRouter.use(requireCustomerCsrf);
cartRouter.post("/items", validateBody(cartItemInputSchema), asyncHandler(async (req, res) => {
  const item = { ...req.body, variantId: req.body.variantId ?? null };
  const quote = await mutateCart(req.customerSession!, (items) => {
    const existing = items.find((line) => cartKey(line) === cartKey(item));
    if (existing) existing.quantity += item.quantity;
    else items.push(item);
    return items;
  });
  sendSuccess(res, quote);
}));
// Replaces only this session's lines, useful when explicitly reviewing a stale cart.
cartRouter.put("/", validateBody(quoteRequestSchema), asyncHandler(async (req, res) => {
  const items = req.body.items.map((item: z.output<typeof cartItemInputSchema>) => ({ ...item, variantId: item.variantId ?? null }));
  const keys = new Set(items.map(cartKey));
  if (keys.size !== items.length) throw new ApiError(400, "VALIDATION_ERROR", "Duplicate cart lines are not allowed.");
  sendSuccess(res, await mutateCart(req.customerSession!, () => items));
}));
cartRouter.patch("/items/:id", validateBody(z.object({ quantity: cartItemInputSchema.shape.quantity })), asyncHandler(async (req, res) => {
  const id = String(req.params.id);
  sendSuccess(res, await mutateCart(req.customerSession!, (items) => {
    const item = items.find((line) => cartKey(line) === id);
    if (!item) throw ApiError.notFound("Cart item not found.");
    item.quantity = req.body.quantity as number;
    return items;
  }));
}));
cartRouter.delete("/items/:id", asyncHandler(async (req, res) => {
  sendSuccess(res, await mutateCart(req.customerSession!, (items) => items.filter((item) => cartKey(item) !== String(req.params.id)), false));
}));
cartRouter.delete("/", asyncHandler(async (req, res) => sendSuccess(res, await mutateCart(req.customerSession!, () => [], false))));

export const myOrdersRouter = Router();
myOrdersRouter.use(quoteLimiter, requireCustomer);
myOrdersRouter.get("/", asyncHandler(async (req, res) => {
  const { page } = parseQuery(z.object({ page: z.coerce.number().int().min(1).max(10_000).default(1) }), req.query);
  sendSuccess(res, await listCustomerOrders(req.customerSession!, page));
}));
myOrdersRouter.get("/:id", validateIdParam, asyncHandler(async (req, res) => {
  sendSuccess(res, await getCustomerOrder(req.customerSession!, String(req.params.id)));
}));
myOrdersRouter.post("/:id/handoff", orderLimiter, requireCustomerCsrf, validateIdParam, asyncHandler(async (req, res) => {
  await recordHandoff(req.customerSession!, String(req.params.id));
  sendSuccess(res, { initiated: true });
}));
