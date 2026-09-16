# Project Engagement Design

**Date:** 2026-09-15
**Status:** Approved design, awaiting written-spec review

## Goal

Add secure Like/Unlike and Save/Unsave interactions to published project
detail pages, then give authenticated users a dashboard page containing their
saved projects. The feature must reuse the existing Clerk-to-Supabase session,
PostgreSQL row-level security, uniqueness constraints, and atomic like counter.

## Scope

The phase includes:

- Like/Unlike and Save/Unsave controls on `/projects/[id]`.
- Optimistic interaction feedback with rollback on failure.
- A signed-out call to action that returns to the same public project after
  authentication.
- A non-interactive owner state for a user viewing their own project.
- A protected `/dashboard/saved` page and matching dashboard navigation item.
- Cache revalidation for project detail, discovery, landing, and saved-project
  views after successful mutations.

The phase does not include:

- Interactive controls inside discovery or landing project cards.
- Public lists of who liked or saved a project.
- Notifications, activity feeds, save collections, or analytics.
- New database tables, policies, RPCs, or migrations.

## Existing Database Contract

`public.project_likes` and `public.project_saves` already use
`(project_id, user_id)` primary keys. `user_id` defaults to the Clerk subject in
`auth.jwt()`. RLS allows authenticated users to read and delete only their own
rows, and insert only for published projects they do not own.

The `project_likes_sync_count` trigger updates `projects.like_count` after an
insert or delete. Application code treats PostgreSQL/RLS as the final authority
and never writes `like_count` directly.

## Architecture

### Server-only data boundary

A focused project-engagement module will:

- Read the current viewer's like/save state for one published project.
- Insert or delete the current viewer's like/save row using the authenticated
  Supabase server client.
- Load the current viewer's saved project IDs in newest-saved order.
- Hydrate only still-published projects with public owners, categories,
  technologies, cover images, and like counts.

All project IDs are validated before a provider call. Provider details are
wrapped in stable public errors. The viewer's Clerk ID and raw Storage paths
must not cross into client component props.

The existing public project result will expose `like_count`, which is public
aggregate data. Ownership is reduced to an `isOwner` boolean before rendering.

### Server actions

Two explicit, idempotent server actions will accept a validated project ID and
the desired boolean state:

- `setProjectLikedAction(projectId, liked)`
- `setProjectSavedAction(projectId, saved)`

Both actions require an authenticated DevHub profile, call the server-only data
boundary, and return a small discriminated result containing the authoritative
state. Adding an already-present row is treated as already active; removing a
missing row is treated as already inactive. Other constraint, RLS, network, or
provider failures return a stable message without database details.

After success, actions revalidate:

- `/`
- `/projects`
- `/projects/[id]`
- `/dashboard/saved`

Like mutations refresh the aggregate count on public surfaces. Save mutations
refresh the viewer's saved-project page.

### Client interaction controls

A small client component receives only:

- project ID
- initial like count
- initial liked/saved booleans
- signed-in and owner booleans

For an eligible signed-in viewer, Like and Save buttons update optimistically
inside a React transition. A failed action restores the prior state and exposes
an accessible error message. While the corresponding request is pending, its
button is disabled to prevent duplicate submissions.

Signed-out viewers receive a `Sign in to like or save` link with the current
project path in a `returnTo` parameter. The sign-in route accepts only a valid
internal `/projects/<uuid>` return path before passing it to Clerk; every other
value keeps the existing `/onboarding` fallback. This prevents an open redirect.
Owners receive a clear `This is your project` state without mutation buttons,
matching the database rule that owners cannot like or save their own work.

The controls appear in the public project sidebar below the project metadata
and above external links. Discovery cards remain one valid, fully clickable
link and do not contain nested buttons.

## Saved Projects Dashboard

`/dashboard/saved` uses the existing protected dashboard shell pattern:

- `requireProfile()` gates the route.
- The dashboard navigation gains a `Saved projects` item and a corresponding
  active state.
- Saved projects appear newest-saved first using the shared public project card.
- Projects that were unpublished, deleted, or whose owner profile is no longer
  public are omitted.
- An empty state links to `/projects` so the user can discover work to save.

Resolved avatar and cover URLs are produced on the server. Raw Storage paths
and user IDs are not serialized to the browser.

## Data Flow

1. The public detail page loads a published project and public aggregate count.
2. It reads the optional Clerk viewer and, when signed in, loads only that
   viewer's engagement rows.
3. The server renders eligible, owner, or signed-out controls.
4. A click applies an optimistic local state and calls an explicit server
   action.
5. Supabase authenticates the Clerk JWT; RLS and constraints authorize the
   mutation; the database trigger updates the like count.
6. The action returns the authoritative state and revalidates affected routes.
7. The client keeps the confirmed state or rolls back and announces an error.

## Error and Concurrency Behavior

- Invalid project IDs fail before authentication or database work.
- Missing/unpublished/unauthorized projects produce the same safe mutation
  failure and do not reveal whether a private row exists.
- Unique-like/save conflicts converge to the requested active state.
- Delete operations are naturally idempotent.
- A failed optimistic mutation restores both the button state and displayed
  like count.
- Only successful mutations trigger cache revalidation.

## Accessibility

- Buttons expose state through `aria-pressed`.
- Pending controls expose disabled state without changing their accessible
  names.
- Mutation errors use an `aria-live` status region.
- Signed-out and owner states are understandable without relying on color.
- Keyboard focus styles follow the current DevHub visual system.

## Testing

The implementation will use test-driven development and cover:

- Engagement state reads for signed-out, owner, eligible, liked, and saved
  viewers.
- Explicit idempotent insert/delete behavior and safe provider-error mapping.
- Server action validation, authorization boundary calls, result mapping, and
  exact revalidation paths.
- Optimistic Like/Save UI, count updates, pending behavior, rollback, signed-out
  return link, and owner state.
- Public project page wiring without leaking Clerk IDs or Storage paths.
- Saved-project ordering, public-only filtering, URL resolution, navigation,
  empty state, and protected page wiring.
- Existing database RLS tests remain the integration contract; no hosted
  database changes are required.
- Repository-wide lint, typecheck, tests, production build, and local route
  probes complete the quality gate.

## Success Criteria

- An eligible authenticated user can like/unlike and save/unsave a published
  project without a full-page form flow.
- The visible like count stays consistent with the requested state and rolls
  back after failure.
- Signed-out users are asked to sign in and return safely to the same project.
- Owners cannot see actionable Like/Save controls on their own project.
- Saved projects are available from dashboard navigation and never expose
  unpublished/private work.
- Existing project creation, publishing, discovery, profile, and authentication
  behavior remains green.
