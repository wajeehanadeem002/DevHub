# DevHub Public Project Discovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a public `/projects` discovery experience backed by live published Supabase data, and replace the landing page's static trending cards with live projects.

**Architecture:** React Server Component routes parse URL search parameters and call a focused server-only discovery module. The module explicitly filters published projects, applies indexed search and taxonomy filters, returns one deterministic page plus bulk-loaded card relations, and leaves rendering to shared project-card and discovery-view components.

**Tech Stack:** Next.js 16.3.4 App Router, React 19.2.8 Server Components, TypeScript 5, Supabase JS 2.116.0, Clerk 7.9.2, Tailwind CSS 4, Vitest 5, Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-15-project-discovery-design.md`

## Global Constraints

- Read `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md`, `node_modules/next/dist/docs/01-app/03-api-reference/02-components/link.md`, and `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/revalidatePath.md` completely before changing Next.js route, link, or cache code.
- Use a server-only anonymous Supabase client created with the publishable key
  and no Clerk access token; never add a service-role client.
- Every public project query must explicitly include `status = 'published'`, even though RLS also filters rows.
- Search text is trimmed and limited to 100 characters; page size is exactly 12.
- Supported URL parameters are only `q`, `category`, `technology`, `sort`, and `page`.
- Sort modes are `newest` and `popular`; missing or invalid sort values normalize to `newest`.
- Do not add a database migration or dependency in this phase.
- Preserve the Mocha + Cream system, visible focus, semantic HTML, reduced motion, and responsive layouts without horizontal overflow.
- Like and save controls remain non-interactive in this phase.
- The workspace has no `.git` directory, so each task ends with a review checkpoint rather than a commit.
- Follow strict red-green TDD: add one behavior test, observe its expected failure, add the minimal implementation, then rerun the focused test.

---

### Task 1: Discovery parameter and URL contract

**Files:**
- Create: `src/features/projects/project-discovery-input.ts`
- Create: `src/features/projects/project-discovery-input.test.ts`

**Interfaces:**
- Consumes: Next.js page search parameters shaped as `Record<string, string | string[] | undefined>`.
- Produces: `PROJECT_DISCOVERY_PAGE_SIZE`, `ProjectDiscoveryFilters`, `ProjectDiscoverySearchParams`, `parseProjectDiscoveryFilters(raw)`, and `buildProjectDiscoveryHref(filters, changes)`.

- [ ] **Step 1: Write failing parser tests**

Add literal expectations for whitespace trimming, the 100-character limit,
first-value handling, slug syntax, sort fallback, positive integer pages, and
canonical links:

```ts
import { describe, expect, it } from "vitest";

import {
  buildProjectDiscoveryHref,
  parseProjectDiscoveryFilters,
} from "./project-discovery-input";

describe("parseProjectDiscoveryFilters", () => {
  it("normalizes the supported public discovery parameters", () => {
    expect(
      parseProjectDiscoveryFilters({
        category: "developer-tools",
        page: "3",
        q: "  code review  ",
        sort: "popular",
        technology: "next-js",
      }),
    ).toEqual({
      category: "developer-tools",
      page: 3,
      q: "code review",
      sort: "popular",
      technology: "next-js",
    });
  });

  it("falls back safely for malformed values", () => {
    expect(
      parseProjectDiscoveryFilters({
        category: "Not A Slug",
        page: "-4",
        q: "x".repeat(110),
        sort: "oldest",
        technology: ["react", "next-js"],
      }),
    ).toEqual({
      category: null,
      page: 1,
      q: "x".repeat(100),
      sort: "newest",
      technology: "react",
    });
  });
});

describe("buildProjectDiscoveryHref", () => {
  it("preserves active filters, applies changes, and omits defaults", () => {
    expect(
      buildProjectDiscoveryHref(
        {
          category: "developer-tools",
          page: 4,
          q: "code review",
          sort: "popular",
          technology: "react",
        },
        { page: 2 },
      ),
    ).toBe(
      "/projects?q=code+review&category=developer-tools&technology=react&sort=popular&page=2",
    );
  });
});
```

- [ ] **Step 2: Run the new test and verify RED**

Run:

```powershell
pnpm.cmd exec vitest run src/features/projects/project-discovery-input.test.ts
```

Expected: FAIL because `project-discovery-input.ts` does not exist.

- [ ] **Step 3: Implement the normalized contract**

Use these exact public types and constants:

```ts
export const PROJECT_DISCOVERY_PAGE_SIZE = 12;

