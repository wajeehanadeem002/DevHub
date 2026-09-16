# Project Engagement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add secure optimistic Like/Save controls to public project details and a protected dashboard page for the current user's saved projects.

**Architecture:** Server-only modules read and mutate engagement through the authenticated Clerk-to-Supabase client while PostgreSQL RLS, primary keys, and the like-count trigger remain authoritative. A focused client component owns optimistic interaction state; saved projects reuse the existing discovery hydration, media-resolution, and public-card boundaries.

**Tech Stack:** Next.js 16.3.4 App Router, React 19.2.8, Clerk 7.9.2, Supabase JS 2.116.0, TypeScript, Vitest, Testing Library, Tailwind CSS 4

**Spec:** `docs/superpowers/specs/2026-09-15-project-engagement-design.md`

## Global Constraints

- Do not add a database migration or dependency; the existing `project_likes`, `project_saves`, RLS policies, uniqueness constraints, and like-count trigger are the database contract.
- Validate every untrusted project ID before authentication or a provider call.
- Do not serialize Clerk user IDs, project owner IDs, or raw Supabase Storage paths into client props.
- Do not place interactive controls inside discovery cards because each card remains one valid project-detail link.
- Only successful mutations revalidate `/`, `/projects`, `/projects/[id]`, and `/dashboard/saved`.
- Mask provider and RLS details behind stable user-safe errors.
- Read `node_modules/next/dist/docs/01-app/03-api-reference/02-directives/use-server.md`, `node_modules/next/dist/docs/01-app/03-api-reference/02-directives/use-client.md`, `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/revalidatePath.md`, and `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md` before implementation because this repository uses Next.js 16 conventions.
- `D:\DevHub` is not a Git repository, so each task ends with a verified workspace checkpoint instead of a commit.

---

### Task 1: Safe project return after sign-in

**Files:**
- Create: `src/features/auth/sign-in-return.ts`
- Create: `src/features/auth/sign-in-return.test.ts`
- Modify: `src/app/sign-in/[[...sign-in]]/page.tsx`
- Create: `src/app/sign-in/[[...sign-in]]/page.test.tsx`

**Interfaces:**
- Consumes: `parseProjectId(value: string)` from `src/features/projects/project-input.ts`.
- Produces: `parseProjectSignInReturn(value: string | string[] | undefined): string | null`.
- Produces: an async sign-in page accepting `searchParams: Promise<{ returnTo?: string | string[] }>`.

- [ ] **Step 1: Write the failing return-path parser test**

```ts
import { describe, expect, it } from "vitest";

import { parseProjectSignInReturn } from "./sign-in-return";

describe("parseProjectSignInReturn", () => {
  const id = "550e8400-e29b-41d4-a716-446655440000";

  it("accepts only a normalized internal project-detail path", () => {
    expect(parseProjectSignInReturn(`/projects/${id}`)).toBe(
      `/projects/${id}`,
    );
    expect(parseProjectSignInReturn([`/projects/${id}`, "/projects/ignored"])).toBe(
      `/projects/${id}`,
    );
  });

  it.each([
    undefined,
    "",
    "https://evil.example/projects/550e8400-e29b-41d4-a716-446655440000",
    "//evil.example",
    "/dashboard",
    "/projects/not-a-uuid",
    "/projects/550e8400-e29b-41d4-a716-446655440000?next=https://evil.example",
  ])("rejects unsafe return value %s", (value) => {
    expect(parseProjectSignInReturn(value)).toBeNull();
  });
});
```

- [ ] **Step 2: Run the parser test to verify RED**

Run: `pnpm.cmd exec vitest run src/features/auth/sign-in-return.test.ts`

Expected: FAIL because `sign-in-return.ts` does not exist.

- [ ] **Step 3: Implement the strict parser**

```ts
import { parseProjectId } from "@/features/projects/project-input";

export function parseProjectSignInReturn(
  value: string | string[] | undefined,
) {
  const candidate = Array.isArray(value) ? value[0] : value;
  const match = candidate?.match(/^\/projects\/([^/?#]+)$/);
  const untrustedProjectId = match?.[1];
  if (!untrustedProjectId) return null;

  const projectId = parseProjectId(untrustedProjectId);
  return projectId.success ? `/projects/${projectId.data}` : null;
}
```

- [ ] **Step 4: Run the parser test to verify GREEN**

Run: `pnpm.cmd exec vitest run src/features/auth/sign-in-return.test.ts`

Expected: PASS.

- [ ] **Step 5: Write the failing sign-in page test**

