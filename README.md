# U-Track

U-Track is The Circular Classroom's unified web platform for school uniform donation collection, inventory operations, circularity and repurposing analytics, upcycling assembly modeling, reporting, and user administration.

This platform consolidates legacy multi-service AWS cloud infrastructure into a unified, high-performance Next.js full-stack application deployed on Vercel with Supabase and Prisma.

---

## Migration Summary

The platform consolidates legacy systems into a single codebase:

- **AWS Cognito** &rarr; **Supabase Auth** (JWT validation, server-side session handling, MFA lockout protection, role management)
- **AWS Lambda / ECS Backends** &rarr; **Next.js API Route Handlers** (REST endpoints under `app/api/*`)
- **AWS S3** &rarr; **Supabase Storage** (uniform graphics, school logos, and pre-processing CSV staging)
- **AWS SES / SNS** &rarr; **Resend** (transactional email notifications)
- **AWS-Hosted PostgreSQL** &rarr; **Supabase PostgreSQL with Prisma 7** (`@prisma/adapter-pg` + `pg`)
- **Async Batch Jobs** &rarr; **Supabase Edge Functions** (`supabase/functions/csv-processing`) & atomic API routes

### Key Architectural Principles
- **Single deployable Next.js 16 app** running on Vercel.
- **API-first backend surface** under `app/api/*` with standardized JSON responses.
- **Encapsulated domain logic** under `lib/*` (auth, inventory, CSV pipeline, analytics, reporting, storage).
- **Defense-in-depth security**: Server-side proxy middleware enforcement, service-role database lookups, and Supabase Row-Level Security (RLS) policies.
- **Property-based & integration testing** verifying migration correctness and mathematical invariants.

---

## Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Framework** | Next.js 16 (16.3+) App Router |
| **Language** | TypeScript 7 |
| **UI & Components** | React 19 (19.2+), MUI 9 (`@mui/material` ^9.3, `@mui/x-data-grid` ^9.12, `@mui/material-nextjs`), Emotion |
| **Styling** | Tailwind CSS 4 (`@tailwindcss/postcss` ^4.3, `tailwindcss` ^4.3) |
| **Data Visualization** | Recharts (3.10+) |
| **Database & ORM** | PostgreSQL, Prisma 7 (`@prisma/client` ^7.9, `@prisma/adapter-pg`, `pg` ^8.23) |
| **Auth & Storage** | Supabase (`@supabase/ssr` ^0.12, `@supabase/supabase-js` ^2.112) |
| **Email Service** | Resend 6 (`resend` ^6.21) |
| **Document Export** | PDFKit (`pdfkit` ^0.19) |
| **Testing** | Vitest 4 (`vitest` ^4.1) + fast-check 4 (`fast-check` ^4.9) |
| **Package Manager** | pnpm 11+ (enforced via `only-allow`) |

---

## Core Product Modules

### 1. Role-Aware Home Dashboard (`/`)
- Dynamic greeting and contextual layout based on user credentials.
- Permission-filtered navigation cards for quick access to:
  - **School Dashboard**: Insights and metrics on school uniform collection and impact.
  - **Uniform Tracker**: Tracking collection, reuse, repurposing, and recycling.
  - **Donation Drives**: Scheduling, volunteer resources, and drive management.
  - **Collaborations & Products**: Overview of repurposing projects and upcycled products.
  - **User Management**: Administrator tools for managing users, roles, and school affiliations.
  - **Website Management (Production & Staging)**: Single Sign-On (SSO) handoff to the public website CMS.
  - **Greener Routes to School**: External link integration for sustainable transport initiatives.

### 2. Authentication, Account Management & RBAC
- Complete authentication lifecycle: login, register, forgot-password, reset-password, change-password, and session refresh.
- Temporary password flow: enforced password change on initial login (`force_password_change`) before accessing protected routes.
- Multi-Factor Authentication (MFA) and account lockout mechanisms (`lib/auth/mfa-lockout.ts`).
- 4-tier Role-Based Access Control: `Admin` (4) > `SchoolStaff` (3) > `PsgVolunteer` (2) > `Parent` (1).
- Server-side route proxy (`proxy.ts`) verifying JWTs, fetching authoritative user roles from the database, and enforcing path-level authorization.

