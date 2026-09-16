# Profile Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add secure public developer profiles, authenticated profile editing, curated technology selection, visibility control, and a replaceable Supabase-hosted avatar.

**Architecture:** React Server Component routes load focused server-only profile queries. Authenticated Server Actions validate FormData with Zod and write through the existing Clerk-token-aware Supabase client; a narrow security-invoker RPC makes profile and technology updates atomic. A public Storage bucket serves avatars while JWT-path RLS restricts uploads and deletes.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Tailwind CSS 4, Clerk, Supabase PostgreSQL/Storage, Zod 4, Vitest, React Testing Library

**Spec:** `docs/superpowers/specs/2026-09-14-profile-management-design.md`

## Global Constraints

- Keep the Mocha + Cream visual system and existing landing-page structure.
- Use Clerk `sub` as the only application identity and `(select auth.jwt()->>'sub')` in SQL.
- Use the hosted development Supabase project; do not add Docker or Supabase CLI.
- Do not add dependencies, Project CRUD, discovery/search, likes, saves, Phase 2 features, deployment, screenshots, or QA artifacts.
- Do not commit or push; checkpoint steps explicitly leave changes uncommitted.
- Public profiles use `/developers/[username]`; editing uses `/dashboard/profile`.
- Accept one JPEG/PNG/WebP avatar up to 2 MB and at most eight curated technologies.

---

### Task 1: Add the atomic profile and avatar Storage database boundary

**Files:**
- Create: `supabase/migrations/202609140002_profile_management.sql`
- Create: `supabase/tests/database/002_profile_management.sql`
- Modify: `src/types/database.generated.ts`

**Interfaces:**
- Produces RPC `update_current_profile(p_username text, p_display_name text, p_headline text, p_bio text, p_location text, p_website_url text, p_github_url text, p_linkedin_url text, p_is_public boolean, p_technology_ids smallint[]) returns void`.
- Produces public bucket `avatars`, limited to 2 MB and `image/jpeg`, `image/png`, `image/webp`.
- Produces insert/delete policies scoped to `avatars/{Clerk sub}/...`.

- [ ] **Step 1: Write database assertions first**

Add a rollback-only SQL test that creates an authenticated fixture, calls the RPC with eight technologies, verifies profile and join-row replacement, verifies nine technologies are rejected, verifies another identity cannot update the profile, and documents Storage policy catalog assertions.

```sql
select public.update_current_profile(
  'testowner', 'Updated Owner', 'Engineer', 'Bio', 'Lahore',
  'https://example.com', 'https://github.com/example',
  'https://linkedin.com/in/example', true,
  array[1,2]::smallint[]
);
```

- [ ] **Step 2: Verify the database test cannot yet pass**

Run the SQL in the hosted editor only after the initial migration and seed. Before the migration it must fail because `public.update_current_profile` and the `avatars` bucket do not exist. If hosted execution is unavailable to the agent, record this as a manual RED checkpoint rather than weakening the test.

- [ ] **Step 3: Add the forward-only migration**

Create/configure the bucket idempotently, add narrowly named object policies, and add the `security invoker` RPC. Revoke function execution from `public` and `anon`, then grant it to `authenticated`. The function derives identity from the JWT, rejects null identity, more than eight IDs, duplicate IDs, and unknown technology IDs, then updates the caller's profile and replaces join rows in one transaction.

- [ ] **Step 4: Extend generated type snapshot**

Add the exact RPC signature to `Database["public"]["Functions"]`:

```ts
update_current_profile: {
  Args: {
    p_bio: string | null;
    p_display_name: string;
    p_github_url: string | null;
    p_headline: string | null;
    p_is_public: boolean;
    p_linkedin_url: string | null;
    p_location: string | null;
    p_technology_ids: number[];
    p_username: string;
    p_website_url: string | null;
  };
  Returns: undefined;
};
```

- [ ] **Step 5: Run typecheck and record hosted SQL status**

Run `pnpm.cmd typecheck`. Do not claim database behavior passed unless the hosted SQL test actually ran without an exception.

- [ ] **Step 6: Checkpoint without committing**

Review the migration diff for service-role keys, broad `for all` policies, and `auth.uid()`; leave changes uncommitted.

### Task 2: Build profile and avatar validation with TDD