export type ProjectDiscoverySort = "newest" | "popular";
export type ProjectDiscoverySearchParams = Record<
  string,
  string | string[] | undefined
>;

export type ProjectDiscoveryFilters = {
  category: string | null;
  page: number;
  q: string;
  sort: ProjectDiscoverySort;
  technology: string | null;
};
```

`parseProjectDiscoveryFilters` must select the first array value, trim `q`,
slice it to 100 characters, accept slugs only when they match
`^[a-z0-9]+(?:-[a-z0-9]+)*$`, accept `popular` explicitly, and otherwise use
the defaults in the test. `buildProjectDiscoveryHref` must use
`URLSearchParams`, emit keys in `q`, `category`, `technology`, `sort`, `page`
order, and omit empty values, `newest`, and page 1.

- [ ] **Step 4: Rerun the focused test and verify GREEN**

Run the Step 2 command. Expected: all tests in the file PASS.

- [ ] **Step 5: Review checkpoint**

Read both files and verify the parser contains no provider calls and the URL
builder contains no browser-only APIs.

---

### Task 2: Indexed public discovery data boundary

**Files:**
- Create: `src/features/projects/project-discovery.ts`
- Create: `src/features/projects/project-discovery.test.ts`
- Modify: `src/lib/supabase/server.ts`
- Modify: `src/lib/supabase/server.test.ts`
- Read: `src/features/projects/public-project.ts`
- Read: `src/features/projects/public-project.test.ts`

**Interfaces:**
- Consumes: `ProjectDiscoveryFilters` and `PROJECT_DISCOVERY_PAGE_SIZE` from Task 1; `ProjectCategory`, `ProjectImage`, and `ProjectTechnology` from `project-data.ts`; `PublicProjectOwner` from `public-project.ts`; `createServerSupabasePublicClient()` from the shared server client module.
- Produces: `DiscoverableProject`, `ProjectDiscoveryResult`, `getProjectDiscovery(filters)`, and `getTrendingProjects(limit)`.

Use these exact result contracts:

```ts
export type DiscoverableProject = {
  category: ProjectCategory | null;
  coverImage: ProjectImage | null;
  id: string;
  like_count: number;
  owner: PublicProjectOwner;
  published_at: string | null;
  summary: string;
  technologies: ProjectTechnology[];
  title: string;
};

export type ProjectDiscoveryResult = {
  categories: ProjectCategory[];
  filters: ProjectDiscoveryFilters;
  pageCount: number;
  projects: DiscoverableProject[];
  technologies: ProjectTechnology[];
  totalCount: number;
};
```

- [ ] **Step 1: Write the failing anonymous-client test**

Extend `server.test.ts` and import `createServerSupabasePublicClient`. Add a
`beforeEach` that calls `authMock.mockReset()` and
`createClientMock.mockClear()` so the shared client return implementation is
preserved, then assert:

```ts
const client = createServerSupabasePublicClient({
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
});

