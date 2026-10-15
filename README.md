# ABA Mart

Multi-category online store for Ghana with **WhatsApp click-to-chat checkout**. Customers browse, build a cart and send a ready-written order to the store on WhatsApp. No account and no online payment is needed. Staff manage products, stock, orders, banners and settings in a secure admin portal.

| Part | Stack |
| --- | --- |
| `apps/web` | Next.js 16 (App Router, Cache Components), React 19, TypeScript, Tailwind CSS 4, React Icons |
| `apps/api` | Express 5, TypeScript, MongoDB + Mongoose 9, Zod 4, JWT (HTTP-only cookie), Cloudinary |
| `packages/shared` | Shared types, Zod schemas, money / phone / WhatsApp helpers (no server code) |

npm workspaces; one lockfile at the root.

## Project structure

```text
market/
├── apps/
│   ├── web/                 Next.js app
│   │   └── src/app/         all routes: (store)/…, admin/…, api/revalidate
│   │                        (Next.js requires app/ or src/app/ as the route root)
│   └── api/                 Express API: models, controllers, routes, middleware,
│                            services, validators, utils, scripts
├── components/              all reusable React components (layout, home, products,
│                            cart, admin, ui, brand, contact), imported as @/components/…
├── config/
│   ├── mongodb.ts           the single MongoDB connection (used by the API, scripts, tests)
│   └── cloudinary.ts        the single Cloudinary configuration
├── packages/shared/         types, Zod schemas, money/phone/WhatsApp helpers
└── data/                    mock catalogue images + data.ts (used by npm run seed:mock)
```

- **Route-only files stay next to their routes:** `page`, `layout`, `loading`, `error`, `not-found` and the admin page bodies (`*View.tsx`).
- **Shared components live at the root:** `components/` sits outside the app. `apps/web/tsconfig.json` maps `@/components/*` to it, and `globals.css` tells Tailwind to scan it (`@source`).
- **`config/` takes values, it doesn't read them:** the API validates environment variables (`apps/api/src/config/env.ts`) and passes the values into `config/mongodb.ts` and `config/cloudinary.ts`. So credentials are validated in one place and the connection code exists once.

---

## Quick start

Requirements: Node.js 22.12+ (developed on Node 24), a MongoDB Atlas cluster (or any MongoDB replica set), and a Cloudinary account.

```bash
npm install

cp apps/api/.env.example apps/api/.env          # fill in MongoDB, JWT, Cloudinary, admin
cp apps/web/.env.example apps/web/.env.local    # API URL, site URL, revalidate secret

npm run create-admin    # creates the first admin from ADMIN_EMAIL / ADMIN_PASSWORD in apps/api/.env
npm run dev             # shared (watch) + API on :5000 + web on :3000
```

Then:

1. Sign in at **http://localhost:3000/admin/login**.
2. Check **Settings**. Customer orders go to the WhatsApp number there (pre-filled from `STORE_WHATSAPP_NUMBER`, currently +233 27 885 7814).
3. Add or edit **categories** and **products** (images, prices, stock, variants).
4. Optionally add homepage **banners**. Without banners the homepage shows a branded introduction.

### Starter catalogue from `/data`

`npm run seed:mock` loads the mock clothing catalogue from `data/` into the database: 8 categories and 20 products. The product images are uploaded to Cloudinary.

- **Kept from the mock data:** price, discount price, sizes (as Size variants, with stock split across sizes) and bestseller (as "featured").
- **Not imported:** mock ratings, review counts and orders, because orders must come from real customers.
- **Corrected:** for `img12`–`img19` the mock names, categories and descriptions didn't match the photos, so the seed names them after what each photo shows. See `apps/api/src/scripts/mockCatalog.ts`.
- **Safe to re-run:** existing products are left unchanged. `npm run seed:mock -- --remove` takes the starter catalogue out again (products already used in orders are archived, not deleted).

The storefront only ever shows what is in the database. With no products it shows empty states.

## Scripts (run from the repository root)

| Command | What it does |
| --- | --- |
| `npm run dev` | Builds `shared`, then runs shared (watch), API and web together |
| `npm run build` | Production build of shared, API (`apps/api/dist`) and web (`.next`) |
| `npm run start:api` / `npm run start:web` | Run the production builds |
| `npm run typecheck` | TypeScript checks for every workspace |
| `npm run lint` | ESLint for the API, the web app, `components/` and `config/` |
| `npm test` | Shared unit tests and API integration tests (in-memory MongoDB replica set) |
| `npm run create-admin` | Create an admin, or reset an existing admin's password (signs out their sessions) |
| `npm run seed:mock` | Load the starter catalogue from `data/` (`-- --remove` to take it out again) |

## How WhatsApp checkout works