Mock Clerk's `SignIn`, call the async page with resolved search params, and assert:

```ts
expect(signInPropsMock).toHaveBeenLastCalledWith({
  fallbackRedirectUrl: "/projects/550e8400-e29b-41d4-a716-446655440000",
  forceRedirectUrl: "/projects/550e8400-e29b-41d4-a716-446655440000",
});
expect(signInPropsMock).toHaveBeenLastCalledWith({
  fallbackRedirectUrl: "/onboarding",
});
```

The first assertion follows a safe project `returnTo`; the second follows an
unsafe external `returnTo` and must not include `forceRedirectUrl`.

- [ ] **Step 6: Run the sign-in page test to verify RED**

Run: `pnpm.cmd exec vitest run "src/app/sign-in/[[...sign-in]]/page.test.tsx"`

Expected: FAIL because the current page ignores `searchParams`.

- [ ] **Step 7: Implement the async, allowlisted redirect**

```tsx
type SignInPageProps = {
  searchParams: Promise<{ returnTo?: string | string[] }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const returnTo = parseProjectSignInReturn((await searchParams).returnTo);
  const redirectProps = returnTo
    ? { fallbackRedirectUrl: returnTo, forceRedirectUrl: returnTo }
    : { fallbackRedirectUrl: "/onboarding" };

  return <main id="main-content" className="flex flex-1 items-center justify-center px-6 py-16"><SignIn {...redirectProps} /></main>;
}
```

- [ ] **Step 8: Run both Task 1 tests**

Run: `pnpm.cmd exec vitest run src/features/auth/sign-in-return.test.ts "src/app/sign-in/[[...sign-in]]/page.test.tsx"`

Expected: PASS. Record the test output as the Task 1 checkpoint.

---

### Task 2: Server-only engagement reads and mutations

**Files:**
- Create: `src/features/projects/project-engagement.ts`
- Create: `src/features/projects/project-engagement.test.ts`

**Interfaces:**
- Consumes: `auth()` from `@clerk/nextjs/server`, `createServerSupabaseClient()`, and `parseProjectId()`.
- Produces:

```ts
export type ProjectEngagementState = {
  isOwner: boolean;
  isSignedIn: boolean;
  liked: boolean;
  saved: boolean;
};

export async function getProjectEngagement(
  projectId: string,
  ownerId: string,
): Promise<ProjectEngagementState>;

export async function setCurrentProjectLiked(
  projectId: string,
  liked: boolean,
): Promise<{ likeCount: number; liked: boolean }>;

export async function setCurrentProjectSaved(
  projectId: string,
  saved: boolean,
): Promise<{ saved: boolean }>;
```

- [ ] **Step 1: Write failing state-read tests**

Use a chainable Supabase provider mock and cover these exact outcomes:

```ts
await expect(getProjectEngagement(projectId, ownerId)).resolves.toEqual({
  isOwner: false,
  isSignedIn: false,
  liked: false,
  saved: false,
});

await expect(getProjectEngagement(projectId, ownerId)).resolves.toEqual({
  isOwner: true,
  isSignedIn: true,
  liked: false,
  saved: false,
});

await expect(getProjectEngagement(projectId, ownerId)).resolves.toEqual({
  isOwner: false,
  isSignedIn: true,
  liked: true,
  saved: true,
});
```

Assert the signed-out and owner cases do not construct a Supabase client. For
the eligible case, assert queries filter both tables by `project_id` and the
current viewer ID; RLS remains the final filter.

- [ ] **Step 2: Run state-read tests to verify RED**

Run: `pnpm.cmd exec vitest run src/features/projects/project-engagement.test.ts`

Expected: FAIL because the engagement module does not exist.

- [ ] **Step 3: Implement state reads and safe error mapping**

```ts
const emptySignedOutState: ProjectEngagementState = {
  isOwner: false,
  isSignedIn: false,
  liked: false,
  saved: false,
};

export async function getProjectEngagement(projectId: string, ownerId: string) {
  const normalizedProjectId = requireProjectId(projectId);
  const { userId } = await auth();
  if (!userId) return emptySignedOutState;
  if (userId === ownerId) {
    return { ...emptySignedOutState, isOwner: true, isSignedIn: true };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const [likeResult, saveResult] = await Promise.all([
      supabase.from("project_likes").select("project_id").eq("project_id", normalizedProjectId).eq("user_id", userId).maybeSingle(),
      supabase.from("project_saves").select("project_id").eq("project_id", normalizedProjectId).eq("user_id", userId).maybeSingle(),
    ]);
    if (likeResult.error) throw likeResult.error;
    if (saveResult.error) throw saveResult.error;
    return {
      isOwner: false,
      isSignedIn: true,
      liked: Boolean(likeResult.data),
      saved: Boolean(saveResult.data),
    };
  } catch (error) {
    throw new Error("Unable to load project interactions.", { cause: error });
  }
}
```

