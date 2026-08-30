# U-Track

U-Track is The Circular Classroom's unified web platform for donation collection, inventory operations, analytics, reporting, and user administration.

This repository represents a migration from multi-service AWS infrastructure to a single Next.js application on Vercel with Supabase.

## Migration Summary

The current platform consolidates legacy systems into one codebase:

- AWS Cognito -> Supabase Auth
- AWS Lambda / ECS backends -> Next.js API Route Handlers
- AWS S3 -> Supabase Storage
- AWS SES / SNS -> Resend
- AWS-hosted PostgreSQL -> Supabase PostgreSQL (with Prisma)

Design goals implemented in this codebase:
- Single deployable Next.js app
- Shared domain logic under `lib/*`
- API-first backend surface under `app/api/*`
- Property-based and integration testing for migration correctness

## Core Product Modules

- Authentication and account management
- Role-based access control (Admin, SchoolStaff, PsgVolunteer, Parent)
- User management and sync flows
- Inventory item types, balances, and transaction state transitions
- Donation drives and collection workflows
- CSV/Excel upload, validation, approval, and processing pipeline
- Analytics (overview, collection, assembly, school)
- PDF report generation and health monitoring

## Tech Stack

- Next.js 16 App Router
- TypeScript
- React 19
- MUI 7 + Emotion
- Tailwind CSS 4
- Recharts
- Prisma 7 + PostgreSQL (`@prisma/adapter-pg` + `pg`)
- Supabase (Auth + Storage)
- Resend (email)
- Vitest + fast-check
- pnpm

## Architecture At A Glance

- UI routes and server rendering: `app/*`
- API handlers: `app/api/*`
- Domain logic: `lib/auth`, `lib/csv`, `lib/inventory`, `lib/analytics`, `lib/reports`
- Data layer: `lib/prisma/client.ts` + `prisma/schema.prisma`
- Supabase client factories: `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/admin.ts`
- Middleware auth enforcement: `proxy.ts`

## Project Structure

```text
app/
	api/                    # Auth, users, inventory, csv, analytics, reports, health
	auth/                   # Login, signup, reset, forgot, mfa, set-new-password flows
	analytics/              # Dashboard pages
	inventory/              # Inventory pages and subroutes
	users/                  # User management pages
components/               # Shared UI building blocks and domain widgets
lib/
	auth/                   # Validation, role checks, auth helpers
	csv/                    # Parse, validate, process pipeline
	inventory/              # Balance and transaction rules
	analytics/              # Metrics and aggregation logic
	reports/                # PDF report logic
	supabase/               # Browser/server/admin clients
	prisma/                 # Prisma client singleton
prisma/
	schema.prisma
	migrations/
__tests__/
```

## Local Setup

### Prerequisites

- Node.js LTS
- pnpm 11+
- Supabase project credentials
- Postgres connection strings

### Install

```bash
pnpm install
```

### Environment

Start from the provided template:

```bash
cp .env.local.example .env.local
```

Required app keys:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=

# Database
POSTGRES_PRISMA_URL=
POSTGRES_URL_NON_POOLING=

# Email
RESEND_API_KEY=
RESEND_FROM_EMAIL=
```

Notes:
- Runtime validation is in `lib/env.ts`.
- `POSTGRES_PRISMA_URL` is used for app queries.
- `POSTGRES_URL_NON_POOLING` is used for migration/direct DB workflows.

### Run

```bash
pnpm dev
```

## Scripts

```bash
pnpm dev            # Start development server
pnpm build          # prisma generate + next build
pnpm start          # Start production server
pnpm lint           # Lint
pnpm test           # Run tests once
pnpm test:watch     # Watch tests

pnpm db:generate    # Prisma client generation
pnpm db:migrate     # Deploy migrations
pnpm db:push        # Push schema (no migration files)
pnpm db:seed        # Run seed command (if configured)
```

## API Domains

Implemented under `app/api/*`:

- `auth/*`: login, signup/register, mfa, password recovery, session/refresh, profile
- `users/*`: list/create/update/delete/deactivate/sync/me
- `inventory/*`: item types, balances, transactions, config entities
- `csv/*`: upload, validate, approve processing
- `analytics/*`: overview, collection, assembly
- `donations/*`: donation drive operations
- `reports/*` and `report/*`: report payloads and PDF generation
- `storage/*`: image/file storage operations
- `health`: system health + DB connectivity

## Data and Security Model

- Unified Prisma schema in `prisma/schema.prisma`
- `User.supabaseAuthId` is the auth identity anchor
- Middleware enforces protected-route auth and role checks
- Role model: `Admin`, `SchoolStaff`, `PsgVolunteer`, `Parent`
- RLS migration artifacts are included in Prisma migrations for DB-level defense-in-depth

## CSV Processing Pipeline

Typical flow:

1. Upload file (`csv`, `xls`, `xlsx`) to pre-processing storage
2. Validate required fields and DB constraints
3. Move to validated or failed storage path
4. Notify uploader by email
5. Admin approval triggers atomic DB write transaction
6. Move successfully processed files to processed path

## Testing Strategy

This repository includes:

- Integration tests for auth, CSV pipeline, inventory, and reporting flows
- Property-based tests for core correctness properties such as:
	- role and auth validation
	- pagination bounds
	- file size/type validation
	- transaction state transitions
	- CSV validation invariants
	- analytics filter validation

Run tests:

```bash
pnpm test
```

## Deployment

- Deployment target: Vercel
- Build command: `pnpm build`
- Runtime command: `pnpm start`
- Project config: `vercel.json`

For production and preview, set environment variables in Vercel project settings.

## Migration Notes

- The implementation intentionally preserves existing backend route behavior while modernizing the frontend and deployment surface.
- Some migration documents reference alternate env variable names (for example `*_ANON_KEY` and `*_SERVICE_ROLE_KEY`), while this codebase uses `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY` as the canonical keys.

## Operational Notes

- `pnpm` is enforced via `preinstall`.
- Prisma client generation runs in `postinstall`.
- `pdfkit` is configured as a server external package in Next.js config.