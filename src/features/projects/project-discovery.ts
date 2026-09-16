import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { requireProfile } from "@/lib/auth/require-profile";
import {
  createServerSupabaseClient,
  createServerSupabasePublicClient,
} from "@/lib/supabase/server";
import type { Database } from "@/types/database.generated";

import type {
  ProjectCategory,
  ProjectImage,
  ProjectTechnology,
} from "./project-data";
import {
  PROJECT_DISCOVERY_PAGE_SIZE,
  type ProjectDiscoveryFilters,
} from "./project-discovery-input";
import type { PublicProjectOwner } from "./public-project";

type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];
type DiscoveryProjectRow = Pick<
  ProjectRow,
  | "category_id"
  | "id"
  | "like_count"
  | "owner_id"
  | "published_at"
  | "summary"
  | "title"
>;
type DatabaseClient = SupabaseClient<Database>;

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

const discoveryErrorMessage = "Unable to load project discovery.";
const projectSelection =
  "id, owner_id, title, summary, category_id, published_at, like_count";

function throwDiscoveryError(cause: unknown): never {
  throw new Error(discoveryErrorMessage, { cause });
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

function toProjectImage(
  image: ProjectImage & { project_id: string },
): ProjectImage {
  return {
    alt_text: image.alt_text,
    height: image.height,
    id: image.id,
    sort_order: image.sort_order,
    storage_path: image.storage_path,
    width: image.width,
  };
}

function toPublicOwner(
  owner: PublicProjectOwner & { user_id: string },
): PublicProjectOwner {
  return {
    avatar_path: owner.avatar_path,
    display_name: owner.display_name,
    headline: owner.headline,
    username: owner.username,
  };
}

async function loadProjectRows(
  supabase: DatabaseClient,
  filters: ProjectDiscoveryFilters,
  categoryId: number | null,
  matchingProjectIds: string[] | null,
  page: number,
) {
  let query = supabase
    .from("projects")
    .select(projectSelection, { count: "exact" })
    .eq("status", "published");

  if (categoryId !== null) {
    query = query.eq("category_id", categoryId);
  }
  if (filters.q) {
    query = query.textSearch("search_document", filters.q, {
      config: "english",
      type: "websearch",
    });
  }
  if (matchingProjectIds !== null) {
    query = query.in("id", matchingProjectIds);
  }

  if (filters.sort === "popular") {
    query = query
      .order("like_count", { ascending: false })
      .order("published_at", { ascending: false })
      .order("id", { ascending: true });
  } else {
    query = query
      .order("published_at", { ascending: false })
      .order("id", { ascending: true });
  }

  const offset = (page - 1) * PROJECT_DISCOVERY_PAGE_SIZE;
  const { count, data, error } = await query.range(
    offset,
    offset + PROJECT_DISCOVERY_PAGE_SIZE - 1,
  );
  if (error) {
    throw error;
  }

  return {
    count: count ?? 0,
    rows: (data ?? []) as DiscoveryProjectRow[],
  };
}

async function assembleProjects(
  supabase: DatabaseClient,
  rows: DiscoveryProjectRow[],
  knownCategories?: ProjectCategory[],
  knownTechnologies?: ProjectTechnology[],
): Promise<DiscoverableProject[]> {
  if (rows.length === 0) {
    return [];
  }

  const projectIds = rows.map((project) => project.id);
  const ownerIds = unique(rows.map((project) => project.owner_id));
  const categoryIds = unique(rows.map((project) => project.category_id));
  const [ownerResult, technologyLinkResult, imageResult, categoryResult] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("user_id, username, display_name, headline, avatar_path")
        .in("user_id", ownerIds)
        .eq("is_public", true)
        .is("deleted_at", null),
      supabase
        .from("project_technologies")
        .select("project_id, technology_id")
        .in("project_id", projectIds),
      supabase
        .from("project_images")
        .select(
          "project_id, id, storage_path, alt_text, width, height, sort_order",
        )
        .in("project_id", projectIds)
        .order("sort_order", { ascending: true }),
      knownCategories
        ? Promise.resolve({ data: knownCategories, error: null })
        : supabase
            .from("categories")
            .select("id, name, slug")
            .in("id", categoryIds),
    ]);

  if (ownerResult.error) {
    throw ownerResult.error;
  }
  if (technologyLinkResult.error) {
    throw technologyLinkResult.error;
  }
  if (imageResult.error) {
    throw imageResult.error;
  }
  if (categoryResult.error) {
    throw categoryResult.error;
  }

  const technologyLinks = technologyLinkResult.data ?? [];
  let technologies = knownTechnologies;
  if (!technologies) {
    const technologyIds = unique(
      technologyLinks.map((link) => link.technology_id),
    );
    if (technologyIds.length === 0) {
      technologies = [];
    } else {
      const technologyResult = await supabase
        .from("technologies")
        .select("id, name, slug")
        .in("id", technologyIds)
        .order("sort_order", { ascending: true });
      if (technologyResult.error) {
        throw technologyResult.error;
      }
      technologies = technologyResult.data ?? [];
    }
  }

  const ownerById = new Map(
    (ownerResult.data ?? []).map((owner) => [owner.user_id, owner]),
  );
  const categoryById = new Map(
    (categoryResult.data ?? []).map((category) => [category.id, category]),
  );
  const technologyIdsByProject = new Map<string, Set<number>>();
  for (const link of technologyLinks) {
    const selectedIds =
      technologyIdsByProject.get(link.project_id) ?? new Set<number>();
    selectedIds.add(link.technology_id);
    technologyIdsByProject.set(link.project_id, selectedIds);
  }

  const coverByProject = new Map<string, ProjectImage>();
  for (const image of imageResult.data ?? []) {
    if (!coverByProject.has(image.project_id)) {
      coverByProject.set(image.project_id, toProjectImage(image));
    }
  }

  return rows.flatMap((project) => {
    const owner = ownerById.get(project.owner_id);
    if (!owner) {
      return [];
    }

    const selectedTechnologyIds =
      technologyIdsByProject.get(project.id) ?? new Set<number>();
    return [
      {
        category: categoryById.get(project.category_id) ?? null,
        coverImage: coverByProject.get(project.id) ?? null,
        id: project.id,
        like_count: project.like_count,
        owner: toPublicOwner(owner),
        published_at: project.published_at,
        summary: project.summary,
        technologies: technologies.filter((technology) =>
          selectedTechnologyIds.has(technology.id),
        ),
        title: project.title,
      },
    ];
  });
}