`requireProjectId` must call `parseProjectId` and throw `Invalid project ID.`
before `auth()` when parsing fails.

- [ ] **Step 4: Run state-read tests to verify GREEN**

Run: `pnpm.cmd exec vitest run src/features/projects/project-engagement.test.ts`

Expected: state-read tests PASS.

- [ ] **Step 5: Add failing mutation tests**

Cover the exact database operations:

```ts
await setCurrentProjectLiked(projectId, true);
expect(insertMock).toHaveBeenCalledWith({ project_id: projectId });

await setCurrentProjectLiked(projectId, false);
expect(deleteEqCalls).toEqual([
  ["project_id", projectId],
  ["user_id", viewerId],
]);

await setCurrentProjectSaved(projectId, true);
expect(saveInsertMock).toHaveBeenCalledWith({ project_id: projectId });

await setCurrentProjectSaved(projectId, false);
expect(saveDeleteEqCalls).toEqual([
  ["project_id", projectId],
  ["user_id", viewerId],
]);
```

Also assert a like insert error with `code: "23505"` is treated as an
idempotent success, other errors are masked, and the returned like count comes
from a post-mutation `projects.like_count` read for the same published project.

- [ ] **Step 6: Run mutation tests to verify RED**

Run: `pnpm.cmd exec vitest run src/features/projects/project-engagement.test.ts`

Expected: FAIL because mutation exports are absent.

- [ ] **Step 7: Implement explicit idempotent mutations**

```ts
function isUniqueViolation(error: { code?: string } | null) {
  return error?.code === "23505";
}

export async function setCurrentProjectLiked(projectId: string, liked: boolean) {
  const normalizedProjectId = requireProjectId(projectId);
  const { userId } = await requireProfile();
  try {
    const supabase = await createServerSupabaseClient();
    if (liked) {
      const { error } = await supabase
        .from("project_likes")
        .insert({ project_id: normalizedProjectId });
      if (error && !isUniqueViolation(error)) throw error;
    } else {
      const { error } = await supabase
        .from("project_likes")
        .delete()
        .eq("project_id", normalizedProjectId)
        .eq("user_id", userId);
      if (error) throw error;
    }

    const { data, error } = await supabase
      .from("projects")
      .select("like_count")
      .eq("id", normalizedProjectId)
      .eq("status", "published")
      .maybeSingle();
    if (error || !data) throw error ?? new Error("Project unavailable.");
    return { likeCount: data.like_count, liked };
  } catch (error) {
    throw new Error("Unable to update this project interaction.", { cause: error });
  }
}
```

Implement `setCurrentProjectSaved` with the same validation/profile/client
sequence and `project_saves`; return `{ saved }`. Treat `23505` as success only
for an activation request. Do not query or expose other users' rows.

- [ ] **Step 8: Run all engagement boundary tests**

Run: `pnpm.cmd exec vitest run src/features/projects/project-engagement.test.ts`

Expected: PASS. Record output as the Task 2 checkpoint.

---

### Task 3: Engagement server actions and cache invalidation

**Files:**
- Create: `src/features/projects/project-engagement-actions.ts`
- Create: `src/features/projects/project-engagement-actions.test.ts`

**Interfaces:**
- Consumes: the Task 2 mutation functions and `parseProjectId()`.
- Produces:

```ts
export type LikeActionResult =
  | { likeCount: number; liked: boolean; status: "success" }
  | { message: string; status: "error" };

export type SaveActionResult =
  | { saved: boolean; status: "success" }
  | { message: string; status: "error" };

export async function setProjectLikedAction(
  projectId: string,
  liked: boolean,
): Promise<LikeActionResult>;

export async function setProjectSavedAction(
  projectId: string,
  saved: boolean,
): Promise<SaveActionResult>;
```

- [ ] **Step 1: Write failing action tests**

Mock the data boundary, `revalidatePath`, and `unstable_rethrow`. Assert invalid
IDs and non-boolean desired states return before mutation, successful results
map exactly, failures expose no provider message, and success calls these paths
in this order:

```ts
const expectedPaths = [
  "/",
  "/projects",
  `/projects/${projectId}`,
  "/dashboard/saved",
];
expect(revalidatePathMock.mock.calls).toEqual(
  expectedPaths.map((path) => [path]),
);
```