### 3. Uniform Inventory Management (`/inventory`)
- **Uniform Overview (`/inventory/uniform-overview`)**: Grouped uniform categories (Shirt, Shorts, Skirt, Pants, PE Shirt, Gym Shorts, Tie, Cap, Belt, Others) with gender badges (Unisex, Male, Female) and live counts.
- **School Context Scoping**: Filter uniform balances and items by user-associated school or platform-wide for administrators.
- **Colour & Pattern Mapping**: Primary/secondary colour hex palettes and tooltips (`utils/colourDisplayName.ts`).
- **Hierarchy & Drilldowns**: Navigate by school &rarr; category &rarr; colour palette &rarr; size options (`/inventory/items/school/...`).
- **Item Condition & Transactions (`/update-item-condition`, `/transaction`)**:
  - State transitions across statuses: `GeneralOffice`, `ForSale`, `Sold`, `ForRepurpose`, `Repurposed`, `Disposed`.
  - Storage location tracking: `School`, `TCC`, `Exited`.
  - Transaction types: `donation_in`, `transfer`, `status_change`, `sale`, `repurposing`, `disposal`.
- **Deletion Guard (`lib/inventory/deletion-guard.ts`)**: Prevents orphaned records and verifies referential integrity before item deletions.

### 4. Donation Drives (`/donation-drives`)
- Scheduling, date ranges, location assignment, and school associations for uniform donation drives.
- Dedicated access for Parent Support Group (PSG) volunteers and School Staff to view, create, and update drives.
- Ingestion of drive donation data via CSV upload and manual donation recording (`/api/donations/drives/*`).

### 5. CSV / Excel Ingestion & Approval Pipeline (`/file-approval`)
- Dual-format parser supporting `.csv`, `.xls`, and `.xlsx` (`lib/csv/parser.ts`).
- Two-stage ingestion architecture:
  1. File uploaded to Supabase pre-processing storage bucket.
  2. Data validated against database constraints and business schemas (`lib/csv/validator.ts`).
  3. Validated files await administrator review in `/file-approval`.
  4. Admin approval executes an atomic Prisma database transaction creating item types, size options, and donation transactions (`lib/csv/processor.ts`).
  5. Processed or failed files are archived to respective storage paths with automated email notification to uploaders via Resend.

### 6. Circularity Analytics & Impact Dashboards (`/analytics`)
- **School Circularity Dashboard (`/analytics/school`)**:
  - School profile, logo resolution, and partnership metrics.
  - Uniform collection overview, category breakdown, and drive performance.
  - Upcycling collaborations and repurposing project showcase.
- **Circularity Overview Dashboard (`/analytics/overview`)**:
  - KPI totals: total uniforms collected, items reused, garments repurposed, textiles recycled, and landfill weight diverted.
  - Multi-year trend analytics and drive participation graphs.
  - Repurposing analysis broken down by uniform colour palettes.
- **Assembly & Recipe Modeling Engine (`/analytics/assembly`)**:
  - Model how collected uniform textiles convert into upcycled products (e.g. tote bags, pouches, bucket hats).
  - Configurable catalog: Product Types, Styles, Recipes, and Recipe Ingredients with specific quantity and size class requirements.
  - Assembly calculation service computing production yields and material projections based on live inventory.

### 7. Catalog & Preset Configuration (`/configuration`)
- Dedicated administrative panels for maintaining platform master data:
  - **Brands & Suppliers** (`/configuration/brand`)
  - **Category Tags** (`/configuration/category-tag`)
  - **Colours, Patterns & Materials** (`/configuration/colour-pattern-material`)
  - **Item Type Presets** (`/configuration/itemtype-preset`)

### 8. Public Website SSO Integration
- Cross-domain authentication bridge (`lib/auth/public-website.ts`) allowing authenticated TCC Administrators to jump directly into the public website CMS.
- Supports both **Production** (`https://www.circularclassroom.org`) and **Staging** (`https://staging.circularclassroom.org`) targets.
- Passes current Supabase session tokens to `/admin/auth/callback` to establish an authenticated session on the destination domain.

### 9. PDF Reporting & SEO Engine
- Server-side PDF export for school circularity summaries and administrative impact audits using PDFKit.
- Automated SEO metadata: dynamic `robots.txt` (`app/robots.ts`) and `sitemap.xml` (`app/sitemap.ts`) generated via canonical URL resolution (`lib/site-url.ts`).