export async function getProjectDiscovery(
  requestedFilters: ProjectDiscoveryFilters,
): Promise<ProjectDiscoveryResult> {
  try {
    const supabase = createServerSupabasePublicClient();
    const [categoryResult, technologyResult] = await Promise.all([
      supabase
        .from("categories")
        .select("id, name, slug")
        .order("sort_order", { ascending: true }),
      supabase
        .from("technologies")
        .select("id, name, slug")
        .order("sort_order", { ascending: true }),
    ]);
    if (categoryResult.error) {
      throw categoryResult.error;
    }
    if (technologyResult.error) {
      throw technologyResult.error;
    }

    const categories = categoryResult.data ?? [];
    const technologies = technologyResult.data ?? [];
    const category = categories.find(
      (item) => item.slug === requestedFilters.category,
    );
    const technology = technologies.find(
      (item) => item.slug === requestedFilters.technology,
    );
    const filters: ProjectDiscoveryFilters = {
      ...requestedFilters,
      category: category?.slug ?? null,
      technology: technology?.slug ?? null,
    };

    let matchingProjectIds: string[] | null = null;
    if (technology) {
      const technologyLinksResult = await supabase
        .from("project_technologies")
        .select("project_id")
        .eq("technology_id", technology.id);
      if (technologyLinksResult.error) {
        throw technologyLinksResult.error;
      }
      matchingProjectIds = unique(
        (technologyLinksResult.data ?? []).map((link) => link.project_id),
      );
      if (matchingProjectIds.length === 0) {
        return {
          categories,
          filters: { ...filters, page: 1 },
          pageCount: 1,
          projects: [],
          technologies,
          totalCount: 0,
        };
      }
    }

    let pageResult = await loadProjectRows(
      supabase,
      filters,
      category?.id ?? null,
      matchingProjectIds,
      filters.page,
    );
    const pageCount = Math.max(
      1,
      Math.ceil(pageResult.count / PROJECT_DISCOVERY_PAGE_SIZE),
    );
    const normalizedPage = pageResult.count === 0 ? 1 : Math.min(filters.page, pageCount);
    if (normalizedPage !== filters.page) {
      pageResult = await loadProjectRows(
        supabase,
        filters,
        category?.id ?? null,
        matchingProjectIds,
        normalizedPage,
      );
    }

    return {
      categories,
      filters: { ...filters, page: normalizedPage },
      pageCount,
      projects: await assembleProjects(
        supabase,
        pageResult.rows,
        categories,
        technologies,
      ),
      technologies,
      totalCount: pageResult.count,
    };
  } catch (error) {
    throwDiscoveryError(error);
  }
}

export async function getTrendingProjects(limit = 4) {
  try {
    const normalizedLimit = Math.min(
      12,
      Math.max(1, Number.isFinite(limit) ? Math.trunc(limit) : 4),
    );
    const supabase = createServerSupabasePublicClient();
    const { data, error } = await supabase
      .from("projects")
      .select(projectSelection)
      .eq("status", "published")
      .order("like_count", { ascending: false })
      .order("published_at", { ascending: false })
      .order("id", { ascending: true })
      .range(0, normalizedLimit - 1);
    if (error) {
      throw error;
    }

    return await assembleProjects(
      supabase,
      (data ?? []) as DiscoveryProjectRow[],
    );
  } catch (error) {
    throwDiscoveryError(error);
  }
}

export async function getCurrentSavedProjects(): Promise<DiscoverableProject[]> {
  try {
    const { userId } = await requireProfile();
    const supabase = await createServerSupabaseClient();
    const { data: saves, error: saveError } = await supabase
      .from("project_saves")
      .select("project_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (saveError) {
      throw saveError;
    }
    if (!saves?.length) {
      return [];
    }

    const ids = saves.map((save) => save.project_id);
    const { data, error } = await supabase
      .from("projects")
      .select(projectSelection)
      .eq("status", "published")
      .in("id", ids);
    if (error) {
      throw error;
    }

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
