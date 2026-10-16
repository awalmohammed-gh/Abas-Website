import { z } from "zod";
import { CUSTOMER_NOTIFICATION_TYPES, FULFILLMENT_METHODS, LIMITS, ORDER_STATUSES } from "./constants.js";
import { normalizePhoneNumber } from "./phone.js";
import { SLUG_PATTERN } from "./text.js";

/* ------------------------------------------------------------ Building blocks */

export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");

export const pesewasSchema = z
  .int("Enter a valid amount")
  .min(0, "Amount cannot be negative")
  .max(LIMITS.maxPriceInPesewas, "Amount is too large");

export const stockSchema = z
  .int("Stock must be a whole number")
  .min(0, "Stock cannot be negative")
  .max(LIMITS.maxStock, "Stock is too large");

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(140, "Slug is too long")
  .regex(SLUG_PATTERN, "Use lowercase letters, numbers and dashes only");

export const imageAssetSchema = z.object({
  url: z.url({ protocol: /^https$/, error: "Image URL must use https" }).max(500),
  publicId: z.string().trim().min(1).max(300),
  alt: z.string().trim().max(160).optional(),
  width: z.int().positive().optional(),
  height: z.int().positive().optional(),
});

const optionalText = (max: number, label = "This field") =>
  z.string().trim().max(max, `${label} must be ${max} characters or fewer`).default("");

/** Relative site path ("/shop") or absolute https URL. Blocks javascript: and protocol-relative links. */
export const linkSchema = z
  .string()
  .trim()
  .max(300)
  .refine((v) => v === "" || /^\/(?!\/)[^\s]*$/.test(v) || /^https:\/\/[^\s]+$/.test(v), {
    message: "Use a site path like /shop or a full https:// link",
  });

const httpsUrlOrEmpty = z
  .string()
  .trim()
  .max(300)
  .refine((v) => v === "" || /^https:\/\/[^\s]+$/.test(v), { message: "Use a full https:// link" })
  .default("");

export const phoneSchema = z
  .string("Phone number is required")
  .trim()
  .min(1, "Phone number is required")
  .max(25, "Phone number is too long")
  .transform((value, ctx) => {
    const normalized = normalizePhoneNumber(value);
    if (!normalized) {
      ctx.addIssue({ code: "custom", message: "Enter a valid phone number, e.g. 024 123 4567" });
      return z.NEVER;
    }
    return normalized;
  });

/* ------------------------------------------------------------------ Products */

export const productOptionSchema = z.object({
  name: z.string().trim().min(1, "Option name is required").max(30),
  values: z
    .array(z.string().trim().min(1, "Option values cannot be empty").max(40))
    .min(1, "Add at least one value")
    .max(LIMITS.maxOptionValues),
});

export const variantAttributeSchema = z.object({
  name: z.string().trim().min(1).max(30),
  value: z.string().trim().min(1).max(40),
});

export const productVariantInputSchema = z.object({
  id: objectIdSchema.optional(),
  attributes: z.array(variantAttributeSchema).min(1).max(LIMITS.maxProductOptions),
  sku: z.string().trim().max(60).nullable().optional(),
  price: pesewasSchema.nullable().optional(),
  compareAtPrice: pesewasSchema.nullable().optional(),
  stock: stockSchema,
  isActive: z.boolean().default(true),
});

