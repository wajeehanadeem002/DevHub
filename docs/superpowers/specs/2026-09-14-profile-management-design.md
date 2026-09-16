# DevHub Profile Management Design

## Scope

This phase adds the MVP developer-profile experience on top of the existing
Clerk and Supabase boundary. It includes a public profile page, authenticated
profile editing, curated technology selection, public-profile visibility, and
one replaceable avatar stored in Supabase Storage.

Project creation, project editing, discovery/search backends, likes, saves,
follows, notifications, and deployment remain outside this phase.

## Approved Product Decisions

- Public profile route: `/developers/[username]`.
- Authenticated edit route: `/dashboard/profile`.
- Profiles are public by default and can be made private.
- A private profile returns the public not-found experience while its owner
  retains dashboard and editing access.
- Developers can select at most eight curated technologies.
- Each profile has at most one active avatar.
- Avatar uploads accept JPEG, PNG, or WebP files up to 2 MB.
- Replacing or removing an avatar cleans up the prior Storage object.
- Profiles without an uploaded avatar use an initials fallback.
- Supabase Storage's `avatars` bucket is public for MVP delivery.

## Architecture

The feature stays inside the server-first modular monolith. Route pages remain
React Server Components. They call focused server-only profile queries and
compose small feature components. Client Components are limited to forms that
need `useActionState`, file selection/preview, pending feedback, or interactive
technology selection.

Mutations use authenticated Server Actions. Each action rechecks Clerk
authentication and profile ownership, validates untrusted form data with Zod,
and writes through a Clerk-token-aware Supabase client. Supabase grants and RLS
remain the final authorization boundary.

## Routes and Page Composition

### `/developers/[username]`

The public page loads a non-deleted, public profile by normalized username and
its curated technologies. Missing, private, or deleted profiles use
`notFound()`. The page contains the avatar/initials identity block, display
name, username, headline, bio, location, external links, technologies, and a
restrained projects empty state. It does not implement project retrieval or
project interactions in this phase.

### `/dashboard/profile`

The edit page requires an authenticated user with an existing profile. It
contains three focused panels:

1. Avatar upload/removal.
2. Profile fields and external links.
3. Curated technology selection and public/private visibility.

The dashboard navigation exposes Profile settings and the public profile link.
The public link is visually disabled when the profile is private. Existing
dashboard and landing-page structure remain intact.

## Profile Data and Validation

The editable profile fields are:

- `username`: normalized lowercase, 3–30 conservative alphanumeric/underscore
  format, globally unique.
- `display_name`: required, trimmed, maximum 80 characters.
- `headline`: optional, maximum 120 characters.
- `bio`: optional plain text, maximum 1,000 characters.
- `location`: optional, maximum 100 characters.
- `website_url`, `github_url`, and `linkedin_url`: optional absolute HTTP(S)
  URLs, maximum 500 characters each.
- `is_public`: explicit boolean.
- technology IDs: unique curated IDs, maximum eight, all required to exist in
  `public.technologies`.

`country_code` remains unchanged because no country picker is in the approved
scope. The database continues to own identity, timestamps, search vectors, and
other protected fields.

## Atomic Profile and Technology Update

A forward-only migration adds a narrowly granted, `security invoker`
PostgreSQL function for updating the current profile and replacing its
technology selections in one transaction. The function derives the profile
identity from `(select auth.jwt()->>'sub')`, rejects more than eight IDs,
validates that all IDs reference curated technologies, updates only editable
columns, and replaces only the caller's `profile_technologies` rows.

The function is executable only by `authenticated`. Existing table grants,
constraints, and RLS continue to apply because it is `security invoker`.

## Avatar Storage and Lifecycle

A forward-only migration creates or configures a public `avatars` bucket with
a 2 MB file-size limit and the approved MIME types. Storage object policies
allow authenticated users to insert and delete only objects whose first path
segment equals their Clerk JWT `sub`. Public delivery is provided by the public
bucket; upload and delete operations still require RLS authorization.

Objects use `{clerk-sub}/{random-id}.{extension}`. The application validates
file presence, size, declared MIME type, and extension before upload. The
bucket independently enforces size and MIME restrictions.

Replacement order:

1. Upload the new unique object.
2. Update `profiles.avatar_path` through the owner-authorized database path.
3. If the database update fails, delete the new object as compensation.
4. After a successful update, delete the previous object.

Removal first clears `avatar_path`, then deletes the previous object. A cleanup
failure does not restore a stale database reference; it returns a non-sensitive
warning and leaves an orphan eligible for later administrative cleanup.

Public avatar URLs are derived from the stored path and the configured public
Supabase URL. The Next.js image remote pattern is restricted to the configured
Supabase hostname; no broad external image domain is allowed.

## Mutation and Cache Behavior

Separate actions handle profile details, avatar upload, and avatar removal.
They return structured action state with field errors and a safe top-level
message. Username uniqueness errors become a field-level message. Successful
mutations revalidate the dashboard, edit route, and relevant old/new public
profile paths so renamed profiles do not remain stale.

## Error, Loading, and Accessibility Behavior

- Edit forms expose associated field errors and an `aria-live` status region.
- Submit buttons expose pending states and prevent duplicate client submits.
- Avatar controls use a labelled file input with format/size guidance.
- Technology controls use native checkboxes with visible focus states.
- External public links use safe `rel` values and clear accessible names.
- Public missing/private profiles use the existing not-found convention.
- Data-fetch failures throw safe application errors handled by existing route
  error boundaries; raw provider errors and credentials are never displayed.
- Layout remains responsive with no horizontal overflow and retains the Mocha
  + Cream visual system.

## Security

- Every mutation authenticates independently; UI visibility is not treated as
  authorization.
- Storage paths are generated by the server and scoped to the Clerk subject.
- No service-role client or service-role credential is introduced.
- User-supplied URLs are parsed as HTTP(S); `javascript:` and other schemes are
  rejected.
- Files are treated as untrusted and constrained at both application and bucket
  levels.
- The public page reads only public, non-deleted profiles.
- Protected identity and generated columns remain unreachable through client
  grants.

## Testing and Verification

Implementation follows test-driven development. Tests cover profile input and
URL normalization, eight-technology enforcement, public/private query
behavior, authenticated mutation outcomes, username conflicts, avatar file
validation and lifecycle compensation, accessible form/page rendering, and
dashboard navigation.

A hosted-database test covers the atomic update function and Storage policy
intent where the SQL editor supports the required roles. Because the project
does not use Docker or the Supabase CLI, the new migration and database test
will be supplied for manual execution in the hosted development project.

Final local verification runs:

- `pnpm.cmd lint`
- `pnpm.cmd typecheck`
- `pnpm.cmd test`
- `pnpm.cmd build`

No Playwright browser installation, screenshots, commits, pushes, or
deployment are part of this phase.
