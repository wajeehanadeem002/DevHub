# DevHub

DevHub is a professional developer showcase and discovery platform built around a focused promise: **Build. Showcase. Connect.**

This repository currently contains the Foundation, public Landing Page UI,
Database + Authentication Boundary, Profile Onboarding + Dashboard Shell, and
Profile Management and Project CRUD + Images phases. Clerk is the sole identity provider, and
authenticated profile writes use Clerk session tokens with Supabase PostgreSQL
RLS. Public developer profiles, profile editing, curated skills, visibility,
avatar management, owner-authorized project workflows, and public project
showcases are included. Discovery backends, interactions UI, and deployment
remain intentionally deferred.

## Prerequisites

- Node.js 20.9 or newer
- pnpm 11 (the repository pins pnpm 11.21.0)

Docker, the Supabase CLI, and the Clerk CLI are not required. DevHub uses hosted
Clerk and hosted Supabase development projects.

## Local setup

Install dependencies:

```powershell
pnpm install
```

Create the local environment file:

```powershell
Copy-Item .env.example .env.local
```

Start the development server:

```powershell
pnpm dev
```

Open `http://localhost:3000`.

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the Next.js development server |
| `pnpm build` | Create a production build |
| `pnpm start` | Run the production build |
| `pnpm lint` | Run ESLint |
| `pnpm typecheck` | Run strict TypeScript checks |
| `pnpm test` | Run Vitest unit/component tests once |
| `pnpm test:watch` | Run Vitest in watch mode |
| `pnpm test:e2e` | Run Playwright end-to-end tests |
| `pnpm test:e2e:list` | Validate and list Playwright tests without running them |

Playwright browser binaries are not installed as part of this foundation task. Install Chromium later, when browser test execution becomes part of the workflow, with `pnpm exec playwright install chromium`.

## Structure

```text
src/
  app/          Next.js App Router entry points and route conventions
  components/   Shared layout and UI primitives
  features/     Feature-owned modules added in later phases
  lib/          Shared configuration and server/client utilities
  types/        Cross-feature TypeScript types when needed
supabase/
  migrations/   Hosted Supabase database migrations added later
  tests/        Database and RLS tests added later
e2e/            Playwright specifications
```

The application follows a server-first modular-monolith approach: route files compose feature modules, server code stays behind explicit server-only boundaries, and client components are introduced only for browser interactivity.

## Environment variables

Environment values are parsed with Zod. Browser-safe values live in `src/lib/env/public.ts`; server-only values live in `src/lib/env/server.ts`, which imports `server-only` to prevent client bundling.

Variables:

- `NEXT_PUBLIC_APP_URL`: canonical application origin; defaults to `http://localhost:3000` during local development.
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: browser-safe Clerk publishable key.
- `CLERK_SECRET_KEY`: server-only Clerk secret key.
- `NEXT_PUBLIC_SUPABASE_URL`: hosted Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: browser-safe Supabase publishable key
  (the legacy anon key can be used only when that is what the project exposes).

The integration-specific schemas are parsed lazily so a credential-free build is
possible. Any route or data client that actually uses a hosted service still
fails closed when its required configuration is absent. Never prefix a secret
with `NEXT_PUBLIC_`.

## Hosted service setup

1. Create/configure a Clerk development instance and add the two Clerk keys to
   `.env.local`.
2. In Clerk, enable the native Supabase integration.
3. In the Supabase project, add Clerk as a third-party authentication provider
   and ensure Clerk tokens include the `authenticated` Postgres role expected by
   the RLS policies.
4. Add the Supabase URL and publishable key to `.env.local`.
5. Apply the migrations, seed, and database policy tests using the instructions in
   `supabase/README.md`.
6. Download/regenerate the hosted schema TypeScript types after the migration is
   active, replacing `src/types/database.generated.ts`.

No service-role client exists in this phase because no verified webhook or
administrative cleanup path has been implemented.

## Project routes and images

Authenticated developers can manage their own projects through these routes:

- `/dashboard/projects` lists the current developer's drafts and published
  projects.
- `/dashboard/projects/new` creates a project draft through the guided Details
  and Technologies flow.
- `/dashboard/projects/[id]/edit` provides the owner-only Details,
  Technologies, Images, and Review workflow for updating, publishing,
  unpublishing, and deleting a project.

Published work is available at `/projects/[id]` only when its owner profile is
public and active. Published project cards also appear on
`/developers/[username]`. Drafts and projects belonging to private or deleted
profiles do not render on these public routes.

The shared App Router loading boundary streams before database-backed project
visibility is known. Under Next.js 16, a missing or non-public project can
therefore return HTTP `200` with the shared not-found UI and an injected
`noindex` marker (a streamed soft 404). This is the expected MVP behavior; the
public query and RLS visibility checks remain authoritative.

Project images use the public Supabase Storage bucket `project-images`. Each
project may contain up to five ordered images; the first image is its cover.
Each upload must be JPEG, PNG, or WebP and no larger than 10 MiB. Images are
optional, so a project can be published without one and will use the
deterministic DevHub fallback artwork.

The hosted migration and rollback-based SQL test remain manual. Follow the
complete ordered workflow in `supabase/README.md`; project management adds
`202609140003_project_management.sql` and
`tests/database/003_project_management.sql` after the existing schema/profile
steps.

## Current scope

Included now: the foundation toolchain, responsive DevHub landing page, Clerk
provider and hosted auth route boundary, Clerk-token-aware Supabase clients,
initial schema/migrations, explicit grants and RLS, taxonomy seed,
schema-derived types, executable database policy tests, authenticated profile
onboarding, protected dashboard, public developer profiles, profile editing,
curated technology selection, profile visibility, and one public avatar per
developer. Avatar uploads accept JPEG, PNG, or WebP up to 2 MB. Project CRUD now
includes owner-only draft creation and editing, curated category and technology
selection, publishing/unpublishing/deletion, an ordered five-image manager,
dashboard project management, public project pages, and published project cards
on public developer profiles. Project images accept JPEG, PNG, or WebP up to
10 MiB each and remain optional for publishing.

Not included now: discovery/search implementation, like/save/follow UI,
notifications, activity feeds, trending or moderation features, Clerk webhooks,
Phase 2 functionality, or deployment.