export const productInputSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(120),
    slug: slugSchema.optional(),
    description: optionalText(5000, "Description"),
    category: objectIdSchema,
    subCategory: optionalText(60, "Subcategory"),
    price: pesewasSchema,
    compareAtPrice: pesewasSchema.nullable().default(null),
    images: z.array(imageAssetSchema).max(LIMITS.maxProductImages, `Up to ${LIMITS.maxProductImages} images`).default([]),
    options: z.array(productOptionSchema).max(LIMITS.maxProductOptions).default([]),
    variants: z.array(productVariantInputSchema).max(LIMITS.maxVariants).default([]),
    stock: stockSchema.default(0),
    lowStockThreshold: z.int().min(0).max(10_000).default(LIMITS.defaultLowStockThreshold),
    isFeatured: z.boolean().default(false),
    isActive: z.boolean().default(true),
  })
  .superRefine((product, ctx) => {
    if (product.compareAtPrice !== null && product.compareAtPrice <= product.price) {
      ctx.addIssue({
        code: "custom",
        path: ["compareAtPrice"],
        message: "The regular price must be higher than the discount price",
      });
    }

    const optionNames = new Set<string>();
    product.options.forEach((option, index) => {
      const key = option.name.toLowerCase();
      if (optionNames.has(key)) {
        ctx.addIssue({ code: "custom", path: ["options", index, "name"], message: "Option names must be unique" });
      }
      optionNames.add(key);
      const values = option.values.map((v) => v.toLowerCase());
      if (new Set(values).size !== values.length) {
        ctx.addIssue({ code: "custom", path: ["options", index, "values"], message: "Option values must be unique" });
      }
    });

    if (product.options.length && !product.variants.length) {
      ctx.addIssue({ code: "custom", path: ["variants"], message: "Add at least one variant, or remove the options" });
    }
    if (product.variants.length && !product.options.length) {
      ctx.addIssue({ code: "custom", path: ["options"], message: "Variants need at least one option such as Size" });
    }

    const combinations = new Set<string>();
    product.variants.forEach((variant, index) => {
      const matchesOptions =
        variant.attributes.length === product.options.length &&
        variant.attributes.every((attribute, i) => {
          const option = product.options[i];
          return (
            option !== undefined &&
            option.name === attribute.name &&
            option.values.some((v) => v === attribute.value)
          );
        });
      if (!matchesOptions) {
        ctx.addIssue({
          code: "custom",
          path: ["variants", index, "attributes"],
          message: "Each variant must pick one value for every option",
        });
      }
      const key = variant.attributes.map((a) => a.value.toLowerCase()).join("|");
      if (combinations.has(key)) {
        ctx.addIssue({ code: "custom", path: ["variants", index], message: "This variant combination already exists" });
      }
      combinations.add(key);

      const effectivePrice = variant.price ?? product.price;
      if (variant.compareAtPrice !== null && variant.compareAtPrice !== undefined && variant.compareAtPrice <= effectivePrice) {
        ctx.addIssue({
          code: "custom",
          path: ["variants", index, "compareAtPrice"],
          message: "The regular price must be higher than the selling price",
        });
      }
    });
  });

export type ProductInput = z.output<typeof productInputSchema>;
export type ProductInputRaw = z.input<typeof productInputSchema>;

/* ---------------------------------------------------------------- Categories */

export const categoryInputSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(60),
  slug: slugSchema.optional(),
  description: optionalText(500, "Description"),
  image: imageAssetSchema.nullable().default(null),
  isActive: z.boolean().default(true),
  displayOrder: z.int().min(0).max(9999).default(0),
});

export type CategoryInput = z.output<typeof categoryInputSchema>;

/* ------------------------------------------------------------------- Banners */

export const bannerInputSchema = z
  .object({
    title: z.string().trim().min(2, "Heading must be at least 2 characters").max(90),
    description: optionalText(220, "Description"),
    desktopImage: imageAssetSchema,
    mobileImage: imageAssetSchema.nullable().default(null),
    buttonText: optionalText(30, "Button text"),
    buttonLink: linkSchema.default(""),
    displayOrder: z.int().min(0).max(9999).default(0),
    isActive: z.boolean().default(true),
  })
  .superRefine((banner, ctx) => {
    if (banner.buttonText && !banner.buttonLink) {
      ctx.addIssue({ code: "custom", path: ["buttonLink"], message: "Add a link for the button" });
    }
  });

export type BannerInput = z.output<typeof bannerInputSchema>;

/* ------------------------------------------------------------------ Settings */

export const DEFAULT_NOTIFICATION_SETTINGS = {
  enabled: true,
  newProducts: true,
  promotions: true,
  adminOrderAlerts: true,
  promptDelaySeconds: 30,
} as const;

export const DEFAULT_STOREFRONT_SETTINGS = {
  showFeaturedProducts: true,
  showNewArrivals: true,
} as const;

export const notificationSettingsSchema = z.object({
  enabled: z.boolean(),
  newProducts: z.boolean(),
  promotions: z.boolean(),
  adminOrderAlerts: z.boolean(),
  promptDelaySeconds: z.int("Enter whole seconds").min(5, "Use at least 5 seconds").max(600, "Use 600 seconds or fewer"),
});

export const storefrontSettingsSchema = z.object({
  showFeaturedProducts: z.boolean(),
  showNewArrivals: z.boolean(),
});