Expected safe messages:

```ts
"We couldn't update this project's like. Please try again."
"We couldn't update this project's saved state. Please try again."
```

- [ ] **Step 2: Run action tests to verify RED**

Run: `pnpm.cmd exec vitest run src/features/projects/project-engagement-actions.test.ts`

Expected: FAIL because the action module does not exist.

- [ ] **Step 3: Implement actions**

```ts
"use server";
import "server-only";

function revalidateEngagementPaths(projectId: string) {
  revalidatePath("/");
  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/dashboard/saved");
}

export async function setProjectLikedAction(projectId: string, liked: boolean) {
  const parsed = parseProjectId(projectId);
  if (!parsed.success || typeof liked !== "boolean") {
    return { message: "We couldn't update this project's like. Please try again.", status: "error" } as const;
  }
  try {
    const result = await setCurrentProjectLiked(parsed.data, liked);
    revalidateEngagementPaths(parsed.data);
    return { ...result, status: "success" } as const;
  } catch (error) {
    unstable_rethrow(error);
    return { message: "We couldn't update this project's like. Please try again.", status: "error" } as const;
  }
}
```

Implement `setProjectSavedAction` symmetrically with
`setCurrentProjectSaved`, including the runtime boolean check. Do not revalidate
on validation or provider failure.

- [ ] **Step 4: Run action tests to verify GREEN**

Run: `pnpm.cmd exec vitest run src/features/projects/project-engagement-actions.test.ts`

Expected: PASS. Record output as the Task 3 checkpoint.

---

### Task 4: Optimistic project interaction controls

**Files:**
- Create: `src/features/projects/project-engagement-controls.tsx`
- Create: `src/features/projects/project-engagement-controls.test.tsx`

**Interfaces:**
- Consumes: Task 3 actions.
- Produces:

```ts
type ProjectEngagementControlsProps = {
  initialLikeCount: number;
  initialLiked: boolean;
  initialSaved: boolean;
  isOwner: boolean;
  isSignedIn: boolean;
  projectId: string;
};

export function ProjectEngagementControls(
  props: ProjectEngagementControlsProps,
): React.ReactNode;
```

- [ ] **Step 1: Write failing rendering and interaction tests**

Mock both server actions. Assert:

```tsx
render(<ProjectEngagementControls {...eligibleProps} />);
expect(screen.getByRole("button", { name: "Like project" })).toHaveAttribute("aria-pressed", "false");
expect(screen.getByRole("button", { name: "Save project" })).toHaveAttribute("aria-pressed", "false");
expect(screen.getByText("4 likes")).toBeInTheDocument();
```

After clicking Like, assert the immediate UI is `Liked` and `5 likes`, then
resolve the mocked action with `{ status: "success", liked: true,
likeCount: 5 }`. Add matching Save/Unsave assertions.

Reject Like with `{ status: "error", message: "Safe failure." }` and assert
state/count roll back to `false`/`4 likes`, the message is visible in a
`role="status"` region, and the provider mock's private details are absent.

Render signed-out props and assert a link to:

```text
/sign-in?returnTo=%2Fprojects%2F550e8400-e29b-41d4-a716-446655440000
```

Render owner props and assert `This is your project` while no Like/Save buttons
exist.

- [ ] **Step 2: Run component tests to verify RED**

Run: `pnpm.cmd exec vitest run src/features/projects/project-engagement-controls.test.tsx`

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement signed-out and owner states**

```tsx
if (!isSignedIn) {
  const returnTo = `/projects/${projectId}`;
  return <Link href={`/sign-in?returnTo=${encodeURIComponent(returnTo)}`}>Sign in to like or save</Link>;
}

if (isOwner) {
  return <p>This is your project</p>;
}
```

Use the established DevHub border/background/focus palette in the final JSX.

- [ ] **Step 4: Implement optimistic eligible-user controls**

```tsx
"use client";

const [liked, setLiked] = useState(initialLiked);
const [saved, setSaved] = useState(initialSaved);
const [likeCount, setLikeCount] = useState(initialLikeCount);
const [message, setMessage] = useState("");
const [likePending, startLikeTransition] = useTransition();
const [savePending, startSaveTransition] = useTransition();

function updateLike() {
  const previousLiked = liked;
  const previousCount = likeCount;
  const requestedLiked = !liked;
  setLiked(requestedLiked);
  setLikeCount(Math.max(0, likeCount + (requestedLiked ? 1 : -1)));
  setMessage("");
  startLikeTransition(async () => {
    const result = await setProjectLikedAction(projectId, requestedLiked);
    if (result.status === "success") {
      setLiked(result.liked);
      setLikeCount(result.likeCount);
    } else {
      setLiked(previousLiked);
      setLikeCount(previousCount);
      setMessage(result.message);
    }
  });
}
```