expect(client).toEqual({ client: "supabase" });
expect(authMock).not.toHaveBeenCalled();
expect(createClientMock).toHaveBeenCalledWith(
  "https://example.supabase.co",
  "sb_publishable_example",
);
```

- [ ] **Step 2: Run the server-client test and verify RED**

Run:

```powershell
pnpm.cmd exec vitest run src/lib/supabase/server.test.ts
```

Expected: FAIL because `createServerSupabasePublicClient` is not exported.

- [ ] **Step 3: Implement the anonymous server client**

Add this synchronous factory beside the existing authenticated factory:

```ts
export function createServerSupabasePublicClient(
  env: SupabasePublicEnv = getSupabasePublicEnv(),
) {
  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
```

- [ ] **Step 4: Rerun the server-client test and verify GREEN**

Run the Step 2 command. Expected: both authenticated and anonymous client tests
PASS, with the existing Clerk token behavior unchanged.

- [ ] **Step 5: Write failing provider-boundary tests**

Follow the thenable Supabase query-double style in
`public-project.test.ts`. The query double must record `select`, `eq`, `in`,
`textSearch`, `order`, and `range`. Add separate tests proving:

```ts
expect(calls).toContainEqual({
  args: ["status", "published"],
  method: "eq",
  table: "projects",
});
expect(calls).toContainEqual({
  args: ["search_document", "code review", {
    config: "english",
    type: "websearch",
  }],
  method: "textSearch",
  table: "projects",
});
expect(calls).toContainEqual({
  args: [12, 23],
  method: "range",
  table: "projects",
});
```

Mock `createServerSupabasePublicClient` rather than the authenticated factory.
Also assert the category slug resolves to `category_id`, the technology slug
resolves through one `project_technologies` lookup, newest ordering is
`published_at DESC, id ASC`, popular ordering is
`like_count DESC, published_at DESC, id ASC`, unknown taxonomy becomes `null`
in returned filters, an empty technology match short-circuits with zero
projects, and a provider error becomes exactly
`Unable to load project discovery.` without its original message.

Add one fixture with two project owners and assert categories, technologies,
owners, and first covers are assembled from bulk queries in project order.
Assert the query count stays bounded rather than increasing with project count.

Add `getTrendingProjects(4)` coverage that asserts a limit guard of 1 through
12, explicit published status, popular ordering, range `[0, 3]`, and no taxonomy
filter-option queries.

- [ ] **Step 6: Run discovery data tests and verify RED**

Run:

```powershell
pnpm.cmd exec vitest run src/features/projects/project-discovery.test.ts
```

Expected: FAIL because the new module is missing.

- [ ] **Step 7: Implement taxonomy resolution and project selection**

Start the file with `import "server-only"`. Construct one anonymous Supabase
client with `createServerSupabasePublicClient()` and load curated categories
and technologies ordered by `sort_order`. Replace an unrecognized requested
slug with `null` in the returned filters.

Build the projects query from this exact public selection:

```ts
const projectSelection =
  "id, owner_id, title, summary, category_id, published_at, like_count";

let query = supabase
  .from("projects")
  .select(projectSelection, { count: "exact" })
  .eq("status", "published");
```

Apply `.eq("category_id", category.id)`, `.textSearch(...)`, and
`.in("id", matchingProjectIds)` only when their normalized filters are active.
Apply the exact order sequence specified by the tests and then
`.range(offset, offset + PROJECT_DISCOVERY_PAGE_SIZE - 1)`.

- [ ] **Step 8: Implement page normalization and bulk relation assembly**

Compute `pageCount` as `Math.max(1, Math.ceil(totalCount / 12))`. If the
requested positive page is beyond `pageCount` and `totalCount > 0`, repeat only
the project-row query for the last valid range. For the selected IDs, bulk-load:

```ts
profiles: "user_id, username, display_name, headline, avatar_path"
project_technologies: "project_id, technology_id"
project_images: "project_id, id, storage_path, alt_text, width, height, sort_order"
```

Filter owners with `is_public = true` and `deleted_at IS NULL`. Use maps keyed by
owner ID, category ID, project ID, and technology ID. Keep only the first image
encountered after `sort_order ASC`. If an owner row is missing, omit that
project rather than rendering partial private identity data.

All Supabase construction or query errors must pass through:

```ts
throw new Error("Unable to load project discovery.", { cause: error });
```

- [ ] **Step 9: Implement the bounded trending query**

`getTrendingProjects(limit = 4)` validates/clamps the integer limit to 1–12,
queries only published rows, applies popular ordering, and reuses the same bulk
relation assembler. It must not fetch full category/technology option lists;
only fetch taxonomy rows referenced by the selected projects.

- [ ] **Step 10: Rerun focused data tests and verify GREEN**

Run the Step 6 command. Expected: every discovery data test PASS.

- [ ] **Step 11: Run existing public-project tests**

Run:

```powershell
pnpm.cmd exec vitest run src/features/projects/public-project.test.ts
```

Expected: existing detail and developer-profile project queries remain PASS.

- [ ] **Step 12: Review checkpoint**

Verify no query selects `description`, `repository_url`, `demo_url`,
`search_document`, or any profile-private field for discovery cards. Verify the
discovery module never imports or calls Clerk auth.

---

### Task 3: Resolve card assets and extend the shared public card

**Files:**
- Create: `src/features/projects/project-discovery-card-data.ts`
- Create: `src/features/projects/project-discovery-card-data.test.ts`
- Modify: `src/features/projects/public-project-card.tsx`
- Modify: `src/features/projects/public-project-card.test.tsx`

**Interfaces:**
- Consumes: `DiscoverableProject`, `getAvatarPublicUrl`, and `getProjectImagePublicUrl`.
- Produces: `ResolvedDiscoverableProject`, `resolveDiscoverableProjects(projects)`, and optional discovery metadata supported by `PublicProjectCard`.

- [ ] **Step 1: Write the failing asset-resolution test**

Mock only the two public URL helpers and assert storage paths are removed from
the returned view model:

```ts
const result = await resolveDiscoverableProjects([project]);

expect(result[0]).toMatchObject({
  coverImageUrl: "https://cdn.example/cover.webp",
  like_count: 42,
  owner: {
    avatarUrl: "https://cdn.example/avatar.webp",
    display_name: "Alex Morgan",
    username: "alexmorgan",
  },
});
expect(JSON.stringify(result)).not.toContain("storage_path");
expect(JSON.stringify(result)).not.toContain("avatar_path");
```

- [ ] **Step 2: Run the resolver test and verify RED**

Run:

```powershell
pnpm.cmd exec vitest run src/features/projects/project-discovery-card-data.test.ts
```

Expected: FAIL because the resolver module is missing.

- [ ] **Step 3: Implement the view-model resolver**

Define:

```ts
export type ResolvedDiscoverableProject = Omit<
  DiscoverableProject,
  "coverImage" | "owner"
> & {
  coverImage: ProjectCoverImage | null;
  coverImageUrl: string | null;
  owner: {
    avatarUrl: string | null;
    display_name: string;
    username: string;
  };
};

export async function resolveDiscoverableProjects(
  projects: DiscoverableProject[],
): Promise<ResolvedDiscoverableProject[]>;
```

Resolve cover and avatar URLs concurrently with `Promise.all`, remove the two
Storage paths from returned objects, and preserve input order.

- [ ] **Step 4: Rerun the resolver test and verify GREEN**

Run the Step 2 command. Expected: PASS.

- [ ] **Step 5: Write failing shared-card discovery tests**

Extend the existing fixture with `like_count` and `owner`, then assert the real
component renders non-interactive owner identity and the count:

```ts
expect(screen.getByText("Alex Morgan")).toBeInTheDocument();
expect(screen.getByText("@alexmorgan")).toBeInTheDocument();
expect(screen.getByText("42 likes")).toBeInTheDocument();
```

Keep the existing whole-card `/projects/[id]` destination assertion. Owner
identity stays plain text in this phase so the card remains one valid link and
does not create nested anchors.

- [ ] **Step 6: Run shared-card tests and verify RED**

Run:

```powershell
pnpm.cmd exec vitest run src/features/projects/public-project-card.test.tsx
```

Expected: FAIL because owner and like metadata are not rendered.

- [ ] **Step 7: Implement the accessible card structure**

Allow `PublicProjectCardProject` to carry optional `owner` and `like_count` so
existing developer-profile cards remain compatible. Render a non-interactive
metadata footer only when those fields exist. Preserve cover/fallback behavior,
the whole-card link, equal-height layout, technologies, project-specific
accessible name, focus styling, and reduced-motion classes.

- [ ] **Step 8: Rerun card tests and verify GREEN**

Run the Step 6 command. Expected: all card tests PASS.

- [ ] **Step 9: Review checkpoint**

Render the test DOM and verify the project card remains a single anchor with no
nested interactive element.

---

### Task 4: Discovery view and `/projects` route

**Files:**
- Create: `src/features/projects/project-discovery-view.tsx`
- Create: `src/features/projects/project-discovery-view.test.tsx`
- Create: `src/app/projects/page.tsx`
- Create: `src/app/projects/page.test.tsx`

**Interfaces:**
- Consumes: `ProjectDiscoveryResult`, `ResolvedDiscoverableProject`, `buildProjectDiscoveryHref`, `getProjectDiscovery`, `parseProjectDiscoveryFilters`, and `resolveDiscoverableProjects`.
- Produces: `ProjectDiscoveryView` and the public `/projects` page with static metadata.

- [ ] **Step 1: Write failing view behavior tests**

Use real resolved project fixtures and assert:

```ts
expect(screen.getByRole("heading", { level: 1, name: "Explore Projects" }))
  .toBeInTheDocument();
expect(screen.getByRole("searchbox", { name: "Search projects" }))
  .toHaveValue("code review");
expect(screen.getByRole("combobox", { name: "Category" }))
  .toHaveValue("developer-tools");
expect(screen.getByRole("list", { name: "Project results" }))
  .toHaveClass("sm:grid-cols-2", "lg:grid-cols-3");
expect(screen.getByRole("link", { name: "Next page" }))
  .toHaveAttribute("href", expectedNextHref);
expect(screen.getByRole("link", { name: "Clear filters" }))
  .toHaveAttribute("href", "/projects");
```

Add separate tests for page 1 without Previous, final page without Next, and an
empty result with `No projects match these filters.` plus Clear filters.

- [ ] **Step 2: Run view tests and verify RED**

Run:

```powershell
pnpm.cmd exec vitest run src/features/projects/project-discovery-view.test.tsx
```

Expected: FAIL because the view does not exist.

- [ ] **Step 3: Implement the server-rendered GET form and results**

`ProjectDiscoveryView` receives:

```ts
type ProjectDiscoveryViewProps = Omit<
  ProjectDiscoveryResult,
  "projects"
> & {
  projects: ResolvedDiscoverableProject[];
};
```

Render `<form action="/projects" method="get">` with visible labels and named
fields `q`, `category`, `technology`, and `sort`. Include `All categories` and
`All technologies` empty options, an Apply filters submit button, the exact
result count, the responsive list, conditional Clear filters, and ordinary
Next.js Previous/Next links built by `buildProjectDiscoveryHref`.

- [ ] **Step 4: Rerun view tests and verify GREEN**

Run the Step 2 command. Expected: PASS.

- [ ] **Step 5: Write failing route composition tests**

Mock only the discovery data and asset resolver boundaries. Verify the Next.js
16 promise prop is awaited and normalized:

```ts
render(
  await ProjectsPage({
    searchParams: Promise.resolve({ page: "2", q: "  code review " }),
  }),
);

expect(getProjectDiscoveryMock).toHaveBeenCalledWith({
  category: null,
  page: 2,
  q: "code review",
  sort: "newest",
  technology: null,
});
expect(screen.getByRole("heading", { name: "Explore Projects" }))
  .toBeInTheDocument();
```

Assert exported metadata title is `Explore Projects` and its description
mentions published developer work.

- [ ] **Step 6: Run route tests and verify RED**

Run:

```powershell
pnpm.cmd exec vitest run src/app/projects/page.test.tsx
```

Expected: FAIL because the route does not exist.

- [ ] **Step 7: Implement the route composition**

Use this exact page prop shape:

```ts
type ProjectsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
```

Await `searchParams`, parse them, fetch discovery data, resolve card assets,
and render `ProjectDiscoveryView`. Do not add a Client Component or browser
fetch.

- [ ] **Step 8: Rerun route and view tests and verify GREEN**

Run:

```powershell
pnpm.cmd exec vitest run src/app/projects/page.test.tsx src/features/projects/project-discovery-view.test.tsx
```

Expected: both files PASS.

- [ ] **Step 9: Review checkpoint**

Verify the route renders with an empty `searchParams` object and creates no
authentication redirect.

---

### Task 5: Live landing-page trending projects

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/page.test.tsx`
- Modify: `src/features/landing/components/trending-projects.tsx`
- Create: `src/features/landing/components/trending-projects.test.tsx`
- Modify: `src/features/landing/data.ts`
- Delete: `src/features/landing/components/project-card.tsx`

**Interfaces:**
- Consumes: `getTrendingProjects(4)`, `resolveDiscoverableProjects`, `ResolvedDiscoverableProject`, and `PublicProjectCard`.
- Produces: async `HomePage` data composition and `TrendingProjects({ projects })`.

- [ ] **Step 1: Write failing Trending Projects tests**

Assert four supplied real projects render through the shared card, the section
contains a `View all projects` link to `/projects`, and an empty array renders:

```ts
expect(screen.getByText("No published projects yet.")).toBeInTheDocument();
expect(screen.getByRole("link", { name: "Explore projects" }))
  .toHaveAttribute("href", "/projects");
```

- [ ] **Step 2: Run the section tests and verify RED**

Run:

```powershell
pnpm.cmd exec vitest run src/features/landing/components/trending-projects.test.tsx
```

Expected: FAIL because the section still reads static landing data.

- [ ] **Step 3: Convert the section to live-data props**

Define:

```ts
type TrendingProjectsProps = {
  projects: ResolvedDiscoverableProject[];
};
```

Render up to four `PublicProjectCard` instances in the existing four-column
landing grid. Add the View all link and compact empty state. Remove the static
`projects` export and its import from `landing/data.ts`. Delete the old landing
`ProjectCard`, which has no remaining caller. Keep `ProjectPreview` and
`ProjectThumbnail` because the separate profile-preview mockup still uses them.

- [ ] **Step 4: Rerun section tests and verify GREEN**

Run the Step 2 command. Expected: PASS.

- [ ] **Step 5: Write the failing home-page composition test**

Mock `getTrendingProjects` and `resolveDiscoverableProjects`, change both
existing tests to `render(await HomePage())`, and assert:

```ts
expect(getTrendingProjectsMock).toHaveBeenCalledWith(4);
expect(resolveDiscoverableProjectsMock).toHaveBeenCalledWith(rawProjects);
expect(screen.getByRole("link", { name: "View all projects" }))
  .toHaveAttribute("href", "/projects");
```

- [ ] **Step 6: Run the home-page test and verify RED**

Run:

```powershell
pnpm.cmd exec vitest run src/app/page.test.tsx
```

Expected: FAIL because `HomePage` does not load public project data.

- [ ] **Step 7: Implement async home-page composition**

Make `HomePage` async, fetch exactly four trending projects, resolve their
assets, and pass them to `<TrendingProjects projects={projects} />`. Preserve
every other section and its order.

- [ ] **Step 8: Rerun landing tests and verify GREEN**

Run:

```powershell
pnpm.cmd exec vitest run src/app/page.test.tsx src/features/landing/components/trending-projects.test.tsx
```

Expected: both files PASS.

- [ ] **Step 9: Review checkpoint**

Search production landing imports and confirm `landing/data.ts` no longer
supplies the Trending Projects section.

---

### Task 6: Public navigation, sitemap, and mutation revalidation

**Files:**
- Modify: `src/components/layout/site-header.tsx`
- Modify: `src/components/layout/site-header.test.tsx`
- Modify: `src/components/layout/site-footer.tsx`
- Modify: `src/components/layout/site-footer.test.tsx`
- Modify: `src/app/sitemap.ts`
- Create: `src/app/sitemap.test.ts`
- Modify: `src/features/projects/project-actions.ts`
- Modify: `src/features/projects/project-actions.test.ts`

**Interfaces:**
- Consumes: existing `Link`, `MetadataRoute.Sitemap`, `revalidatePath`, project IDs, and usernames.
- Produces: canonical project discovery links and `/` plus `/projects` cache invalidation after every project mutation.

- [ ] **Step 1: Write failing navigation tests**

Change header expectations so both Explore and Projects resolve to `/projects`.
Within the footer's Platform group, assert the same two destinations. Preserve
all other navigation targets unchanged.

- [ ] **Step 2: Run navigation tests and verify RED**

Run:

```powershell
pnpm.cmd exec vitest run src/components/layout/site-header.test.tsx src/components/layout/site-footer.test.tsx
```

Expected: FAIL on the old landing hashes.

- [ ] **Step 3: Update navigation targets**

Change only the approved href values. Do not alter the signed-in Dashboard plus
avatar branch or signed-out Sign In plus Join DevHub branch.

- [ ] **Step 4: Rerun navigation tests and verify GREEN**

Run the Step 2 command. Expected: PASS.

- [ ] **Step 5: Write the failing sitemap test**

Mock `publicEnv.NEXT_PUBLIC_APP_URL` as `https://devhub.example` and assert the
returned URL list is exactly:

```ts
[
  "https://devhub.example",
  "https://devhub.example/projects",
]
```

- [ ] **Step 6: Run the sitemap test and verify RED**

Run:

```powershell
pnpm.cmd exec vitest run src/app/sitemap.test.ts
```

Expected: FAIL because only the home URL exists.

- [ ] **Step 7: Add the canonical discovery sitemap entry**

Build the second URL with `new URL("/projects", publicEnv.NEXT_PUBLIC_APP_URL)`
and return its string. Use `weekly` change frequency and priority `0.8`.

- [ ] **Step 8: Rerun the sitemap test and verify GREEN**

Run the Step 6 command. Expected: PASS.

- [ ] **Step 9: Write the failing revalidation expectation**

Extend the existing `allProjectPaths` test fixture so every successful create,
update, publish, unpublish, delete, upload, remove, and reorder expects `/` and
`/projects` in addition to the current dashboard, detail, and developer paths.

- [ ] **Step 10: Run action tests and verify RED**

Run:

```powershell
pnpm.cmd exec vitest run src/features/projects/project-actions.test.ts
```

Expected: FAIL because `revalidateProjectPaths` does not include both public
listing paths.

- [ ] **Step 11: Add public-list revalidation**

Add these calls once inside `revalidateProjectPaths`:

```ts
revalidatePath("/");
revalidatePath("/projects");
```

- [ ] **Step 12: Rerun action tests and verify GREEN**

Run the Step 10 command. Expected: PASS.

- [ ] **Step 13: Review checkpoint**

Verify failed mutations still make zero `revalidatePath` calls and successful
mutations do not expose project image paths or provider messages.

---

### Task 7: Full verification and local production restart

**Files:**
- Verify only; do not create QA artifacts.

**Interfaces:**
- Consumes: the complete implementation from Tasks 1–6.
- Produces: fresh evidence that tests, lint, types, production compilation, and public routes succeed.

- [ ] **Step 1: Run focused discovery regression tests together**

Run:

```powershell
pnpm.cmd exec vitest run src/features/projects/project-discovery-input.test.ts src/features/projects/project-discovery.test.ts src/features/projects/project-discovery-card-data.test.ts src/features/projects/public-project-card.test.tsx src/features/projects/project-discovery-view.test.tsx src/app/projects/page.test.tsx src/features/landing/components/trending-projects.test.tsx src/app/page.test.tsx src/components/layout/site-header.test.tsx src/components/layout/site-footer.test.tsx src/app/sitemap.test.ts src/features/projects/project-actions.test.ts
```

Expected: every listed test file PASS with zero errors or warnings.

- [ ] **Step 2: Run full static and test verification**

Run independently and retain each exit code:

```powershell
pnpm.cmd lint
pnpm.cmd typecheck
pnpm.cmd test
```

Expected: all three commands exit 0; full Vitest output reports zero failed
files and zero failed tests.

- [ ] **Step 3: Stop only the verified DevHub listener**

Resolve port 3000 with `Get-NetTCPConnection`, inspect the owning process with
`Get-CimInstance Win32_Process`, and stop it only when its command line points
to `D:\DevHub` and Next.js. If no listener exists, continue without stopping a
process.

- [ ] **Step 4: Run the production build**

Run:

```powershell
pnpm.cmd build
```

Expected: exit 0 and the route table includes `/projects` plus the existing
dynamic `/projects/[id]` route.

- [ ] **Step 5: Restart the production server**

Start:

```powershell
node node_modules/next/dist/bin/next start --hostname localhost
```

Keep it in a persistent terminal session and wait for `Ready`.

- [ ] **Step 6: Probe public routes**

Use `Invoke-WebRequest` with 10-second timeouts and verify:

```text
GET http://localhost:3000/          -> 200
GET http://localhost:3000/projects -> 200
```

Do not read or print `.env.local`. Report the changed files, exact verification
counts, and any limitation discovered during the probes.