export const settingsInputSchema = z.object({
  storeName: z.string().trim().min(2, "Store name is required").max(60),
  storeDescription: optionalText(500, "Description"),
  logo: imageAssetSchema.nullable().default(null),
  favicon: imageAssetSchema.nullable().default(null),
  whatsappNumber: z
    .string()
    .trim()
    .max(25)
    .default("")
    .transform((value, ctx) => {
      if (!value) return "";
      const normalized = normalizePhoneNumber(value);
      if (!normalized) {
        ctx.addIssue({ code: "custom", message: "Enter the WhatsApp number with country code, e.g. 233241234567" });
        return z.NEVER;
      }
      return normalized;
    }),
  supportPhone: optionalText(30, "Support phone"),
  supportEmail: z.union([z.literal(""), z.email("Enter a valid email address").max(120)]).default(""),
  address: optionalText(200, "Address"),
  openingHours: optionalText(200, "Business hours"),
  announcement: optionalText(160, "Announcement"),
  socialLinks: z
    .object({
      facebook: httpsUrlOrEmpty,
      instagram: httpsUrlOrEmpty,
      tiktok: httpsUrlOrEmpty,
      x: httpsUrlOrEmpty,
      youtube: httpsUrlOrEmpty,
    })
    .default({ facebook: "", instagram: "", tiktok: "", x: "", youtube: "" }),
  whatsappOrderingEnabled: z.boolean().default(true),
  whatsappGreeting: optionalText(120, "Greeting"),
  whatsappSupportMessage: optionalText(300, "Support message"),
  notifications: notificationSettingsSchema.default(DEFAULT_NOTIFICATION_SETTINGS),
  storefront: storefrontSettingsSchema.default(DEFAULT_STOREFRONT_SETTINGS),
});

export type SettingsInput = z.output<typeof settingsInputSchema>;

/* -------------------------------------------------------------- Notifications */

/**
 * Site path a notification opens: "/shop" or "/products/x?ref=push". Absolute
 * URLs, protocol-relative "//host" and backslash tricks are rejected so a
 * notification can never send customers to another website.
 */