Implement Save with the same capture/request/confirm-or-rollback pattern.
Buttons use fixed accessible names `Like project` and `Save project`, visible
labels `Like`/`Liked` and `Save`/`Saved`, `aria-pressed`, and per-action disabled
pending state. Render `<p aria-live="polite" role="status">` only when a safe
message exists.

- [ ] **Step 5: Run component tests to verify GREEN**

Run: `pnpm.cmd exec vitest run src/features/projects/project-engagement-controls.test.tsx`

Expected: PASS. Record output as the Task 4 checkpoint.

---

### Task 5: Wire engagement into public project detail

**Files:**
- Modify: `src/features/projects/public-project.ts`
- Modify: `src/features/projects/public-project.test.ts`
- Modify: `src/features/projects/public-project-view.tsx`
- Modify: `src/features/projects/public-project-view.test.tsx`
- Modify: `src/app/projects/[id]/page.tsx`
- Modify: `src/app/projects/[id]/page.test.tsx`

**Interfaces:**
- Consumes: `getProjectEngagement()` and `ProjectEngagementControls` from Tasks
  2 and 4.
- Changes `PublicProject` to include server-only `owner_id: string` and public
  `like_count: number`.
- Changes `ResolvedPublicProject` to omit `owner_id` and retain `like_count`.
- Changes `PublicProjectView` props to include
  `engagement: ProjectEngagementState`.

- [ ] **Step 1: Extend the failing public-project data tests**

Require the projects select to include `like_count` and require the returned
server object to include:

```ts
expect(result).toEqual(expect.objectContaining({
  like_count: 99,
  owner_id: "user_clerk_123",
}));
```

The owner profile object itself must still omit `user_id`.

- [ ] **Step 2: Run data test to verify RED**

Run: `pnpm.cmd exec vitest run src/features/projects/public-project.test.ts`

Expected: FAIL because those fields are not selected/returned.

- [ ] **Step 3: Add public aggregate and server-only owner ID**

Add `"like_count"` to the `PublicProject` pick, add `owner_id: string` to its
intersection, select `like_count`, and return both `like_count` and
`owner_id: project.owner_id`. Do not add an ID to `PublicProjectOwner`.

- [ ] **Step 4: Add failing view tests for control placement**

Render `PublicProjectView` with eligible engagement and assert Like/Save controls
appear in the sidebar before the external links. Render owner and signed-out
engagement variants and assert their respective text/link. Continue asserting
raw owner IDs and Storage paths do not appear in rendered text.

- [ ] **Step 5: Run view test to verify RED**

Run: `pnpm.cmd exec vitest run src/features/projects/public-project-view.test.tsx`

Expected: FAIL because `engagement` is not accepted and controls are absent.

- [ ] **Step 6: Add controls to the public sidebar**

Update the resolved type and render:

```tsx
<div className="mt-6 border-t border-[#ded3c7] pt-6">
  <ProjectEngagementControls
    initialLikeCount={project.like_count}
    initialLiked={engagement.liked}
    initialSaved={engagement.saved}
    isOwner={engagement.isOwner}
    isSignedIn={engagement.isSignedIn}
    projectId={project.id}
  />
</div>
```

Place this block after technologies and before demo/repository links.

- [ ] **Step 7: Add failing page-wiring assertions**

Mock `getProjectEngagement`. Require it to receive the project ID and server-only
owner ID. Inspect the captured visual props and assert:

```ts
expect(getProjectEngagementMock).toHaveBeenCalledWith(projectId, project.owner_id);
expect(visualProject).not.toHaveProperty("owner_id");
expect(JSON.stringify(visualProject)).not.toContain(project.owner_id);
expect(publicProjectViewPropsMock).toHaveBeenCalledWith({
  engagement,
  project: expect.objectContaining({ like_count: 99 }),
});
```

- [ ] **Step 8: Run page test to verify RED**

Run: `pnpm.cmd exec vitest run "src/app/projects/[id]/page.test.tsx"`

Expected: FAIL because engagement is not loaded and `owner_id` is not stripped.

- [ ] **Step 9: Resolve engagement and strip sensitive server fields**

