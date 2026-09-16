# DevHub Project CRUD and Images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build owner-authorized project creation, editing, image management, publishing, deletion, public project pages, and published-project cards on developer profiles.

**Architecture:** React Server Component routes call focused server-only project data modules. Mutations use Zod-validated Server Actions and Clerk-token-aware Supabase clients, while narrowly granted `security invoker` RPCs make project/technology and image-order changes atomic under RLS. The selected Guided Step-by-Step Composer is the only substantial Client Component boundary.

**Tech Stack:** Next.js 16.3.4 App Router, React 19, TypeScript strict, Tailwind CSS 4, Clerk 7, Supabase JS 2, Zod 4, Vitest, React Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-14-project-crud-design.md`

## Global Constraints

- Preserve the selected ideation option 2, Guided Step-by-Step Composer, in the existing Mocha + Cream visual system.
- Use `Details -> Technologies -> Images -> Review`; persist a draft before image upload.
- Use UUID public URLs, exactly one curated category, 1-8 curated technologies, and plain-text descriptions.
- Allow publishing without images; permit at most five JPEG/PNG/WebP images up to 10 MB each.
- Keep Clerk as the sole identity provider and derive every owner identity from the JWT `sub`.
- Keep RLS as the database authorization boundary and do not introduce a service-role client.
- Do not add dependencies, discovery/search, likes, saves, follows, notifications, activity feeds, trending, deployment, or Phase 2 features.
- Do not redesign the landing page or unrelated shared layout.
- Do not install Docker, Supabase CLI, Clerk CLI, Playwright browsers, or another package manager.
- Do not create screenshots or QA artifacts in the repository.
- Do not run Git commands, commit, push, create a branch, or deploy.

---

### Task 1: Add the Project Database and Storage Boundary

**Files:**
- Create: `supabase/migrations/202609140003_project_management.sql`
- Create: `supabase/tests/database/003_project_management.sql`
- Modify: `src/types/database.generated.ts`

**Interfaces:**
- Produces: `create_current_project(...) -> uuid`
- Produces: `update_current_project(...) -> void`
- Produces: `add_current_project_image(...) -> uuid`
- Produces: `delete_current_project_image(uuid, uuid) -> text`
- Produces: `reorder_current_project_images(uuid, uuid[]) -> void`
- Produces: `delete_current_project(uuid) -> text[]`
- Produces: public Storage bucket `project-images`

- [ ] **Step 1: Write the rollback-based hosted SQL test**

Create fixtures for two profiles and use `SET ROLE authenticated` plus Clerk
JWT claims. Assert these exact behaviors with `do $$ ... $$` exceptions:

```sql
select public.create_current_project(
  'TaskFlow',
  'Modern productivity platform for teams.',
  'TaskFlow helps teams plan and deliver focused work.',
  1,
  'https://taskflow.example',
  'https://github.com/example/taskflow',
  array[1, 2, 3]::smallint[]
) as project_id;
```

Later assertions locate this deterministic fixture by its owner and unique
test title inside the same transaction; do not use psql-only meta-commands in
the Supabase SQL Editor.

The test must verify the returned project is owned by the JWT subject, starts
as `draft`, stores the three technologies, rejects zero/nine/duplicate/unknown
technology IDs, rejects another identity's update/delete/image mutation,
publishes only through the owner RPC, adds no more than five ordered image
rows, reorders an exact image-ID set, returns deleted Storage paths, and rolls
back all fixtures. It must also assert the bucket's 10 MB/MIME configuration,
the named Storage policies, `anon` execution denial, and `authenticated`
execution grants.

- [ ] **Step 2: Confirm the database test cannot pass before the migration**

The hosted test is intentionally deferred until the migration is manually
applied. Locally verify only that it names functions absent from the prior
migrations:

```powershell
rg -n "create_current_project|project-images" supabase/migrations/202609140001_initial_devhub_schema.sql supabase/migrations/202609140002_profile_management.sql
```

Expected: no matches and exit code 1.

- [ ] **Step 3: Write the forward-only migration**

Create/configure the bucket and policies:

```sql
insert into storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
)
values (
  'project-images', 'project-images', true, 10485760,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "DevHub owners upload project images"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'project-images'
  and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub')
  and exists (
    select 1 from public.projects
    where projects.id::text = (storage.foldername(name))[2]
      and projects.owner_id = (select auth.jwt() ->> 'sub')
  )
);
```

Add the corresponding delete policy with the bucket check, first folder segment
equal to the JWT subject, and `owner_id = (select auth.jwt()->>'sub')`. Do not
require the project row in the delete policy because database-first project
deletion must still permit owner-authorized cleanup of the returned paths.

Replace `project_images_project_order_unique` with the same unique constraint
declared `deferrable initially immediate`. Implement all six RPCs as
`security invoker`, `set search_path = ''`, and derive the current identity
inside the function:

```sql
current_user_id text := auth.jwt() ->> 'sub';
```

Project create/update must validate `cardinality(p_technology_ids) between 1
and 8`, uniqueness, curated existence, and category existence. The create RPC
always inserts `status = 'draft'`; update accepts only `draft` or `published`.
Image add locks the owned project row, rejects a sixth image, assigns
`sort_order = count(*)`, and returns the image UUID. Image delete returns the
removed path and compacts remaining order. Reorder rejects any array that is
not the exact current image-ID set and uses the deferrable constraint. Project
delete returns all image paths before cascading the project row.

Revoke every function from `public, anon`, then grant the exact signatures to
`authenticated` only.

- [ ] **Step 4: Extend the schema-derived TypeScript function types**

Add exact RPC entries under `Database["public"]["Functions"]`:

```ts
create_current_project: {
  Args: {
    p_category_id: number;
    p_demo_url: string | null;
    p_description: string;
    p_repository_url: string | null;
    p_summary: string;
    p_technology_ids: number[];
    p_title: string;
  };
  Returns: string;
};
```

Add matching argument/return definitions for update, add-image, delete-image,
reorder-images, and delete-project. Do not widen table fields that existing
grants do not permit.

- [ ] **Step 5: Run static checks for identity and privilege mistakes**

```powershell
rg -n "auth\.uid\(\)|security definer|service_role|for all" supabase/migrations/202609140003_project_management.sql
rg -n "auth\.jwt\(\).*sub|security invoker|revoke all|grant execute|project-images" supabase/migrations/202609140003_project_management.sql
```

Expected: first command has no matches; second shows every intended control.
Do not execute the hosted migration yet; supply it for the user's SQL Editor
after local implementation verifies.

### Task 2: Define and Validate Project Inputs

**Files:**
- Create: `src/features/projects/project-input.ts`
- Create: `src/features/projects/project-input.test.ts`
- Create: `src/features/projects/project-image-input.ts`
- Create: `src/features/projects/project-image-input.test.ts`
- Create: `src/features/projects/project-action-state.ts`

**Interfaces:**
- Produces: `ProjectInput`
- Produces: `parseProjectFormData(formData: FormData)`
- Produces: `parseProjectId(value: string)`
- Produces: `parseProjectImageFormData(formData: FormData)`
- Produces: initial action-state constants for project and image forms

- [ ] **Step 1: Write failing project validation tests**

Test a complete valid payload and these exact failures: blank title, title over
120, summary over 240, blank/over-10,000 description, malformed category ID,
zero technologies, nine technologies, duplicate technologies, non-numeric
technologies, invalid UUID, and `javascript:` URLs. Assert optional empty URLs
normalize to `null`, text trims, and status cannot enter through editable form
data.

```ts
expect(parseProjectFormData(validProjectFormData())).toEqual({
  success: true,
  data: {
    category_id: 1,
    demo_url: "https://taskflow.example",
    description: "TaskFlow helps teams plan focused work.",
    repository_url: "https://github.com/example/taskflow",
    summary: "Modern productivity platform for teams.",
    technologyIds: [1, 2, 7],
    title: "TaskFlow",
  },
});
```

- [ ] **Step 2: Run the focused project validation test and verify RED**

```powershell
pnpm.cmd test src/features/projects/project-input.test.ts
```

Expected: FAIL because `project-input.ts` does not exist.

- [ ] **Step 3: Implement Zod project parsing**

Use `z.object`, `z.coerce.number().int().positive()`, a unique 1-8 numeric ID
array refinement, `z.uuid()`, and the same HTTP(S)-only URL normalization used
by profile editing. Return stable `fieldErrors` keyed by rendered form names.

- [ ] **Step 4: Write failing project-image validation tests**

Assert missing file, empty file, file over 10 MB, unsupported MIME/extension,
blank/over-200 alt text, mismatched extension, malformed project ID, and valid
JPEG/PNG/WebP mappings to `jpg`, `png`, and `webp`.

- [ ] **Step 5: Run the focused image validation test and verify RED**

```powershell
pnpm.cmd test src/features/projects/project-image-input.test.ts
```

Expected: FAIL because `project-image-input.ts` does not exist.

- [ ] **Step 6: Implement image form parsing and action-state contracts**

Use constants `MAX_PROJECT_IMAGES = 5` and
`MAX_PROJECT_IMAGE_BYTES = 10 * 1024 * 1024`. Accept only the exact MIME to
extension map and return a file, normalized extension, trimmed alt text, and
validated project UUID. Define action states with `idle | error | success`,
field errors, safe message, and optional `cleanupWarning`.

- [ ] **Step 7: Run both validation suites and verify GREEN**

```powershell
pnpm.cmd test src/features/projects/project-input.test.ts src/features/projects/project-image-input.test.ts
```

Expected: all focused tests pass.

### Task 3: Add Owner Project Data Access

**Files:**
- Create: `src/features/projects/project-data.ts`
- Create: `src/features/projects/project-data.test.ts`

**Interfaces:**
- Consumes: `ProjectInput`, generated RPC types, `requireProfile()`
- Produces: `getProjectTaxonomy()`
- Produces: `getCurrentProjects()`
- Produces: `getOwnedProject(projectId: string)`
- Produces: `createCurrentProject(input: ProjectInput)`
- Produces: `updateCurrentProject(projectId, input, status)`
- Produces: `deleteCurrentProject(projectId)`

- [ ] **Step 1: Write failing owner-data tests**

Mock only `requireProfile` and the Supabase boundary. Assert ordered category
and technology reads; current projects filtered by the returned Clerk profile
ID and ordered by `updated_at desc`; an owned project includes category,
technology IDs, and images ordered by `sort_order`; create maps only editable
values to `create_current_project`; update maps a validated UUID and explicit
status to `update_current_project`; delete uses `delete_current_project`; and
provider failures throw safe module-level errors.

- [ ] **Step 2: Run the owner-data suite and verify RED**

```powershell
pnpm.cmd test src/features/projects/project-data.test.ts
```

Expected: FAIL because `project-data.ts` does not exist.

- [ ] **Step 3: Implement the server-only owner boundary**

Start with `import "server-only"`. Reuse `requireProfile()` so authenticated
users without onboarding are redirected consistently. Fetch relations in
focused queries rather than exposing a generic CRUD helper. Return view models
containing only fields required by dashboard/editor components.

Use these mutation contracts:

```ts
export async function createCurrentProject(input: ProjectInput): Promise<string>;
export async function updateCurrentProject(
  projectId: string,
  input: ProjectInput,
  status: "draft" | "published",
): Promise<"updated">;
export async function deleteCurrentProject(
  projectId: string,
): Promise<string[]>;
```

- [ ] **Step 4: Run the owner-data suite and verify GREEN**

```powershell
pnpm.cmd test src/features/projects/project-data.test.ts
```

Expected: all owner-data tests pass.

### Task 4: Implement Project Image Metadata and Storage Lifecycle

**Files:**
- Create: `src/features/projects/image-metadata.ts`
- Create: `src/features/projects/image-metadata.test.ts`
- Create: `src/features/projects/project-image-storage.ts`
- Create: `src/features/projects/project-image-storage.test.ts`
- Modify: `next.config.ts`

**Interfaces:**
- Produces: `readProjectImageMetadata(file: File)`
- Produces: `getProjectImagePublicUrl(path: string | null)`
- Produces: `uploadProjectImage(projectId, file, extension, altText)`
- Produces: `removeProjectImage(projectId, imageId)`
- Produces: `reorderProjectImages(projectId, imageIds)`

- [ ] **Step 1: Write failing binary metadata tests**

Build minimal in-memory JPEG SOF, PNG IHDR, WebP VP8X, WebP VP8L, and WebP VP8
fixtures. Assert MIME signature confirmation and exact width/height extraction.
Assert rejection for truncated data, declared/signature mismatch, unsupported
content, zero dimensions, and dimensions above 10,000.

- [ ] **Step 2: Run metadata tests and verify RED**

```powershell
pnpm.cmd test src/features/projects/image-metadata.test.ts
```

Expected: FAIL because the parser does not exist.

- [ ] **Step 3: Implement the dependency-free binary parser**

Read only the uploaded `ArrayBuffer`. Validate PNG's eight-byte signature and
IHDR dimensions; scan JPEG markers to a supported SOF segment; parse WebP RIFF
plus VP8/VP8L/VP8X dimension forms. Return:

```ts
type ProjectImageMetadata = {
  byteSize: number;
  height: number;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  width: number;
};
```

Reject unsupported or inconsistent bytes before contacting Storage.

- [ ] **Step 4: Write failing lifecycle tests**

Assert upload generates
`user_clerk_123/<project-uuid>/<random-id>.<ext>`, uploads once, then calls
`add_current_project_image` with trusted metadata. Assert RPC failure deletes
the newly uploaded object. Assert remove calls the delete-image RPC first then
removes its returned path; Storage cleanup failure returns a warning. Assert
reorder sends the full validated UUID array to the RPC. Assert public URLs use
only the configured Supabase bucket URL.

- [ ] **Step 5: Run lifecycle tests and verify RED**

```powershell
pnpm.cmd test src/features/projects/project-image-storage.test.ts
```

Expected: FAIL because the lifecycle module does not exist.

- [ ] **Step 6: Implement the server-only lifecycle**

Re-authenticate through `requireProfile()` in every exported mutation. Confirm
project ownership before upload and never accept a client-provided Storage
path, MIME, size, or dimensions. Upload with `upsert: false`. Compensate a
failed metadata insert by removing the new object. Treat post-database Storage
cleanup as a non-blocking warning.

- [ ] **Step 7: Restrict Next Image and Server Action configuration**

Retain the existing dynamic Supabase host parsing. Add only:

```ts
pathname: "/storage/v1/object/public/project-images/**"
```

alongside the avatar pattern. Change the documented action body limit from
`3mb` to `11mb` so a single 10 MB image plus multipart overhead succeeds.

- [ ] **Step 8: Run image suites and config typecheck**

```powershell
pnpm.cmd test src/features/projects/image-metadata.test.ts src/features/projects/project-image-storage.test.ts
pnpm.cmd typecheck
```

Expected: focused tests and typecheck pass.

### Task 5: Add Project Server Actions

**Files:**
- Create: `src/features/projects/project-actions.ts`
- Create: `src/features/projects/project-actions.test.ts`

**Interfaces:**
- Consumes: validation, owner data, Storage lifecycle, `revalidatePath`, `redirect`
- Produces: `createProjectAction(previousState, formData)`
- Produces: `updateProjectAction(projectId, previousState, formData)`
- Produces: `publishProjectAction(projectId, previousState, formData)`
- Produces: `unpublishProjectAction(projectId, previousState, formData)`
- Produces: `deleteProjectAction(projectId, previousState, formData)`
- Produces: upload/remove/reorder project-image actions

- [ ] **Step 1: Write failing action tests**

Assert invalid input returns field errors without persistence. Assert create
persists a draft, revalidates `/dashboard` and `/dashboard/projects`, then
redirects outside the `try` block to
`/dashboard/projects/<uuid>/edit?step=images`. Assert update revalidates the
workspace, editor, public project, and owner profile. Assert publish/unpublish
use explicit status values. Assert deletion cleans returned Storage paths and
reports cleanup warning without exposing provider errors. Assert image actions
validate before Storage and revalidate all project surfaces.

- [ ] **Step 2: Run actions and verify RED**

```powershell
pnpm.cmd test src/features/projects/project-actions.test.ts
```

Expected: FAIL because `project-actions.ts` does not exist.

- [ ] **Step 3: Implement secure actions**

Start the file with:

```ts
"use server";
import "server-only";
```

Treat bound project IDs and all `FormData` as untrusted. Parse IDs with Zod,
re-read the owned project before mutation, and return only stable action-state
messages. Perform `revalidatePath` before `redirect`, and invoke `redirect`
after the `try/catch` because it throws Next.js control flow.

- [ ] **Step 4: Run action and related data suites and verify GREEN**

```powershell
pnpm.cmd test src/features/projects/project-actions.test.ts src/features/projects/project-data.test.ts src/features/projects/project-image-storage.test.ts
```

Expected: all focused tests pass.

### Task 6: Build the Dashboard Project Workspace

**Files:**
- Create: `src/features/projects/project-cover.tsx`
- Create: `src/features/projects/project-cover.test.tsx`
- Create: `src/features/projects/dashboard-project-list.tsx`
- Create: `src/features/projects/dashboard-project-list.test.tsx`
- Create: `src/app/dashboard/projects/page.tsx`
- Create: `src/app/dashboard/projects/page.test.tsx`
- Modify: `src/features/profile/dashboard-navigation.tsx`
- Modify: `src/features/profile/dashboard-navigation.test.tsx`
- Modify: `src/app/dashboard/page.tsx`
- Modify: `src/app/dashboard/page.test.tsx`

**Interfaces:**
- Consumes: current project summaries and project image public URLs
- Produces: real Projects navigation and dashboard workspace
- Produces: reusable deterministic cover/fallback component

- [ ] **Step 1: Write failing navigation and workspace tests**

Assert `DashboardNavigation` accepts `active: "projects"`, renders Projects as
a link to `/dashboard/projects`, and removes the `Next` label. Assert the
workspace has one H1, `Create project`, draft/published status text, edit links,
public view links only for published rows, cover alt text, and an accessible
empty state. Assert the dashboard overview now links to the workspace instead
of saying project creation is reserved.

- [ ] **Step 2: Run focused UI tests and verify RED**

```powershell
pnpm.cmd test src/features/profile/dashboard-navigation.test.tsx src/features/projects/dashboard-project-list.test.tsx src/app/dashboard/projects/page.test.tsx src/app/dashboard/page.test.tsx
```

Expected: failures for the absent route/components and disabled navigation.

- [ ] **Step 3: Implement the reusable cover and project list**

Use `next/image` with stored intrinsic width/height for remote project images.
When no image exists, render an accessible branded DevHub fallback using
existing UI structure and `CodeIcon`; do not generate or add a fake image
asset. Keep cards equal-height and responsive at one/two columns.

- [ ] **Step 4: Implement the Server Component route and enable navigation**

Load `requireProfile()`, current projects, and avatar URL in parallel where
independent. Preserve the existing sidebar/card language and Mocha + Cream
tokens. The route must not fetch likes/saves or discovery data.

- [ ] **Step 5: Run focused UI tests and verify GREEN**

```powershell
pnpm.cmd test src/features/profile/dashboard-navigation.test.tsx src/features/projects/project-cover.test.tsx src/features/projects/dashboard-project-list.test.tsx src/app/dashboard/projects/page.test.tsx src/app/dashboard/page.test.tsx
```

Expected: all focused dashboard tests pass.

### Task 7: Build the Guided Project Composer and Image Manager

**Files:**
- Create: `src/features/projects/project-stepper.tsx`
- Create: `src/features/projects/project-stepper.test.tsx`
- Create: `src/features/projects/new-project-composer.tsx`
- Create: `src/features/projects/new-project-composer.test.tsx`
- Create: `src/features/projects/edit-project-composer.tsx`
- Create: `src/features/projects/edit-project-composer.test.tsx`
- Create: `src/features/projects/project-fields.tsx`
- Create: `src/features/projects/project-image-manager.tsx`
- Create: `src/features/projects/project-image-manager.test.tsx`
- Create: `src/features/projects/project-delete-form.tsx`
- Create: `src/features/projects/project-delete-form.test.tsx`
- Create: `src/app/dashboard/projects/new/page.tsx`
- Create: `src/app/dashboard/projects/new/page.test.tsx`
- Create: `src/app/dashboard/projects/[id]/edit/page.tsx`
- Create: `src/app/dashboard/projects/[id]/edit/page.test.tsx`

**Interfaces:**
- Consumes: project actions, taxonomy, owned project, image URLs
- Produces: selected four-step authoring experience

- [ ] **Step 1: Write failing stepper and new-project tests**

Assert semantic ordered step navigation, current-step `aria-current="step"`,
completed-step text, keyboard-operable buttons, and mobile-safe classes. Assert
new composer starts on Details, preserves typed values when advancing locally
to Technologies, renders all six categories and ten technologies, enforces at
most eight selections in UI, submits all values to `createProjectAction`, and
exposes pending plus `aria-live` error feedback.

- [ ] **Step 2: Run new-composer tests and verify RED**

```powershell
pnpm.cmd test src/features/projects/project-stepper.test.tsx src/features/projects/new-project-composer.test.tsx src/app/dashboard/projects/new/page.test.tsx
```

Expected: FAIL because the composer and route do not exist.

- [ ] **Step 3: Implement Details and Technologies**

Use `useState` only for the pre-persistence two-step transition and technology
selection, and `useActionState` for the final server submission. Reuse one
`ProjectFields` component for labels, descriptions, error IDs, and native
inputs. No rich-text editor, uncontrolled HTML preview, or new form library.

- [ ] **Step 4: Write failing editor/image/delete tests**

Assert the Next.js 16 route awaits both `params` and `searchParams`; another
user's/missing project calls `notFound`; invalid `step` normalizes to Details;
Images renders optional guidance, one upload at a time, first image as Cover,
alt text, five-slot limit, remove and move-left/right controls; Review renders
persisted details and publish/unpublish actions; delete requires a checkbox or
typed confirmation before enabling the destructive submit.

- [ ] **Step 5: Run editor tests and verify RED**

```powershell
pnpm.cmd test src/features/projects/edit-project-composer.test.tsx src/features/projects/project-image-manager.test.tsx src/features/projects/project-delete-form.test.tsx src/app/dashboard/projects/[id]/edit/page.test.tsx
```

Expected: FAIL because editor components/routes do not exist.

- [ ] **Step 6: Implement Images and Review matching selected option 2**

Use the selected visual hierarchy: horizontal stepper, compact project summary
rail on large screens, wide image canvas, cover badge, thumbnail strip, and
restrained bottom action row. On small screens, stack summary/content, make the
step list horizontally scrollable inside its own region, and keep the page
free of horizontal overflow. Use native buttons/forms with visible focus and
pending states. Use object URLs only for a selected local preview and revoke
them on change/unmount.

- [ ] **Step 7: Run all composer tests and verify GREEN**

```powershell
pnpm.cmd test src/features/projects/project-stepper.test.tsx src/features/projects/new-project-composer.test.tsx src/features/projects/edit-project-composer.test.tsx src/features/projects/project-image-manager.test.tsx src/features/projects/project-delete-form.test.tsx src/app/dashboard/projects/new/page.test.tsx src/app/dashboard/projects/[id]/edit/page.test.tsx
```

Expected: all composer/editor tests pass without accessibility warnings.

### Task 8: Add Public Project Pages and Profile Project Cards

**Files:**
- Create: `src/features/projects/public-project.ts`
- Create: `src/features/projects/public-project.test.ts`
- Create: `src/features/projects/public-project-card.tsx`
- Create: `src/features/projects/public-project-card.test.tsx`
- Create: `src/features/projects/public-project-view.tsx`
- Create: `src/features/projects/public-project-view.test.tsx`
- Create: `src/app/projects/[id]/page.tsx`
- Create: `src/app/projects/[id]/page.test.tsx`
- Modify: `src/features/profile/public-profile.ts`
- Modify: `src/features/profile/public-profile.test.ts`
- Modify: `src/features/profile/public-profile-view.tsx`
- Modify: `src/features/profile/public-profile-view.test.tsx`
- Modify: `src/app/developers/[username]/page.tsx`
- Modify: `src/app/developers/[username]/page.test.tsx`

**Interfaces:**
- Produces: `getPublicProject(projectId: string)`
- Produces: `getPublishedProjectsByOwner(ownerId: string)`
- Produces: public detail metadata and rendered project cards

- [ ] **Step 1: Write failing public-data tests**

Assert public project query validates UUID, filters `status = published`, and
returns null for a missing/draft/private-owner project. Assert it returns only
public fields plus public owner identity, category, ordered technologies, and
ordered images. Assert owner-project query filters published status and orders
`published_at desc`. Provider errors must throw safe messages rather than
returning empty success.

- [ ] **Step 2: Run public-data tests and verify RED**

```powershell
pnpm.cmd test src/features/projects/public-project.test.ts
```

Expected: FAIL because the public-project module does not exist.

- [ ] **Step 3: Implement public server-only queries**

Use explicit `.eq("status", "published")` even though RLS also filters. Fetch
the public owner with `.eq("is_public", true).is("deleted_at", null)`. Keep
category, technology, and image queries focused and ordered. Return null on
invalid UUID without querying.

- [ ] **Step 4: Write failing public UI and route tests**

Assert project detail uses one H1, plain-text description, safe external links,
owner profile link, category and technology labels, ordered image alt text, and
fallback without images. Assert generated metadata uses project title/summary.
Assert missing results call `notFound`. Assert public profile renders a project
grid when rows exist and retains its current empty state when none exist.

- [ ] **Step 5: Run public UI tests and verify RED**

```powershell
pnpm.cmd test src/features/projects/public-project-card.test.tsx src/features/projects/public-project-view.test.tsx src/app/projects/[id]/page.test.tsx src/features/profile/public-profile-view.test.tsx src/app/developers/[username]/page.test.tsx
```

Expected: failures for absent public project UI and the old profile placeholder.

- [ ] **Step 6: Implement public project UI and profile integration**

Use `next/image` with stored dimensions and responsive `sizes`. Use the first
ordered image as cover and render remaining images as an accessible gallery.
Render line breaks with `whitespace-pre-line`; never parse description as HTML
or Markdown. Keep all external links `target="_blank"` with
`rel="nofollow noopener noreferrer"`. Keep the existing profile hero exactly
as structured and replace only its project empty-state branch.

- [ ] **Step 7: Run all public tests and verify GREEN**

```powershell
pnpm.cmd test src/features/projects/public-project.test.ts src/features/projects/public-project-card.test.tsx src/features/projects/public-project-view.test.tsx src/app/projects/[id]/page.test.tsx src/features/profile/public-profile.test.ts src/features/profile/public-profile-view.test.tsx src/app/developers/[username]/page.test.tsx
```

Expected: all public project/profile tests pass.

### Task 9: Documentation, Full Verification, and Hosted Handoff

**Files:**
- Modify: `README.md`
- Modify: `supabase/README.md`

**Interfaces:**
- Produces: exact hosted migration/test instructions and verified local state

- [ ] **Step 1: Document the implemented routes and image rules**

Document `/dashboard/projects`, `/dashboard/projects/new`,
`/dashboard/projects/[id]/edit`, `/projects/[id]`, the public project bucket,
10 MB JPEG/PNG/WebP rule, five-image limit, optional-image publishing, and the
manual hosted workflow. Do not describe discovery, likes, saves, or deployment
as implemented.

- [ ] **Step 2: Run the full test suite**

```powershell
pnpm.cmd test
```

Expected: every test file passes with zero failures.

- [ ] **Step 3: Run static and production verification**

```powershell
pnpm.cmd lint
pnpm.cmd typecheck
pnpm.cmd build
```

Expected: all commands exit 0 with no lint warnings or TypeScript/build errors.

- [ ] **Step 4: Restart the local production server with the fresh build**

Resolve the exact PID listening on port 3000, confirm it is the DevHub Next
process, stop only that PID, and start `pnpm.cmd start --hostname localhost`
hidden from `D:\DevHub`. Probe these paths without following redirects:

```text
/                                      -> 200
/developers/wajeehanadeem              -> 200
/dashboard/projects                    -> 307 when signed out
/dashboard/projects/new                -> 307 when signed out
/projects/00000000-0000-4000-8000-000000000000 -> 404
```

Do not create screenshots or repository QA files.

- [ ] **Step 5: Perform the final security and scope audit**

Search source/migration/docs while excluding `.env.local`, `.next`,
`node_modules`, and the lockfile. Confirm no literal credentials, service-role
client, `auth.uid()`, broad `for all` Storage policy, Phase 2 feature, or
unrelated landing redesign was introduced.

- [ ] **Step 6: Hand off hosted SQL validation**

Tell the user to run, in order, through the hosted Supabase SQL Editor:

1. `supabase/migrations/202609140003_project_management.sql`
2. `supabase/tests/database/003_project_management.sql`

Report hosted database behavior as unverified until the user confirms the SQL
test completed without an exception. Stop after this Project CRUD phase.