export function isSafeSitePath(value: string): boolean {
  return /^\/(?![/\\])[^\s\\]*$/.test(value) && !/^\/admin(?:[/?#]|$)/i.test(value);
}

export const notificationTargetSchema = z
  .string()
  .trim()
  .max(300, "Link must be 300 characters or fewer")
  .refine((v) => v === "" || isSafeSitePath(v), { message: "Use a store page path such as /shop or /products/your-product" })
  .default("");

export const notificationInputSchema = z.object({
  title: z.string("Title is required").trim().min(3, "Title must be at least 3 characters").max(80, "Title must be 80 characters or fewer"),
  message: z.string().trim().max(300, "Message must be 300 characters or fewer").default(""),
  type: z.enum(CUSTOMER_NOTIFICATION_TYPES, "Choose a notification type"),
  audience: z.enum(["public", "push_subscribers"], "Choose who receives it").default("public"),
  targetUrl: notificationTargetSchema,
  expiresAt: z.iso.datetime({ offset: true, error: "Enter a valid end date" }).nullable().default(null),
  sendPush: z.boolean().default(true),
  /** Publish immediately instead of saving a draft. */
  publish: z.boolean().default(false),
}).superRefine((value, ctx) => {
  if (value.expiresAt && Date.parse(value.expiresAt) <= Date.now()) {
    ctx.addIssue({ code: "custom", path: ["expiresAt"], message: "The end date must be in the future" });
  }
  if (value.audience === "push_subscribers" && !value.sendPush) {
    ctx.addIssue({ code: "custom", path: ["sendPush"], message: "Push-only notifications must be sent as push" });
  }
});

export type NotificationInput = z.output<typeof notificationInputSchema>;
export type NotificationInputRaw = z.input<typeof notificationInputSchema>;

export const notificationReadSchema = z
  .object({
    ids: z.array(objectIdSchema).max(100).optional(),
    all: z.boolean().optional(),
  })
  .refine((v) => v.all === true || (v.ids?.length ?? 0) > 0, { message: "Choose notifications to mark as read" });

export const notificationPreferencesSchema = z.object({
  newProducts: z.boolean(),
  promotions: z.boolean(),
});

/** Deletion must explicitly name items or select all; an empty body never deletes anything. */
export const notificationDeleteSchema = z.object({
  ids: z.array(objectIdSchema).min(1).max(100).optional(),
  all: z.literal(true).optional(),
}).strict().refine((value) => (value.all === true) !== (value.ids !== undefined), { message: "Choose notifications or select all" });

export const adminNotificationDeleteSchema = z.object({
  ids: z.array(objectIdSchema).min(1).max(100).optional(),
  all: z.literal(true).optional(),
  scope: z.enum(["all", "alerts", "customer"]).default("all"),
}).strict().refine((value) => (value.all === true) !== (value.ids !== undefined), { message: "Choose notifications or select all" });

const base64url = (min: number, max: number) => z.string().regex(new RegExp(`^[A-Za-z0-9_-]{${min},${max}}={0,2}$`), "Invalid key");

export const pushSubscriptionSchema = z.object({
  subscription: z.object({
    endpoint: z.url({ protocol: /^https$/, error: "Invalid push endpoint" }).max(1000),
    expirationTime: z.number().nullable().optional(),
    keys: z.object({ p256dh: base64url(80, 100), auth: base64url(16, 32) }),
  }),
  preferences: notificationPreferencesSchema.optional(),
});

export const pushUnsubscribeSchema = z.object({
  endpoint: z.url({ protocol: /^https$/, error: "Invalid push endpoint" }).max(1000),
});

/* ---------------------------------------------------------- Cart & checkout */

export const cartItemInputSchema = z.object({
  productId: objectIdSchema,
  variantId: objectIdSchema.nullable().optional(),
  quantity: z
    .int("Quantity must be a whole number")
    .min(1, "Quantity must be at least 1")
    .max(LIMITS.maxLineQuantity, `Quantity cannot exceed ${LIMITS.maxLineQuantity}`),
});

export const quoteRequestSchema = z.object({
  items: z.array(cartItemInputSchema).min(1, "Your cart is empty").max(LIMITS.maxCartLines),
});

export const checkoutCustomerSchema = z
  .object({
    name: z.string("Your name is required").trim().min(2, "Enter your name").max(80, "Name is too long"),
    phone: phoneSchema,
    fulfillmentMethod: z.enum(FULFILLMENT_METHODS, "Choose delivery or pickup"),
    deliveryLocation: optionalText(120, "Delivery location"),
    deliveryAddress: optionalText(300, "Address"),
    notes: optionalText(500, "Notes"),
  })
  .superRefine(
    (value, ctx) => {
      if (value.fulfillmentMethod === "delivery" && (value.deliveryLocation ?? "").length < 2) {
        ctx.addIssue({
          code: "custom",
          path: ["deliveryLocation"],
          message: "Enter your delivery area or town",
        });
      }
    },
    {
      // Still check the location when other fields (e.g. phone) are invalid, so every error shows at once.
      when: (payload) =>
        !payload.issues.some((issue) => ["fulfillmentMethod", "deliveryLocation"].includes(String(issue.path?.[0]))),
    },
  );

export type CheckoutCustomerInput = z.output<typeof checkoutCustomerSchema>;

export const whatsappOrderSchema = z.object({
  idempotencyKey: z
    .string()
    .min(16)
    .max(100)
    .regex(/^[A-Za-z0-9_-]+$/, "Invalid request key"),
  customer: checkoutCustomerSchema,
  items: quoteRequestSchema.shape.items,
  /** Total the customer saw. If prices changed since, the API asks them to review. */
  expectedTotal: pesewasSchema.optional(),
});

export type WhatsAppOrderInput = z.output<typeof whatsappOrderSchema>;

/* --------------------------------------------------------------------- Admin */

export const adminLoginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address").max(254)),
  password: z.string().min(1, "Password is required").max(200),
});

export const orderStatusUpdateSchema = z.object({
  status: z.enum(ORDER_STATUSES),
  note: optionalText(300, "Note"),
});

export const stockUpdateSchema = z.object({
  variantId: objectIdSchema.nullable().optional(),
  stock: stockSchema,
});

/** Turns a ZodError into { "field.path": "message" } for forms. */
export function flattenIssues(issues: readonly { path: PropertyKey[]; message: string }[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join(".") || "_form";
    if (!(key in result)) result[key] = issue.message;
  }
  return result;
}