```tsx
const { owner_id: ownerId, ...publicProject } = project;
const [engagement, avatarUrl, images] = await Promise.all([
  getProjectEngagement(project.id, ownerId),
  getAvatarPublicUrl(project.owner.avatar_path),
  Promise.all(project.images.map(async ({ storage_path, ...image }) => ({
    ...image,
    publicUrl: await getProjectImagePublicUrl(storage_path),
  }))),
]);

const resolvedProject: ResolvedPublicProject = {
  ...publicProject,
  images,
  owner: {
    avatarUrl,
    display_name: project.owner.display_name,
    headline: project.owner.headline,
    username: project.owner.username,
  },
};

return <PublicProjectView engagement={engagement} project={resolvedProject} />;
```

- [ ] **Step 10: Run all public-detail tests**

Run: `pnpm.cmd exec vitest run src/features/projects/public-project.test.ts src/features/projects/public-project-view.test.tsx "src/app/projects/[id]/page.test.tsx"`

Expected: PASS. Record output as the Task 5 checkpoint.

---

### Task 6: Load and hydrate the current user's saved projects

**Files:**
- Modify: `src/features/projects/project-discovery.ts`
- Modify: `src/features/projects/project-discovery.test.ts`
- Modify: `src/features/projects/project-discovery-card-data.ts`
- Modify: `src/features/projects/project-discovery-card-data.test.ts`

**Interfaces:**
- Consumes: `requireProfile()`, `createServerSupabaseClient()`, existing
  `DiscoverableProject`, and `resolveDiscoverableProjects()`.
- Produces:

```ts
export async function getCurrentSavedProjects(): Promise<DiscoverableProject[]>;
```

- [ ] **Step 1: Write failing saved-project query tests**

Mock `requireProfile` with the current viewer and the authenticated Supabase
client. Assert `project_saves` is filtered to that user and ordered newest first:

```ts
expect(saveCalls).toContainEqual(["eq", "user_id", viewerId]);
expect(saveCalls).toContainEqual([
  "order",
  "created_at",
  { ascending: false },
]);
```

Return save rows in `[secondProjectId, firstProjectId]` order while the projects
provider returns `[firstProject, secondProject]`; assert output order remains
`[secondProjectId, firstProjectId]`. Require `.eq("status", "published")`,
public owner filtering during hydration, and no project query for an empty save
list. Provider failures must become `Unable to load saved projects.`.

- [ ] **Step 2: Run discovery tests to verify RED**

Run: `pnpm.cmd exec vitest run src/features/projects/project-discovery.test.ts`

Expected: FAIL because `getCurrentSavedProjects` does not exist.

- [ ] **Step 3: Generalize the internal hydration client type**

Import `SupabaseClient` from `@supabase/supabase-js`, define:

```ts
type DatabaseClient = SupabaseClient<Database>;
```

Use `DatabaseClient` for `loadProjectRows` and `assembleProjects` so both the
anonymous discovery client and authenticated saved-project client can reuse the
same public hydration without widening data shapes.

- [ ] **Step 4: Implement ordered saved-project loading**

```ts
export async function getCurrentSavedProjects() {
  try {
    const { userId } = await requireProfile();
    const supabase = await createServerSupabaseClient();
    const { data: saves, error: saveError } = await supabase
      .from("project_saves")
      .select("project_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (saveError) throw saveError;
    if (!saves?.length) return [];

    const ids = saves.map((save) => save.project_id);
    const { data, error } = await supabase
      .from("projects")
      .select(projectSelection)
      .eq("status", "published")
      .in("id", ids);
    if (error) throw error;

    const rowById = new Map(
      ((data ?? []) as DiscoveryProjectRow[]).map((row) => [row.id, row]),
    );
    const orderedRows = ids.flatMap((id) => {
      const row = rowById.get(id);
      return row ? [row] : [];
    });
    return await assembleProjects(supabase, orderedRows);
  } catch (error) {
    throw new Error("Unable to load saved projects.", { cause: error });
  }
}
```

- [ ] **Step 5: Run discovery tests to verify GREEN**

Run: `pnpm.cmd exec vitest run src/features/projects/project-discovery.test.ts`

Expected: PASS.

- [ ] **Step 6: Add a media-resolution ordering regression test**

Pass two discoverable projects into `resolveDiscoverableProjects`, mock their
different avatar/cover URLs, and assert the resolved array remains in input
order while neither result contains `avatar_path` or `storage_path`.

- [ ] **Step 7: Run both discovery boundaries**

Run: `pnpm.cmd exec vitest run src/features/projects/project-discovery.test.ts src/features/projects/project-discovery-card-data.test.ts`

