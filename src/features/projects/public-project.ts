import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.generated";

import type {
  ProjectCategory,
  ProjectImage,
  ProjectTechnology,
} from "./project-data";
import { parseProjectId } from "./project-input";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];

export type PublicProjectOwner = Pick<
  ProfileRow,
  "avatar_path" | "display_name" | "headline" | "username"
>;

export type PublicProject = Pick<
  ProjectRow,
  | "demo_url"
  | "description"
  | "id"
  | "like_count"
  | "published_at"
  | "repository_url"
  | "summary"
  | "title"
> & {
  category: ProjectCategory | null;
  images: ProjectImage[];
  owner: PublicProjectOwner;
  owner_id: string;
  technologies: ProjectTechnology[];
};

export type PublicProjectSummary = Pick<
  ProjectRow,
  "id" | "published_at" | "summary" | "title"
> & {
  category: ProjectCategory | null;
  coverImage: ProjectImage | null;
  technologies: ProjectTechnology[];
};

const publicProjectErrorMessage = "Unable to load this project.";
const publishedProjectsErrorMessage = "Unable to load published projects.";

function throwProviderError(message: string, cause: unknown): never {
  throw new Error(message, { cause });
}

async function createPublicSupabaseClient(errorMessage: string) {
  try {
    return await createServerSupabaseClient();
  } catch (error) {
    throwProviderError(errorMessage, error);
  }
}

