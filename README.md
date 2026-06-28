# Galaxy Prints

A storefront for selling and shipping 3D-printed goods, built with Next.js (App Router). Includes a customer-facing shop, checkout, order tracking, and points/loyalty program, plus an owner's dashboard for managing products, orders, and customers.

## Features

- **Storefront** — browse products, view details, add to cart (persisted in `localStorage`).
- **Checkout** — guest or signed-in checkout with shipping address capture. All pricing, stock, and points-redemption validation happens server-side against the live database; the client only ever supplies `productId` + `quantity`.
- **Points / loyalty program** — customers earn points on every purchase and can redeem points for a discount at checkout (capped per order). Full points ledger is visible in the customer account area and on the owner's customer detail page.
- **Order tracking** — signed-in customers can view their order history and status in `/account`. Guests can look up an order at `/track` using the order number and the email used at checkout (no account required).
- **Owner's dashboard** (`/owner`) — revenue/order stats, full product CRUD, order status + shipment tracking management, and customer list with the ability to manually adjust points.
- **Auth** — email/password accounts with `CUSTOMER` and `OWNER` roles. Protected routes are guarded both by middleware (`proxy.ts`) and by a server-side check in each route (defense in depth).

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router, Turbopack, Server Actions)
- React 19, TypeScript, Tailwind CSS v4
- SQLite via Node's built-in `node:sqlite` (no external DB needed)
- [Zod](https://zod.dev) for input validation, [jose](https://github.com/panva/jose) for JWT sessions, [bcryptjs](https://github.com/dcodeIO/bcrypt.js) for password hashing

## Getting started

```bash
npm install
npm run db:seed   # creates data/app.db and seeds demo accounts/products
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Seeded accounts (from `npm run db:seed`):

| Role     | Email                        | Password           |
| -------- | ----------------------------- | ------------------- |
| Owner    | `owner@galaxyprints.test`     | `OwnerPass123!`      |
| Customer | `customer@galaxyprints.test`  | `CustomerPass123!`   |

The customer account starts with a demo order and 250 points; the owner can sign in at `/owner` to manage the store.

## Environment variables

| Variable        | Required | Default                              | Notes                                                                 |
| ---------------- | -------- | -------------------------------------- | ---------------------------------------------------------------------- |
| `AUTH_SECRET`    | Yes (prod) | `dev-only-insecure-secret-change-me`  | Used to sign session JWTs. **Must** be set to a real random secret before deploying — the fallback is insecure and only intended for local development. |
| `DATABASE_PATH`  | No       | `<cwd>/data/app.db`                    | Path to the SQLite database file. Point this at a persistent disk mount in production (see below). |
| `OWNER_EMAIL`    | No       | —                                       | Used by `npm run db:init-owner` to create the real owner account in production. |
| `OWNER_PASSWORD` | No       | —                                       | Password for the account above. Use a strong, private password — never the demo password. |
| `OWNER_NAME`     | No       | `Owner`                                 | Display name for the account above.                                    |

## Scripts

- `npm run dev` — start the dev server (Turbopack)
- `npm run build` — production build
- `npm run start` — run the production build
- `npm run lint` — ESLint
- `npm run db:seed` — (re)seed the SQLite database with demo accounts, products, and one demo order. **Local development only** — do not run this in production, since the demo credentials are public (printed above).
- `npm run db:init-owner` — production-safe bootstrap: ensures the schema exists and creates a single owner account from `OWNER_EMAIL`/`OWNER_PASSWORD`/`OWNER_NAME`. Does not touch products, demo customers, or demo orders, and is safe to run on every boot (idempotent). If the owner env vars aren't set, it just ensures the schema exists and exits cleanly.

## Deploying to production

This app uses a local SQLite file (`node:sqlite`), so it needs a host that gives the running process a **writable, persistent filesystem** — not a stateless serverless platform like Vercel (whose functions run on a read-only filesystem). [Render](https://render.com) works well as a "Web Service" running a long-lived Node process.

1. **Environment**: Node. **Build command**: `npm install && npm run build`. **Start command**: `npm run db:init-owner && npm run start`.
2. **Persistent disk**: attach a disk (e.g. mount path `/data`, 1GB) so the database survives restarts/redeploys — without this, every redeploy wipes the database. This requires a paid instance tier; Render's free tier doesn't support disks.
3. **Environment variables**: set `AUTH_SECRET` (random secret), `DATABASE_PATH` (e.g. `/data/app.db`, matching the disk mount path above), and `OWNER_EMAIL` / `OWNER_PASSWORD` (real, private credentials for the actual store owner — do not reuse the demo credentials from `npm run db:seed`).
4. Redeploy. The catalog starts empty — add real products from `/owner` after signing in with the credentials from step 3.

## Project structure

- `src/app/` — routes (storefront, cart, checkout, account, owner dashboard, auth)
- `src/lib/db/` — SQLite client + schema
- `src/lib/repo/` — data access functions (users, products, orders, points)
- `src/lib/actions/` — Server Actions (checkout, product/order/customer management)
- `src/lib/auth/` — session/JWT handling and route guards
- `src/components/` — shared UI (header, cart provider, form helpers)
- `proxy.ts` — middleware-level auth gate for `/account/*` and `/owner/*`