**Files:**
- Create: `src/features/profile/profile-edit-input.ts`
- Create: `src/features/profile/profile-edit-input.test.ts`
- Create: `src/features/profile/avatar-input.ts`
- Create: `src/features/profile/avatar-input.test.ts`

**Interfaces:**
- Produces `parseProfileEditFormData(formData: FormData): ProfileEditInputResult`.
- Produces `parseAvatarFormData(formData: FormData): AvatarInputResult`.
- `ProfileEditInput` uses database column names plus `technologyIds: number[]`.
- `AvatarInput` contains a validated `File`, extension, and MIME type.

- [ ] **Step 1: Write failing profile parsing tests**

Cover trimming, lowercase username normalization, optional blank-to-null behavior, HTTP(S)-only URLs, invalid technology IDs, duplicate IDs, and the eight-ID maximum.

```ts
expect(parseProfileEditFormData(formData)).toEqual({
  success: false,
  fieldErrors: { technologies: ["Choose no more than 8 technologies."] },
});
```

- [ ] **Step 2: Run the profile validation test and verify RED**

Run `pnpm.cmd test -- src/features/profile/profile-edit-input.test.ts`; expect failure because the module does not exist.

- [ ] **Step 3: Implement minimal profile parsing**

Use Zod preprocessors for normalized optional strings and `z.url({ protocol: /^https?$/ })`-equivalent explicit URL refinement. Keep user-facing field keys stable.

- [ ] **Step 4: Verify profile validation GREEN**

Run the focused test and confirm all cases pass.

- [ ] **Step 5: Write failing avatar parsing tests**

Cover absent/empty file, size over `2 * 1024 * 1024`, disallowed MIME, misleading extension, and accepted JPEG/PNG/WebP.

- [ ] **Step 6: Run avatar tests and verify RED**

Run `pnpm.cmd test -- src/features/profile/avatar-input.test.ts`; expect module-not-found failure.

- [ ] **Step 7: Implement minimal avatar parsing**

Export constants `AVATAR_MAX_BYTES`, `AVATAR_ACCEPT`, and a strict MIME-to-extension map. Return safe field errors without inspecting or logging file content.

- [ ] **Step 8: Verify avatar tests GREEN and checkpoint**

Run both focused validation tests; leave changes uncommitted.

### Task 3: Add server-only profile queries and persistence

**Files:**
- Modify: `src/features/profile/current-profile.ts`
- Modify: `src/features/profile/current-profile.test.ts`
- Create: `src/features/profile/public-profile.ts`
- Create: `src/features/profile/public-profile.test.ts`
- Create: `src/features/profile/avatar-storage.ts`
- Create: `src/features/profile/avatar-storage.test.ts`
- Modify: `src/lib/auth/require-profile.ts`
- Modify: `src/lib/auth/require-profile.test.ts`

**Interfaces:**
- `getCurrentProfile()` returns all editable columns plus selected technology IDs.
- `updateCurrentProfile(input: ProfileEditInput)` calls `update_current_profile` and returns `"updated" | "username-taken"`.
- `getPublicProfile(username: string)` returns a public profile with ordered technology rows or `null`.
- `uploadCurrentAvatar(file: File, extension: AvatarExtension)` and `removeCurrentAvatar()` implement compensation/cleanup and return structured outcomes.
- `getAvatarPublicUrl(path: string | null)` returns a URL or `null`.

- [ ] **Step 1: Expand current-profile tests first**

Require exact selected fields, technology relation shape, RPC argument mapping, and `23505` username conflict mapping.

- [ ] **Step 2: Verify current-profile RED**

Run the focused test and confirm failure from the missing expanded behavior.

- [ ] **Step 3: Implement current profile and RPC persistence**

Keep `server-only`, preserve onboarding creation, and normalize nested technology rows into `technologyIds`.

- [ ] **Step 4: Write and verify failing public-query tests**

Test normalized username query, explicit `is_public = true` and `deleted_at is null` filters, ordered technologies, `null` result, and safe provider-error handling.

- [ ] **Step 5: Implement public query and verify GREEN**

Use the existing Clerk-token-aware server client; do not introduce a service-role client.

- [ ] **Step 6: Write and verify failing avatar lifecycle tests**

Test generated `{userId}/{uuid}.{ext}` paths, upload, profile-path update, new-object compensation after database failure, old-object cleanup after success, and removal ordering.

- [ ] **Step 7: Implement avatar lifecycle and verify GREEN**

