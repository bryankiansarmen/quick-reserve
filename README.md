# Quick Reserve — Web

The **Quick Reserve** marketplace web application. A two-sided platform where Space
Owners (Sellers) list bookable venues — photo studios, event venues, meeting rooms,
activity spaces — and Renters (Buyers) search, book, and pay for time slots in those
spaces. Multi-tenant data isolation, Stripe payment processing, SSR, and a
real-time-capable booking system.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4 |
| Backend | Next.js Route Handlers (API logic) |
| Database | PostgreSQL via Supabase (Row Level Security, Auth, Storage) |
| Payments | Stripe (Payment Intents) |
| Email | Resend (sent via the companion webhook service) |

Stripe webhook handling and transactional email are delegated to the companion
[quick-reserve-webhook-service](https://github.com/bryankiansarmen/quick-reserve-webhook-service),
a standalone Node/Express service that owns payment-state transitions on a stable,
always-listening endpoint.

## Getting Started

### Prerequisites

- Node.js 20+ (npm)
- A Supabase project (URL + anon key)
- Stripe test-mode keys
- The webhook service running locally (for cancellation emails)

### Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the environment template and fill in your values:

   ```bash
   cp .env.example .env.local
   ```

   | Variable | Purpose |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon (client) key |
   | `STRIPE_SECRET_KEY` | Stripe secret key (test mode) |
   | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (test mode) |
   | `WEBHOOK_SERVICE_URL` | Base URL of the webhook service |
   | `INTERNAL_NOTIFICATION_TOKEN` | Shared secret the webhook service verifies on `x-internal-token` |

   Both `WEBHOOK_SERVICE_URL` and `INTERNAL_NOTIFICATION_TOKEN` are only required for
   booking-cancellation emails. If unset, cancellations still succeed and the email
   step is skipped with a logged warning.

3. Start the development server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm start` | Start the production server |
| `npm run lint` | Run ESLint |
| `npm test` | Unit tests (excludes integration/API tests) |
| `npm run test:integration` | Integration tests (requires `TEST_INTEGRATION=true` and a local Supabase) |
| `npm run test:api` | API route tests |
| `npm run test:all` | Full suite (unit + integration + API) |
| `npm run test:coverage` | Unit tests with coverage report |

## Project Structure

```
app/
  api/            # Route Handlers: listings, bookings, reviews, seller dashboards
  auth/           # Auth pages (login, signup)
  checkout/       # Stripe payment flow
  dashboard/      # Buyer & Seller dashboards
  listings/       # Listing browse/detail (SSR)
  search/         # Search & filter
features/         # Feature modules (auth, availability, bookings, reviews, etc.)
components/       # Shared UI and layout components
lib/              # Stripe, Supabase, email, and utility libraries
supabase/         # Database migrations and seed data
```

## Environment & Data

Database schema, RLS policies, and seed data live in `supabase/` (see `seed.sql` for
local test data). Row Level Security is the primary authorization mechanism — API
routes rely on it rather than client-side-only checks.

## Related

- [quick-reserve-webhook-service](https://github.com/bryankiansarmen/quick-reserve-webhook-service) — Stripe webhook + email companion service
