# DevHub Project CRUD and Images Design

## Scope

This phase adds the MVP project-authoring and public-project experience on top
of the existing Clerk, Supabase, profile, and dashboard foundations. It includes
owner-only project creation, listing, editing, publishing, unpublishing, and
deletion; curated category and technology selection; optional project images;
public project detail pages; and published projects on public developer
profiles.

Discovery/search, likes, saves, follows, notifications, activity feeds,
trending logic, moderation tools, deployment, and all Phase 2 work remain
outside this phase. The landing page's existing presentation content and visual
structure remain unchanged.

## Approved Product and Visual Decisions

- The selected UI direction is ideation option 2, **Guided Step-by-Step
  Composer**, adapted responsively to the existing Mocha + Cream system.
- Authoring follows `Details -> Technologies -> Images -> Review`.
- A project is created as a draft after valid details and technology selections
  are submitted. Its generated UUID then scopes later image uploads.
- Project URLs use UUIDs: `/projects/[id]`.
- Each project has exactly one curated category and between one and eight
  curated technologies.
- Descriptions are plain text.
- Images are optional for publishing. A branded project fallback is shown when
  no image exists.
- A project can contain at most five images. The first ordered image is the
  cover.
- Project images accept JPEG, PNG, or WebP files up to 10 MB each.
- Image order is managed with explicit keyboard-accessible controls rather than
  drag-and-drop or a new dependency.
- The public `project-images` Supabase Storage bucket is used for MVP delivery.

## Routes

### `/dashboard/projects`

An authenticated owner-only project workspace lists the current developer's
drafts and published projects, ordered by most recently updated. Each row/card
shows cover or branded fallback, title, status, category, technologies, updated
date, and edit/view actions. The page includes a clear empty state and a
`Create project` action.

### `/dashboard/projects/new`

The first two guided steps collect details and technologies. Details include
title, summary, plain-text description, one category, optional live-demo URL,
and optional repository URL. Valid submission creates the project and its
technology rows atomically as a draft, then redirects to the persisted editor's
Images step.

### `/dashboard/projects/[id]/edit`

Only the project owner can load this route. It uses the selected four-step
composer and preloads persisted values. Details and technologies can be
updated; images can be uploaded, removed, reordered, and given required alt
text; Review presents the public-facing content and lets the owner save as a
draft, publish, unpublish, or delete with explicit confirmation.

### `/projects/[id]`

The public detail route loads only a published project whose owner profile is
public and active. Missing, draft, private-owner, or deleted-owner records use
the existing not-found experience. The page shows the image gallery or branded
fallback, title, summary, plain-text description, category, technologies,
demo/repository links, publication information, and owner identity linking to
`/developers/[username]`. No like/save controls are added in this phase.

### `/developers/[username]`

The existing profile page replaces its project placeholder with the owner's
published projects. It keeps the current identity layout and shows a responsive
project-card grid with cover/fallback, title, summary, category, and
technologies. Private profiles continue to return not found.

## Component and Module Architecture

Route pages remain React Server Components. Focused server-only modules own
queries, Supabase writes, and Storage lifecycle operations. Client Components
are limited to the guided form, file selection/preview, action pending/error
feedback, image ordering controls, and destructive confirmation.

Project modules are kept under `src/features/projects/` and split by purpose:

- validation and action-state contracts;
- current-owner queries and mutations;
- public project queries;
- project-image validation, metadata extraction, and Storage lifecycle;
- dashboard list, guided editor, image manager, public card, detail, and empty
  state components;
- Server Actions that authenticate, validate, mutate, revalidate, and return
  safe messages.

The existing profile dashboard navigation gains a real Projects link and a
`projects` active state. Shared header/footer and landing components are not
redesigned.

## Project Validation

- `title`: trimmed, 1-120 characters.
- `summary`: trimmed, 1-240 characters.
- `description`: trimmed plain text, 1-10,000 characters.
- `category_id`: one existing curated category.
- `technology_ids`: 1-8 unique existing curated technologies.
- `demo_url` and `repository_url`: optional absolute HTTP(S) URLs, maximum 500
  characters.
- `status`: only `draft` or `published`, controlled by explicit owner actions.

Zod validates all action inputs. Database constraints and RPC validation repeat
the security-relevant invariants. Owner IDs, UUIDs, timestamps, publication
timestamps, like counts, and search vectors are never client-controlled.

## Atomic Project Writes

A forward-only migration adds narrowly granted `security invoker` functions:

1. `create_current_project(...) returns uuid` derives `owner_id` from
   `(select auth.jwt()->>'sub')`, validates the category and 1-8 unique curated
   technology IDs, inserts a draft project, inserts its technologies, and
   returns the generated UUID in one transaction.