1. Each guest receives an unpredictable HTTP-only cookie. MongoDB stores its SHA-256 hash, expiration, and that visit's cart (product IDs, optional variant IDs, and quantities). The browser does not store cart ownership secrets or authoritative prices in localStorage.
2. `GET /api/cart` and the cart mutation endpoints return current database prices and stock. Additions and quantity changes validate inventory and use a revision check to preserve concurrent changes from other tabs. The stateless `POST /api/orders/quote` endpoint remains available for price checks.
3. "Order via WhatsApp" collects name, phone, delivery or pickup, location and notes, validated in the browser and again on the server.
4. `POST /api/orders/whatsapp` loads authoritative prices and stock, rejects unavailable or over-stock items, and saves a **WhatsApp Pending** order with a reference such as `ABA-000125`. It then builds the message and the `https://wa.me/<number>?text=<encoded>` click-to-chat link. No WhatsApp Business API, tokens or webhooks are involved.

   The number comes from **Admin → Settings** (stored in MongoDB). `STORE_WHATSAPP_NUMBER` in `apps/api/.env` sets the initial value; otherwise first-time setup defaults to ABA Mart's `233278857814` (local `0278857814`). Existing saved settings remain authoritative.
5. The browser saves the prepared request and attempts to open WhatsApp in a tab reserved during the click. A blocked or closed tab leaves the cart untouched. After initiating the handoff, the browser calls `POST /api/my-orders/:id/handoff`; a transaction removes only that order's quantities from this session's cart. Repeating the handoff does not clear newly added items again. **Open WhatsApp**, **Copy order message**, and private history offer retries using the existing order.

### Private guest order history

WhatsApp messages include each product's primary Cloudinary image URL from its saved order snapshot and an image-rich `/order-preview/<token>` link. Click-to-Chat shares these as text links; it cannot attach product photos automatically, and WhatsApp link previews are not guaranteed. Products without a usable image still appear in the order summary with a placeholder.

Shared previews expose only the store name, order reference, product images, variants, quantities, prices, totals, and preparation/expiration dates. They omit customer names, phone numbers, addresses, notes, internal database IDs, and private order history. Preview links use a separate 256-bit token derived from a random per-order nonce and a purpose-specific HMAC; only the token hash is used for public lookup. Links expire after seven days. An owner's private history or checkout retry renews an expired link and invalidates the previous token. Responses disable caching and indexing and use `Referrer-Policy: no-referrer`.

`STOREFRONT_URL` in the API environment controls the origin of preview links; it defaults to the first `CLIENT_ORIGIN`. Set it to the public HTTPS storefront origin in production. `GET /api/orders/preview/:token` validates the token on the server and returns the restricted product summary (404 for invalid links, 410 for expired links). No new database or Cloudinary connection, duplicate image upload, WhatsApp Business API, or messaging provider is used.

`/my-orders` lists only orders owned by the HTTP-only guest cookie. Both list and detail endpoints enforce ownership on the API, return `private, no-store`, and exclude internal admin history. Phone numbers and order references cannot authorize access. Orders prepared before guest ownership was introduced remain available to admins; they are not assigned to visitors by matching names or phone numbers.

Guest cookies expire after 30 days. Cookie removal starts a new empty visit. Carts in the old localStorage format are not automatically attached to a new session because their ownership cannot be verified. No Google sign-in, customer account, or password is required or implemented.

The **Guest privacy & recovery** panel can start a fresh visit on a shared browser. This revokes the previous cookie and hides its cart and orders. An optional private recovery code can restore an earlier visit without merging it into the current one. Codes are generated from 32 random bytes, stored only as hashes, expire after 180 days, and are consumed when used. Recovery rotates the cookie and CSRF token and invalidates previous browser access. Creating a new code revokes the previous code; keep it private, since possession grants access to that visit.

Guest API endpoints:

- `GET /api/customer/session`: create or resume a guest session and return its in-memory CSRF token.
- `POST /api/customer/session/reset`: start a fresh visit and revoke the old cookie.
- `POST /api/customer/recovery-token`, `POST /api/customer/recover`: issue or redeem an optional private recovery code.
- `GET /api/cart`, `POST /api/cart/items`, `PUT /api/cart`, `PATCH /api/cart/items/:id`, `DELETE /api/cart/items/:id`, `DELETE /api/cart`: mutate only the cookie owner's cart. Item IDs are `productId:variantId` or `productId:base`.
- `GET /api/my-orders`, `GET /api/my-orders/:id`: private, paginated order history and order details.
- `POST /api/my-orders/:id/handoff`: idempotently record initiation and clear the ordered quantities. It never confirms, pays, or completes an order.

All guest mutations require the current session's `X-CSRF-Token`. The browser uses the existing CORS allowlist and credentials mode. Host-only guest cookies use `Secure` in production and the configured SameSite policy; keep frontend and API cookie settings appropriate to their deployed domains. Session and CSRF handling follows the [OWASP session-management guidance](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) and [CSRF guidance](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html).

Safeguards:
- **Duplicate submissions**: every checkout carries an idempotency key, so a retry returns the same order.
- **Changed prices**: if the total changed since the customer last saw it, the API asks them to review the cart.
- **Stock**: opening WhatsApp never changes stock, confirms the order or marks it paid.

### Order statuses and inventory policy

`WhatsApp Pending → Confirmed → Processing → Ready for Pickup / Out for Delivery → Completed` (any non-final status can become `Cancelled`).