---

## Project Structure

```text
u-track/
├── app/                                # Next.js App Router (pages & API)
│   ├── (metadata)                      # robots.ts, sitemap.ts, manifest.json
│   ├── analytics/                      # Analytics dashboards
│   │   ├── assembly/                   # Assembly & recipe modeling
│   │   ├── configuration/              # Catalog management (products, styles, recipes)
│   │   ├── overview/                   # Platform-wide circularity KPIs & trends
│   │   └── school/                     # School circularity dashboard
│   ├── api/                            # Backend API route handlers
│   │   ├── analytics/                  # Analytics calculation endpoints
│   │   ├── assembly/                   # Upcycling recipe and calculation endpoints
│   │   ├── auth/                       # Auth, session, password, MFA endpoints
│   │   ├── collection/                 # Overall collection aggregate endpoints
│   │   ├── csv/                        # CSV upload, validate, approve endpoints
│   │   ├── donations/                  # Donation drives and donation endpoints
│   │   ├── health/                     # System & database health probe
│   │   ├── inventory/                  # Items, balances, attributes, transactions
│   │   ├── overview/                   # Overview KPI, trend, repurposing endpoints
│   │   ├── report/ & reports/          # School and admin PDF report generation
│   │   ├── school/ & schools/          # School profiles, logos, drives, collaborations
│   │   ├── storage/                    # Storage upload and validation endpoints
│   │   └── users/                      # User CRUD, sync, deactivation, password reset
│   ├── auth/                           # Authentication pages (login, signup, reset, etc.)
│   ├── configuration/                  # Master data configuration (brands, tags, CPM)
│   ├── deeplink/                       # Deep link entry points
│   ├── donation-drives/                # Donation drive management UI
│   ├── file-approval/                  # CSV/Excel pending approval dashboard
│   ├── inventory/                      # Inventory overview & hierarchical item views
│   ├── school/settings/                # School configuration & logo upload
│   ├── update-item-condition/          # Inventory condition transition workflow
│   ├── users/                          # User administration UI
│   └── page.tsx                        # Role-aware landing home page
├── components/                         # Reusable React components
│   ├── analytics/configuration/        # Recipe and product catalog managers
│   ├── configuration/                  # Master data modals and forms
│   ├── inventory/                      # Uniform cards, category & colour views
│   └── ui/                             # Buttons, badges, modals, pagination, theme
├── lib/                                # Domain logic, utilities & service clients
│   ├── analytics/                      # Aggregations for overview, collection, assembly
│   ├── auth/                           # Roles, permissions, validation, public-website SSO
│   ├── csv/                            # Parser, validator, processor pipeline
│   ├── email/                          # Resend email notification service
│   ├── inventory/                      # Balances, transactions, deletion guards
│   ├── prisma/                         # Prisma singleton client with pg adapter
│   ├── school/                         # School logo storage resolver
│   ├── storage/                        # File validation, MIME checks, sanitization
│   ├── supabase/                       # Supabase client factories (browser, server, admin)
│   ├── env.ts                          # Runtime environment validation
│   ├── logger.ts                       # Structured JSON logger
│   ├── pagination.ts                   # Offset-based pagination utilities
│   └── site-url.ts                     # Canonical application URL resolution
├── prisma/                             # Database schema & migrations
│   ├── migrations/                     # PostgreSQL migrations & RLS policies
│   └── schema.prisma                   # Canonical Prisma schema
├── public/                             # Static assets & uniform graphics
│   └── images/                         # Uniform graphics (Shirt, Shorts, Skirt, Tie, etc.)
├── supabase/                           # Supabase configuration & Edge functions
│   └── functions/csv-processing/       # Deno edge function for batch CSV ingestion
├── utils/                              # Shared helper functions
│   ├── analytics.ts                    # Analytics formatters
│   ├── apiResponse.ts                  # Standardized API response wrappers
│   ├── auth.ts                         # Token, session, and role client helpers
│   ├── categoryOrder.ts                # Display order for uniform categories
│   ├── colourDisplayName.ts            # Colour name resolution and hex mappings
│   └── inventoryNav.ts                 # Inventory breadcrumb navigation utilities
└── proxy.ts                            # Next.js request middleware (JWT verification & RBAC)
```