2. `update_current_project(...) returns void` verifies ownership through RLS,
   validates the same taxonomy rules, updates only editable fields/status, and
   replaces technology rows atomically.

Both functions use a fixed empty `search_path`, remain `security invoker`, are
revoked from `public` and `anon`, and are executable only by `authenticated`.
Existing table RLS remains the final authorization boundary.

Deletion reads the owner's image paths, deletes the owner-authorized project
row, and then attempts Storage cleanup. Database deletion cascades image and
technology metadata. A Storage cleanup failure returns a non-sensitive warning
without restoring deleted application data.

## Project Image Storage and Lifecycle

The migration creates or configures a public `project-images` bucket with a 10
MB per-object limit and JPEG, PNG, and WebP MIME restrictions. Object names use
`{clerk-sub}/{project-uuid}/{random-id}.{extension}`. The insert policy requires
the first path segment to match the Clerk JWT subject and the second segment to
identify a project owned by that subject. The delete policy requires the first
segment and the Storage object's `owner_id` to match the JWT subject; it does
not require the project row to remain, so owner-authorized orphan cleanup still
works after database-first project deletion.

Each upload is a separate action so five selected images cannot exceed one
large multipart request. The application validates size, declared MIME type,
extension, file signature, and image dimensions before upload. A small
dependency-free parser reads dimensions for the supported formats; values must
fit the existing 1-10,000 pixel database constraints. Alt text is required and
limited to 200 characters.

Upload order:

1. Confirm ownership and that fewer than five images exist.
2. Upload a uniquely named object.
3. Insert the corresponding `project_images` row at the next order slot.
4. If metadata insertion fails, delete the new object as compensation.

Removal deletes metadata first, closes the order gap, then removes the Storage
object. Reordering is performed atomically by an owner-scoped database function
that accepts all current image IDs in the desired order and rewrites slots
without violating the unique `(project_id, sort_order)` constraint. The first
slot is the cover.

Public image URLs are derived from stored paths. `next.config.ts` extends the
existing Supabase-host pattern only to
`/storage/v1/object/public/project-images/**`; no broad remote domain is added.
Server Action body size is raised only enough for one validated 10 MB image plus
multipart overhead.

## Cache, Error, and State Behavior

Successful mutations revalidate the dashboard, project workspace, editor,
public project URL, and owner's public profile as applicable. Create redirects
to the persisted Images step. Publish redirects to or links to the public
detail route; unpublish makes that route return not found immediately.

Forms expose field-associated validation, an `aria-live` action message, and
pending controls that prevent duplicate submissions. Data-provider errors are
converted to stable user-facing messages; raw Supabase errors, JWTs, paths not
owned by the current user, and credentials are never displayed. Missing owned
projects use not found rather than leaking whether another user's draft exists.

Empty states distinguish no projects, no images, and no published work. The
branded fallback uses existing deterministic UI styling, not an uploaded fake
asset. Responsive layouts collapse the sidebar and guided stepper cleanly,
retain native scrolling for the gallery, avoid horizontal page overflow, and
preserve visible focus/reduced-motion behavior.

## Authorization and Security

- Every dashboard route and mutation independently requires a Clerk user and
  completed profile.
- Every database write uses the Clerk-token-aware server Supabase client; no
  service-role client is introduced.
- RLS restricts draft visibility and all mutations to the owning Clerk `sub`.
- Public queries require both `projects.status = 'published'` and a public,
  non-deleted owner profile.
- Project UUIDs are identifiers, not authorization secrets.
- Taxonomy remains read-only to application users.
- Uploads are untrusted and checked at the form, server, bucket, and database
  layers.
- External URLs accept only HTTP(S) and render with safe external-link
  attributes.
- Delete actions require an explicit project ID match and confirmation UI.

## Testing and Verification

Implementation follows test-driven development. Unit/component tests cover
project validation, URL normalization, taxonomy limits, owner query behavior,
action outcomes, project-image signature/dimension validation, upload
compensation, removal/reordering, guided-step accessibility, project lists,
public cards/detail, profile project integration, confirmation, and responsive
class behavior where meaningful.

A hosted SQL test covers atomic project/technology creation and updates,
identity isolation, status changes, image ordering limits, Storage bucket
configuration/policies, and function privileges. It runs inside a transaction
that rolls back fixtures. Because this project intentionally has no Docker or
Supabase CLI, the migration and SQL test are supplied for manual execution in
the hosted development project.

Final local verification runs:

- `pnpm.cmd lint`
- `pnpm.cmd typecheck`
- `pnpm.cmd test`
- `pnpm.cmd build`

The running app is checked for successful public responses and expected Clerk
redirects. No Playwright browser installation, Git operation, deployment,
repository screenshot, or QA artifact is part of this phase.