Use Supabase Storage API methods only; never manipulate `storage.objects` directly. Surface safe outcome codes and retain provider details only as `Error.cause` on the server.

- [ ] **Step 8: Expand `requireProfile` and verify its tests**

Return the expanded profile fields required by dashboard navigation and avatar rendering without changing redirect behavior.

- [ ] **Step 9: Run all profile data tests and checkpoint**

Run `pnpm.cmd test -- src/features/profile/current-profile.test.ts src/features/profile/public-profile.test.ts src/features/profile/avatar-storage.test.ts src/lib/auth/require-profile.test.ts`; leave changes uncommitted.

### Task 4: Add tested Server Actions

**Files:**
- Create: `src/features/profile/profile-edit-state.ts`
- Create: `src/features/profile/profile-actions.ts`
- Create: `src/features/profile/profile-actions.test.ts`

**Interfaces:**
- `updateProfileAction(previousState, formData): Promise<ProfileEditActionState>`.
- `uploadAvatarAction(previousState, formData): Promise<AvatarActionState>`.
- `removeAvatarAction(previousState, formData): Promise<AvatarActionState>`.
- Action-state constants live outside the `"use server"` module.

- [ ] **Step 1: Write failing action tests**

Cover field validation short-circuiting, profile authorization, username conflict, safe generic errors, avatar validation, upload/remove outcome messages, and successful cache revalidation of `/dashboard`, `/dashboard/profile`, and old/new public profile URLs.

- [ ] **Step 2: Verify actions RED**

Run `pnpm.cmd test -- src/features/profile/profile-actions.test.ts`; expect missing-module failure.

- [ ] **Step 3: Implement minimal actions**

Use `"use server"`, call server-only helpers that reauthenticate, and invoke `revalidatePath` only after successful writes. Do not export non-async state values from the action module.

- [ ] **Step 4: Verify actions GREEN and checkpoint**

Run the focused action test, then existing onboarding action tests; leave changes uncommitted.

### Task 5: Create reusable profile UI and dashboard navigation

**Files:**
- Create: `src/features/profile/profile-avatar.tsx`
- Create: `src/features/profile/profile-avatar.test.tsx`
- Create: `src/features/profile/dashboard-navigation.tsx`
- Create: `src/features/profile/dashboard-navigation.test.tsx`
- Modify: `src/components/ui/icons.tsx`
- Modify: `src/app/dashboard/page.tsx`
- Modify: `src/app/dashboard/page.test.tsx`

**Interfaces:**
- `<ProfileAvatar displayName avatarPath size="sm" | "md" | "lg" priority? />`.
- `<DashboardNavigation profile active="overview" | "profile" />`.

- [ ] **Step 1: Write failing avatar component tests**

Assert accessible uploaded-image output, initials fallback, and no broken image element when the path is null.

- [ ] **Step 2: Verify avatar test RED, implement, and verify GREEN**

Use `next/image` only with the narrowly configured Storage hostname.

- [ ] **Step 3: Write failing navigation tests**

Assert enabled edit/public links, correct `aria-current`, and private-profile public-link treatment.

- [ ] **Step 4: Verify navigation RED, implement, and verify GREEN**

Extract only the dashboard sidebar; do not refactor unrelated landing navigation.

- [ ] **Step 5: Update dashboard tests first, then dashboard page**

Replace the phase-placeholder copy with profile-management links while keeping the Project workspace deferred. Use `ProfileAvatar` and `DashboardNavigation`.

- [ ] **Step 6: Run component/dashboard tests and checkpoint**

Leave changes uncommitted.

### Task 6: Build the authenticated profile edit experience

**Files:**
- Create: `src/features/profile/profile-edit-form.tsx`
- Create: `src/features/profile/profile-edit-form.test.tsx`
- Create: `src/features/profile/avatar-form.tsx`
- Create: `src/features/profile/avatar-form.test.tsx`
- Create: `src/app/dashboard/profile/page.tsx`
- Create: `src/app/dashboard/profile/page.test.tsx`

**Interfaces:**
- Forms receive serializable current-profile and technology options from the Server Component.
- The route uses `requireProfile()` and an ordered public technologies query.

- [ ] **Step 1: Write failing profile-form accessibility tests**

Assert all fields, URL input types, current values, eight-choice guidance, native checkbox names, visibility checkbox, field error association, pending submit label, and `aria-live` feedback.

- [ ] **Step 2: Verify RED, implement the form, verify GREEN**