function toProjectImage(
  image: ProjectImage & { project_id?: string },
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

function toPublicOwner(owner: PublicProjectOwner): PublicProjectOwner {
  return {
    avatar_path: owner.avatar_path,
    display_name: owner.display_name,
    headline: owner.headline,
    username: owner.username,
  };
}

export async function getPublicProject(
  projectId: string,
): Promise<PublicProject | null> {
  const parsedProjectId = parseProjectId(projectId);
  if (!parsedProjectId.success) {
    return null;
  }

  const normalizedProjectId = parsedProjectId.data;
  const supabase = await createPublicSupabaseClient(publicProjectErrorMessage);
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select(
      "id, owner_id, title, summary, description, category_id, demo_url, repository_url, published_at, like_count",
    )
    .eq("id", normalizedProjectId)
    .eq("status", "published")
    .maybeSingle();

  if (projectError) {
    throwProviderError(publicProjectErrorMessage, projectError);
  }

  if (!project) {
    return null;
  }

  const { data: owner, error: ownerError } = await supabase
    .from("profiles")
    .select("username, display_name, headline, avatar_path")
    .eq("user_id", project.owner_id)
    .eq("is_public", true)
    .is("deleted_at", null)
    .maybeSingle();

  if (ownerError) {
    throwProviderError(publicProjectErrorMessage, ownerError);
  }

  if (!owner) {
    return null;
  }

  const { data: category, error: categoryError } = await supabase
    .from("categories")
    .select("id, name, slug")
    .eq("id", project.category_id)
    .maybeSingle();

  if (categoryError) {
    throwProviderError(publicProjectErrorMessage, categoryError);
  }

  const { data: technologyLinks, error: technologyLinkError } = await supabase
    .from("project_technologies")
    .select("technology_id")
    .eq("project_id", normalizedProjectId);

  if (technologyLinkError) {
    throwProviderError(publicProjectErrorMessage, technologyLinkError);
  }

  let technologies: ProjectTechnology[] = [];
  if (technologyLinks && technologyLinks.length > 0) {
    const technologyIds = technologyLinks.map((link) => link.technology_id);
    const { data, error: technologyError } = await supabase
      .from("technologies")
      .select("id, name, slug")
      .in("id", technologyIds)
      .order("sort_order", { ascending: true });

    if (technologyError) {
      throwProviderError(publicProjectErrorMessage, technologyError);
    }

    technologies = data ?? [];
  }

  const { data: images, error: imageError } = await supabase
    .from("project_images")
    .select("id, storage_path, alt_text, width, height, sort_order")
    .eq("project_id", normalizedProjectId)
    .order("sort_order", { ascending: true });

  if (imageError) {
    throwProviderError(publicProjectErrorMessage, imageError);
  }

  return {
    category,
    demo_url: project.demo_url,
    description: project.description,
    id: project.id,
    images: (images ?? []).map(toProjectImage),
    like_count: project.like_count,
    owner: toPublicOwner(owner),
    owner_id: project.owner_id,
    published_at: project.published_at,
    repository_url: project.repository_url,
    summary: project.summary,
    technologies,
    title: project.title,
  };
}

export async function getPublishedProjectsByOwner(
  ownerId: string,
): Promise<PublicProjectSummary[]> {
  const normalizedOwnerId = ownerId.trim();
  const supabase = await createPublicSupabaseClient(
    publishedProjectsErrorMessage,
  );
  const { data: owner, error: ownerError } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("user_id", normalizedOwnerId)
    .eq("is_public", true)
    .is("deleted_at", null)
    .maybeSingle();

  if (ownerError) {
    throwProviderError(publishedProjectsErrorMessage, ownerError);
  }

  if (!owner) {
    return [];
  }

  const { data: projects, error: projectError } = await supabase
    .from("projects")
    .select("id, title, summary, category_id, published_at")
    .eq("owner_id", normalizedOwnerId)
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (projectError) {
    throwProviderError(publishedProjectsErrorMessage, projectError);
  }

  if (!projects || projects.length === 0) {
    return [];
  }

  const projectIds = projects.map((project) => project.id);
  const categoryIds = [
    ...new Set(projects.map((project) => project.category_id)),
  ];
  const { data: categories, error: categoryError } = await supabase
    .from("categories")
    .select("id, name, slug")
    .in("id", categoryIds)
    .order("sort_order", { ascending: true });

  if (categoryError) {
    throwProviderError(publishedProjectsErrorMessage, categoryError);
  }

  const { data: technologyLinks, error: technologyLinkError } = await supabase
    .from("project_technologies")
    .select("project_id, technology_id")
    .in("project_id", projectIds);

  if (technologyLinkError) {
    throwProviderError(publishedProjectsErrorMessage, technologyLinkError);
  }

  let technologies: ProjectTechnology[] = [];
  if (technologyLinks && technologyLinks.length > 0) {
    const technologyIds = [
      ...new Set(technologyLinks.map((link) => link.technology_id)),
    ];
    const { data, error: technologyError } = await supabase
      .from("technologies")
      .select("id, name, slug")
      .in("id", technologyIds)
      .order("sort_order", { ascending: true });

    if (technologyError) {
      throwProviderError(publishedProjectsErrorMessage, technologyError);
    }

    technologies = data ?? [];
  }

  const { data: images, error: imageError } = await supabase
    .from("project_images")
    .select("project_id, id, storage_path, alt_text, width, height, sort_order")
    .in("project_id", projectIds)
    .order("sort_order", { ascending: true });

  if (imageError) {
    throwProviderError(publishedProjectsErrorMessage, imageError);
  }

  const categoryById = new Map(
    (categories ?? []).map((category) => [category.id, category]),
  );
  const technologyIdsByProject = new Map<string, Set<number>>();
  for (const link of technologyLinks ?? []) {
    const selectedIds =
      technologyIdsByProject.get(link.project_id) ?? new Set<number>();
    selectedIds.add(link.technology_id);
    technologyIdsByProject.set(link.project_id, selectedIds);
  }

  const coverByProject = new Map<string, ProjectImage>();
  for (const image of images ?? []) {
    if (!coverByProject.has(image.project_id)) {
      coverByProject.set(image.project_id, toProjectImage(image));
    }
  }

  return projects.map((project) => {
    const selectedTechnologyIds =
      technologyIdsByProject.get(project.id) ?? new Set<number>();

    return {
      category: categoryById.get(project.category_id) ?? null,
      coverImage: coverByProject.get(project.id) ?? null,
      id: project.id,
      published_at: project.published_at,
      summary: project.summary,
      technologies: technologies.filter((technology) =>
        selectedTechnologyIds.has(technology.id),
      ),
      title: project.title,
    };
  });
}