Expected: PASS. Record output as the Task 6 checkpoint.

---

### Task 7: Saved projects dashboard navigation and page

**Files:**
- Modify: `src/features/profile/dashboard-navigation.tsx`
- Modify: `src/features/profile/dashboard-navigation.test.tsx`
- Create: `src/features/projects/saved-projects-view.tsx`
- Create: `src/features/projects/saved-projects-view.test.tsx`
- Create: `src/app/dashboard/saved/page.tsx`
- Create: `src/app/dashboard/saved/page.test.tsx`

**Interfaces:**
- Consumes: `getCurrentSavedProjects()`, `resolveDiscoverableProjects()`,
  `requireProfile()`, `getAvatarPublicUrl()`, `DashboardNavigation`, and
  `PublicProjectCard`.
- Extends dashboard navigation `active` to
  `"overview" | "profile" | "projects" | "saved"`.
- Produces `SavedProjectsView` with resolved projects and navigation profile.

- [ ] **Step 1: Write the failing dashboard-navigation test**

Render with `active="saved"` and require:

```ts
expect(screen.getByRole("link", { name: "Saved projects" })).toHaveAttribute(
  "href",
  "/dashboard/saved",
);
expect(screen.getByRole("link", { name: "Saved projects" })).toHaveAttribute(
  "aria-current",
  "page",
);
```

- [ ] **Step 2: Run navigation test to verify RED**

Run: `pnpm.cmd exec vitest run src/features/profile/dashboard-navigation.test.tsx`

Expected: FAIL because the active union and link do not exist.

- [ ] **Step 3: Add Saved projects navigation**

Import `BookmarkIcon`, extend the active union, and add after Projects:

```tsx
<Link
  aria-current={active === "saved" ? "page" : undefined}
  className={itemClassName("saved")}
  href="/dashboard/saved"
>
  <BookmarkIcon className="size-4" />
  Saved projects
</Link>
```

- [ ] **Step 4: Run navigation test to verify GREEN**

Run: `pnpm.cmd exec vitest run src/features/profile/dashboard-navigation.test.tsx`

Expected: PASS.

- [ ] **Step 5: Write failing SavedProjectsView tests**

Render one resolved project and assert the `Saved projects` heading, active
dashboard navigation, and the shared `View TaskFlow` card link. Render an empty
array and assert:

```ts
expect(screen.getByText("No saved projects yet.")).toBeInTheDocument();
expect(screen.getByRole("link", { name: "Explore projects" })).toHaveAttribute(
  "href",
  "/projects",
);
```

- [ ] **Step 6: Run view tests to verify RED**

Run: `pnpm.cmd exec vitest run src/features/projects/saved-projects-view.test.tsx`

Expected: FAIL because the view does not exist.

- [ ] **Step 7: Implement the saved-project view**

Use the same responsive dashboard layout as `/dashboard/projects`: sticky
`DashboardNavigation active="saved"` on the left, a `Saved projects` header on
the right, then either:

```tsx
<div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
  {projects.map((project) => (
    <PublicProjectCard key={project.id} project={project} />
  ))}
</div>
```

or this exact empty-state content:

```tsx
<section aria-labelledby="saved-empty-title">
  <h2 id="saved-empty-title">No saved projects yet.</h2>
  <p>Save useful community projects and they will appear here.</p>
  <Link href="/projects">Explore projects</Link>
</section>
```

Apply existing dashboard panel colors, rounded borders, focus outlines, and
mobile-first spacing to the final markup.

- [ ] **Step 8: Run view tests to verify GREEN**

Run: `pnpm.cmd exec vitest run src/features/projects/saved-projects-view.test.tsx`

Expected: PASS.

- [ ] **Step 9: Write the failing protected-page test**

Mock profile, avatar, saved query, resolver, and view capture. Assert concurrent
inputs resolve to client-safe props:

```ts
expect(requireProfileMock).toHaveBeenCalledOnce();
expect(getCurrentSavedProjectsMock).toHaveBeenCalledOnce();
expect(resolveDiscoverableProjectsMock).toHaveBeenCalledWith(rawProjects);
expect(savedProjectsViewPropsMock).toHaveBeenCalledWith({
  profile: {
    avatarUrl,
    displayName: profile.display_name,
    isPublic: profile.is_public,
    username: profile.username,
  },
  projects: resolvedProjects,
});
expect(JSON.stringify(savedProjectsViewPropsMock.mock.calls[0]?.[0])).not.toContain(
  profile.user_id,
);
```