Use `useActionState` only in the Client Component and preserve progressive enhancement.

- [ ] **Step 3: Write failing avatar-form tests**

Assert file accept value, 2 MB guidance, current avatar, Upload and conditional Remove controls, pending behavior, and accessible result messages.

- [ ] **Step 4: Verify RED, implement avatar form, verify GREEN**

Do not generate browser object URLs unless they are revoked; a pre-submit preview is optional and omitted for YAGNI.

- [ ] **Step 5: Write failing edit-page tests**

Assert authentication/profile loading, ordered technologies, page heading, responsive sections, active navigation, and propagation of current values.

- [ ] **Step 6: Verify RED, implement edit page, verify GREEN**

Use the approved Mocha + Cream tokens and existing container/layout conventions.

- [ ] **Step 7: Run edit experience tests and checkpoint**

Leave changes uncommitted.

### Task 7: Build the public developer profile page

**Files:**
- Create: `src/features/profile/public-profile-view.tsx`
- Create: `src/features/profile/public-profile-view.test.tsx`
- Create: `src/app/developers/[username]/page.tsx`
- Create: `src/app/developers/[username]/page.test.tsx`
- Modify: `src/components/layout/site-header.tsx`
- Modify: `src/components/layout/site-header.test.tsx`

**Interfaces:**
- Public route awaits `params: Promise<{ username: string }>` per Next.js 16.
- `generateMetadata` returns profile-aware metadata or a safe generic title.

- [ ] **Step 1: Write failing public-view tests**

Assert one h1, avatar/initials, headline, optional sections, safe external links, technology pills, and Projects empty state without interaction buttons.

- [ ] **Step 2: Verify RED, implement view, verify GREEN**

Keep the component presentational and serializable.

- [ ] **Step 3: Write failing route tests**

Assert awaited params, lowercased lookup, `notFound()` for missing/private data, rendered public data, and metadata.

- [ ] **Step 4: Verify RED, implement route, verify GREEN**

Call only `getPublicProfile`; do not fetch Clerk identities or projects.

- [ ] **Step 5: Test and fix cross-route header links**

Change landing section links from fragments to root-qualified fragments (`/#developers`, `/#trending-projects`) so they work from developer/dashboard routes while preserving landing behavior.

- [ ] **Step 6: Run public profile and header tests; checkpoint**

Leave changes uncommitted.

### Task 8: Configure image delivery, update documentation, and verify

**Files:**
- Modify: `next.config.ts`
- Modify: `README.md`
- Possibly modify: `.env.example` only if no new key is required (expected: no change)

**Interfaces:**
- Next config derives one HTTPS remote image pattern from `NEXT_PUBLIC_SUPABASE_URL` when present.
- Next config sets `serverActions.bodySizeLimit` to `3mb` so a validated 2 MB file plus multipart overhead is accepted.

- [ ] **Step 1: Add a config-focused assertion where practical**

If importing the config is stable in Vitest, assert the 3 MB action limit and restricted hostname. Otherwise treat this typed configuration as an allowed configuration-file TDD exception and rely on build validation.

- [ ] **Step 2: Modify Next configuration**

Parse only an HTTPS Supabase URL for `images.remotePatterns`; fall back to an empty array when missing so credential-free builds remain possible.

- [ ] **Step 3: Update README scope and hosted setup**

Document the Profile Management phase, avatar constraints, and exact order for applying migration `202609140002_profile_management.sql` and database test `002_profile_management.sql`.

- [ ] **Step 4: Run the full verification suite**

Run, read, and record each command independently:

```powershell
pnpm.cmd lint
pnpm.cmd typecheck
pnpm.cmd test
pnpm.cmd build
```

- [ ] **Step 5: Verify runtime without creating artifacts**

Use the existing local server if healthy, otherwise run `pnpm.cmd dev`, request `/`, and confirm an HTTP response. Do not create screenshots. Authenticated edit/public-profile visual review remains a user step after the hosted migration is applied.

- [ ] **Step 6: Security and scope review**

Search for secrets, `service_role`, `auth.uid()`, broad Storage policies, accidental project/discovery implementation, and unrelated diffs. Report hosted SQL as unverified until the user runs it successfully.

- [ ] **Step 7: Final checkpoint without committing**

Report files changed, exact verification results, the manual hosted migration/test steps, and any blockers. Stop before Project CRUD.