- Stock is deducted **once**, in a MongoDB transaction, when an admin first confirms the order. The confirmation fails cleanly if any item lacks stock, so stock never goes negative or partially deducts.
- Cancelling a confirmed order returns its stock. Cancelling a pending order doesn't touch stock.
- Repeating a status update is a no-op. Concurrent confirmations cannot oversell; this is covered by tests.
- Each change is recorded in the order's status history with the admin and an optional note.

## Security

- Admin login uses bcrypt (12 rounds) and a JWT in an **HTTP-only** cookie scoped to `/api/admin`. `Secure` is set in production and `SameSite` is configurable. Sessions expire after `JWT_EXPIRES_IN_HOURS`.
- Logout and password resets revoke all sessions server-side (token version).
- **CSRF**: every state-changing admin request needs an `X-CSRF-Token` bound to the session. The token is kept in memory only, never in `localStorage`. Unsafe requests from origins outside `CLIENT_ORIGIN` are rejected.
- CORS allowlist, Helmet headers, rate limits on login, checkout, quotes, uploads and the API overall, and a 100 KB JSON body limit.
- Every admin route checks the session on the server. The dashboard's client-side gate is only for convenience.
- Prices and totals from the browser are never trusted. Inputs are validated with Zod (shared schemas), and errors are returned as a consistent JSON shape without stack traces or raw database errors.
- Uploads accept only JPEG, PNG, WebP or AVIF up to 5 MB. Each file is checked by its signature, not just its declared type. Only Cloudinary URLs from this account and folder are accepted on products, categories, banners and settings.
- Admin pages send `noindex` (metadata and `X-Robots-Tag`) and are disallowed in `robots.txt`.
- There is no public registration endpoint and no default admin account.

## Data model (MongoDB)

`Admin`, `Category`, `Product` (with variants), `Order` (snapshots of name, variant and unit price at order time), `Banner`, `Settings` (single document), `Counter` (order reference sequence).

All money is stored as **integer pesewas** (GHS 45.00 = `4500`) and formatted only for display. Products have an optional **subcategory** (e.g. "Jeans", "Shower Gel"), shown on cards and included in search. Products are **archived** rather than deleted, so order history stays intact. A category can't be deleted while any product uses it; hide it instead.

## Caching

Storefront pages read the catalogue on the server with `"use cache"` and tags (`products`, `categories`, `banners`, `settings`). After any admin change the API calls `POST /api/revalidate` on the web app (shared `REVALIDATE_SECRET`), so changes appear immediately. Without that, cached pages refresh within about a minute.

If the API is unreachable, failed reads are cached for seconds only and the page shows an honest "couldn't load" state, so the web app also **builds without the API running**.

The cart quote and checkout always hit the API directly, so stock and prices are never served from a stale cache.

## Deployment notes

- **API** (Render, Railway, a VPS…): `npm run build -w @aba-mart/shared && npm run build -w @aba-mart/api`, then `npm run start:api` (runs `apps/api/dist/apps/api/src/server.js`; the build also compiles `config/`). Set `NODE_ENV=production` and `TRUST_PROXY=1` behind a proxy.
- **Web** (Vercel or any Node host): build `apps/web` after `packages/shared`. Set `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL`, `REVALIDATE_SECRET` and `CLOUDINARY_CLOUD_NAME`.
- **Same parent domain** (e.g. `shop.example.com` and `api.example.com`): `COOKIE_SAME_SITE=lax`. **Different domains**: `COOKIE_SAME_SITE=none` and `COOKIE_SECURE=true`.
- Add every storefront origin to the API's `CLIENT_ORIGIN`, comma-separated.
- MongoDB must be a replica set (Atlas always is), because order confirmation uses transactions.

## Development notes

- In development, `GET /api/health` also reports `databaseName`, the database the API is actually connected to. This is hidden in production.
- `npm run dev` runs the API with `tsx watch`, which restarts it on every file change using `apps/api/.env`. Stop it before running anything against a test database on the same port.

## Known notes

- `npm audit` reports 5 high-severity advisories, all in **dev-only lint tooling** (`eslint-config-next → fast-glob → micromatch → braces`). No patched version exists, and the only automatic "fix" downgrades to the Next 14 config. Nothing in the runtime apps is affected.
- ESLint stays on v9 because Next's ESLint plugins (`react`, `import`, `jsx-a11y`) don't support ESLint 10 yet.
- **`querySrv` / `queryTxt` errors (ECONNREFUSED or ETIMEOUT) when connecting to Atlas:** some networks block the DNS lookups that `mongodb+srv://` needs. Use Atlas's *standard* connection string instead (`mongodb://host1,host2,host3/?tls=true&authSource=admin&replicaSet=…`), which skips those lookups. `apps/api/.env` on this PC already uses it. Alternatively set `DNS_SERVERS=1.1.1.1,8.8.8.8`.
- **Dev server reloading the page over and over:** stop it, delete `apps/web/.next`, and start it again. A leftover production build in that folder can confuse the dev file watcher.
- The `type/` folder at the repo root contains older standalone type definitions. They're superseded by `packages/shared` and unused by the app; it is git-ignored and can be deleted.