---

## Environment Configuration

Copy `.env.local.example` to `.env.local`:

```bash
cp .env.local.example .env.local
```

### Required Variables

| Variable | Scope | Description |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public (Client + Server) | Supabase project URL (`https://your-project.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public (Client) | Supabase publishable / anon key (respects RLS) |
| `SUPABASE_SECRET_KEY` | Secret (Server only) | Supabase service-role key (bypasses RLS for admin operations) |
| `POSTGRES_PRISMA_URL` | Secret (Server only) | Pooled PostgreSQL connection via PgBouncer (port 6543) |
| `POSTGRES_URL_NON_POOLING` | Secret (Server only) | Direct PostgreSQL connection for Prisma migrations (port 5432) |
| `RESEND_API_KEY` | Secret (Server only) | Resend API key for transactional emails |

### Optional Variables (With Defaults)

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `RESEND_FROM_EMAIL` | `noreply@yourdomain.com` | Verified sender address in Resend |
| `NEXT_PUBLIC_APP_URL` | `https://u-track.circularclassroom.org` | Canonical application URL for SEO, sitemap, and robots.txt |
| `NEXT_PUBLIC_PUBLIC_WEBSITE_PROD_URL` | `https://www.circularclassroom.org` | Target URL for Production public website SSO admin handoff |
| `NEXT_PUBLIC_PUBLIC_WEBSITE_STAGING_URL` | `https://staging.circularclassroom.org` | Target URL for Staging public website SSO admin handoff |

> [!NOTE]
> Runtime validation is enforced in `lib/env.ts`. When serving requests, missing required variables fail fast with a descriptive error. Validation is bypassed during the Next.js production build phase (`phase-production-build`).

---

## Local Setup

### Prerequisites
- **Node.js**: LTS version (v20+ recommended)
- **pnpm**: v11+ (enforced via `preinstall` hook)
- **Supabase**: Active Supabase project with Auth, Storage, and PostgreSQL
- **Resend**: Active account with a verified sending domain

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Configure Environment
Populate `.env.local` with your Supabase, PostgreSQL, and Resend credentials.

### 3. Generate Prisma Client
```bash
pnpm db:generate
```

### 4. Run Migrations
```bash
pnpm db:migrate
```

### 5. Start Development Server
```bash
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Available Scripts

| Script | Command | Description |
| :--- | :--- | :--- |
| `pnpm dev` | `next dev` | Start the local Next.js development server |
| `pnpm build` | `npx prisma generate && next build` | Generate Prisma client and build production bundle |
| `pnpm start` | `next start` | Start the Next.js production server |
| `pnpm lint` | `next lint` | Run ESLint across the codebase |
| `pnpm test` | `vitest run` | Execute the full test suite once |
| `pnpm test:watch` | `vitest` | Run Vitest in interactive watch mode |
| `pnpm db:generate` | `npx prisma generate` | Regenerate the Prisma client from schema |
| `pnpm db:migrate` | `npx prisma migrate deploy` | Apply pending database migrations |
| `pnpm db:push` | `npx prisma db push` | Push schema changes directly without migration files |
| `pnpm db:seed` | `npx prisma db seed` | Run database seed script (if configured) |

---

## Security & RBAC Model

### Role Hierarchy

Access permissions are strictly enforced across a 4-tier hierarchy:

```text
Admin (Level 4)
  └── SchoolStaff (Level 3)
        └── PsgVolunteer (Level 2)
              └── Parent (Level 1)
```

| Role | Level | Accessible Pages & Functional Scope |
| :--- | :---: | :--- |
| **Admin** | 4 | Full access: User management (`/users`), File approvals (`/file-approval`), Master data configuration (`/configuration/*`), Public website SSO, all School dashboards, all Inventory, Reports, and System settings. |
| **SchoolStaff** | 3 | School circularity dashboard (`/analytics/school`), Assembly modeling (`/analytics/assembly`), School inventory, Donation drives, School configuration, and Report generation. |
| **PsgVolunteer** | 2 | Uniform Inventory tracker (`/inventory`), Uniform overview, Item condition updates (`/update-item-condition`), Donation drive scheduling and CSV collection uploads (`/donation-drives`). |
| **Parent** | 1 | Self-profile management and personal donation history. |

### Middleware & Request Verification (`proxy.ts`)
- **Server-Side Token Verification**: Every incoming request to protected routes is authenticated server-side using Supabase's `getUser()`, which cryptographic verifies the JWT.
- **Database Role Resolution**: User roles are queried directly from the `users` table via the service client to ensure real-time role updates take immediate effect, falling back to `app_metadata.role` when necessary.
- **Temporary Password Enforcement**: Users marked with `force_password_change: true` are blocked from accessing protected business routes and redirected to `/auth/change-password` (or returned HTTP 403 on API routes).
- **Header Propagation**: Verified user metadata is passed downstream via request headers (`x-user-id`, `x-user-role`, `x-user-force-password-change`).

---

## API Catalog

All API endpoints are implemented as Next.js Route Handlers under `app/api/*`:

### Authentication & Users
- `POST /api/auth/login`: Authenticate with email/password, update `lastLogin` timestamp.
- `POST /api/auth/logout`: Revoke active session and clear authentication cookies.
- `POST /api/auth/signup` / `POST /api/auth/register`: User registration with validation.
- `POST /api/auth/forgot-password`: Initiate password reset email via Supabase/Resend.
- `POST /api/auth/reset-password`: Complete password reset with verification token.
- `POST /api/auth/set-new-password`: Change password (used in first-login temporary password flow).
- `GET/POST /api/auth/mfa`: Multi-Factor Authentication challenge and verification.
- `GET /api/auth/session` & `POST /api/auth/refresh`: Refresh and retrieve session tokens.
- `GET /api/auth/me`: Retrieve authenticated user context.
- `GET /api/users/list`: List users with pagination, role filtering, and school filtering.
- `POST /api/users/create`: Create a new user with generated temporary password.
- `GET/PUT/DELETE /api/users/[id]`: Retrieve, update, or delete user record.
- `POST /api/users/[id]/deactivate`: Deactivate user account.
- `POST /api/users/[id]/set-temp-password`: Generate and assign a temporary password.
- `POST /api/users/sync`: Synchronize Supabase Auth users with Prisma `users` table.

### Uniform Inventory & Attributes
- `GET /api/inventory/balances`: Retrieve aggregated inventory balances across schools and statuses.
- `GET /api/inventory/balance`: Balance inquiry for specific item type and size.
- `GET/POST /api/inventory/item-types`: List or create uniform item types.
- `GET/PUT/DELETE /api/inventory/item-types/[id]`: Retrieve, update, or remove an item type (with deletion guard).
- `POST /api/inventory/transactions`: Record inventory transaction (donation in, transfer, sale, status change, etc.).
- `GET/POST /api/inventory/brands`: Brand/supplier master data CRUD.
- `GET/POST /api/inventory/categories`: Item category weights master data CRUD.
- `GET/POST /api/inventory/colours`: Colour name and hex palette master data CRUD.
- `GET/POST /api/inventory/materials`: Material type master data CRUD.
- `GET/POST /api/inventory/patterns`: Uniform pattern master data CRUD.
- `GET/POST /api/inventory/sizes`: Size categories and options CRUD.
- `GET/POST /api/inventory/tags`: Custom category tags CRUD.

### Donation Drives & Collection
- `GET/POST /api/donations/drives`: List or create donation drives.
- `GET/PUT/DELETE /api/donations/drives/[id]`: Retrieve, update, or delete a specific donation drive.
- `POST /api/donations/drives/upload-csv`: Upload donation drive collection CSV.
- `POST /api/donation-drive/donate`: Record individual uniform donation.
- `POST /api/donation-drive/deny-file`: Reject an uploaded collection file.
- `GET /api/donation-drive/school/[schoolId]`: Retrieve drives for a designated school.
- `GET /api/collection/[slug]`: Aggregated collection metrics (`overall-donations`, `overall-donations-by-category`).

### CSV / Excel Processing Pipeline
- `POST /api/csv/upload`: Upload CSV or Excel file to Supabase pre-processing bucket.
- `POST /api/csv/validate`: Validate staged file columns and relational integrity.
- `POST /api/csv/approve`: Admin approval executing atomic database transaction.

### Circularity Analytics & Overview
- `GET /api/overview/kpi-totals`: Platform-wide KPI totals (collected, reused, repurposed, recycled, diverted).
- `GET /api/overview/inventory-by-category`: Inventory distribution across garment categories.
- `GET /api/overview/inventory-by-school`: Inventory distribution grouped by school.
- `GET /api/overview/yearly-trend`: Historical multi-year uniform collection and reuse trends.
- `GET /api/overview/repurposing-by-colour`: Uniform inventory segmented for colour-based upcycling.
- `GET /api/overview/product-projections`: Projected finished upcycled goods from raw inventory.
- `GET /api/overview/drive-participation`: School drive participation and volume metrics.

### Assembly & Upcycling Engine
- `GET/POST /api/assembly/product-types`: Upcycled product category management.
- `GET/POST /api/assembly/products`: Upcycled product items management.
- `GET/POST /api/assembly/styles`: Product aesthetic styles management.
- `GET/POST /api/assembly/recipes`: Upcycling recipe definitions and ingredient requirements.
- `POST /api/assembly/calculate`: Calculate finished product yield based on available uniform stock.

### School Profiles & Reporting
- `GET /api/schools`: List participating schools.
- `GET/PUT /api/school/[id]/profile`: Retrieve or update school profile.
- `GET/POST /api/school/[id]/logo`: Retrieve or upload school crest/logo image.
- `GET /api/school/[id]/collection-overview`: School collection summary metrics.
- `GET /api/school/[id]/inventory-by-item`: School item-level inventory balance breakdown.
- `GET /api/school/[id]/drives`: Active and past drives for a school.
- `GET /api/school/[id]/collaborations`: Upcycling collaborations for a school.
- `GET /api/report/admin`: Generate platform-wide circularity audit report (PDF).
- `GET /api/report/school/[id]`: Generate school-specific circularity and impact report (PDF).

### Storage & System Health
- `POST /api/storage/images`: Secure image upload with MIME validation and filename sanitization.
- `GET /api/health`: Health probe validating Next.js runtime and PostgreSQL connectivity.

---

## Testing & Quality Assurance

The repository includes a comprehensive test suite executed with **Vitest**:

```bash
pnpm test
```

### Test Coverage Highlights
- **43 Test Files & 460+ Tests** covering unit, integration, and property-based test suites.
- **Property-Based Testing (`fast-check`)**: Validates mathematical invariants and edge cases across hundreds of randomized iterations:
  - Inventory balance conservation under sequential transactions (`balance.property.test.ts`).
  - Idempotent and structurally identical CSV vs. Excel parsing results (`parser.property.test.ts`).
  - Filename sanitization against path traversal, control characters, and Unicode (`filename.property.test.ts`).
  - Storage file size and MIME validation bounds (`validation.property.test.ts`).
  - RBAC permission hierarchy monotonicity (`roles.property.test.ts`).
  - JWT middleware authentication bypass prevention (`middleware.property.test.ts`).
  - Safe pagination offset and limit clamping (`pagination.property.test.ts`).
- **Integration Tests**:
  - Supabase Auth login flow and `lastLogin` timestamp tracking.
  - CSV upload, validation, approval, and transaction commit flow.
  - Temporary password onboarding restrictions.
  - Public website SSO redirect URL generation and token encoding.
  - SEO route generation for `robots.txt` and `sitemap.xml`.

---

## Deployment

### Vercel Deployment
The application is configured for deployment on Vercel (`vercel.json`):
- **Build Command**: `pnpm build` (runs `prisma generate` followed by `next build`)
- **Install Command**: `pnpm install`
- **Framework Preset**: Next.js

Configure environment variables in the Vercel dashboard:
- **Production Environment**: Connect to the production Supabase project and database pooler.
- **Preview Environment**: Connect to a staging/preview Supabase project for data isolation.

---

## Operational Notes

- **Package Enforcement**: `only-allow pnpm` ensures team members do not accidentally install dependencies using `npm` or `yarn`.
- **Automatic Prisma Generation**: `prisma generate` runs automatically on `postinstall` to guarantee typed client availability.
- **Server External Packages**: `pdfkit` is configured as a server external component in `next.config.ts` for clean serverless Node execution.
- **Database Defense-in-Depth**: Supabase Row-Level Security (RLS) policies are maintained in `prisma/migrations/rls_policies.sql` to complement application-layer RBAC.