- [ ] **Step 10: Run page test to verify RED**

Run: `pnpm.cmd exec vitest run src/app/dashboard/saved/page.test.tsx`

Expected: FAIL because the route does not exist.

- [ ] **Step 11: Implement the protected page**

```tsx
export default async function SavedProjectsPage() {
  const { profile } = await requireProfile();
  const rawProjectsPromise = getCurrentSavedProjects();
  const avatarUrlPromise = getAvatarPublicUrl(profile.avatar_path);
  const [avatarUrl, rawProjects] = await Promise.all([
    avatarUrlPromise,
    rawProjectsPromise,
  ]);
  const projects = await resolveDiscoverableProjects(rawProjects);

  return (
    <SavedProjectsView
      profile={{
        avatarUrl,
        displayName: profile.display_name,
        isPublic: profile.is_public,
        username: profile.username,
      }}
      projects={projects}
    />
  );
}
```

- [ ] **Step 12: Run all Task 7 tests**

Run: `pnpm.cmd exec vitest run src/features/profile/dashboard-navigation.test.tsx src/features/projects/saved-projects-view.test.tsx src/app/dashboard/saved/page.test.tsx`

Expected: PASS. Record output as the Task 7 checkpoint.

---

### Task 8: Cross-feature regression and production verification

**Files:**
- Modify only if a verification failure identifies a defect in a file already
  listed in Tasks 1-7.

**Interfaces:**
- Consumes: all prior task outputs.
- Produces: a verified production build and a running local server.

- [ ] **Step 1: Run the complete engagement-focused suite**

Run:

```powershell
pnpm.cmd exec vitest run src/features/auth/sign-in-return.test.ts "src/app/sign-in/[[...sign-in]]/page.test.tsx" src/features/projects/project-engagement.test.ts src/features/projects/project-engagement-actions.test.ts src/features/projects/project-engagement-controls.test.tsx src/features/projects/public-project.test.ts src/features/projects/public-project-view.test.tsx "src/app/projects/[id]/page.test.tsx" src/features/projects/project-discovery.test.ts src/features/projects/project-discovery-card-data.test.ts src/features/profile/dashboard-navigation.test.tsx src/features/projects/saved-projects-view.test.tsx src/app/dashboard/saved/page.test.tsx
```

Expected: every listed test passes with zero failures.

- [ ] **Step 2: Run static quality gates**

Run in parallel where resources allow:

```powershell
pnpm.cmd lint
pnpm.cmd typecheck
```

Expected: both exit 0 with no ESLint or TypeScript errors.

- [ ] **Step 3: Run the complete test suite**

Run: `pnpm.cmd test`

Expected: all existing and new test files pass with zero failures. The pre-phase
baseline was 57 files and 386 tests, so final totals must be greater than or
equal to both values.

- [ ] **Step 4: Stop only the verified DevHub production listener**

Resolve the port-3000 listener with `Get-NetTCPConnection`, inspect its
`Win32_Process.CommandLine`, and call `Stop-Process -Id <verified PID>` only when
the command line is the `D:\DevHub` Next production server started for this
workspace. If no verified listener exists, skip stopping a process.

- [ ] **Step 5: Build and restart production**

Run:

```powershell
pnpm.cmd build
pnpm.cmd exec next start --hostname localhost
```

Keep the second command in a persistent exec session. Expected build output
lists `/projects`, `/projects/[id]`, and `/dashboard/saved`, and the server
reports Ready on `http://localhost:3000`.

- [ ] **Step 6: Probe public routes without authentication**

Use `Invoke-WebRequest -UseBasicParsing -TimeoutSec 30` and require HTTP 200 for:

```text
http://localhost:3000/
http://localhost:3000/projects
http://localhost:3000/projects?sort=popular
http://localhost:3000/projects/550e8400-e29b-41d4-a716-446655440000
```

The fixed UUID probe may return 404 when that fixture does not exist; in that
case probe the public project ID emitted by the live `/projects` response or
confirm the current known published project manually. Never use a private ID.

- [ ] **Step 7: Verify the protected route boundary**

Probe `http://localhost:3000/dashboard/saved` without a browser session and
require a Clerk redirect rather than private page content. Then leave the fresh
production server running for user verification.

- [ ] **Step 8: Apply the completion gate**

Invoke `superpowers:verification-before-completion`, read the fresh command
outputs, and report exact lint/typecheck/build/test/route evidence. Then invoke
`superpowers:finishing-a-development-branch`; because this workspace has no Git
metadata, report that no merge, PR, commit, or worktree cleanup is applicable.
