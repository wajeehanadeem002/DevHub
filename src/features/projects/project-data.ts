import "server-only";

import { requireProfile } from "@/lib/auth/require-profile";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.generated";

import type { ProjectInput } from "./project-input";
import { parseProjectId } from "./project-input";

type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];
type ProjectImageRow =
  Database["public"]["Tables"]["project_images"]["Row"];
type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];
type TechnologyRow =
  Database["public"]["Tables"]["technologies"]["Row"];
type CreateProjectArgs =
  Database["public"]["Functions"]["create_current_project"]["Args"];
type UpdateProjectArgs =
  Database["public"]["Functions"]["update_current_project"]["Args"];

export type ProjectCategory = Pick<CategoryRow, "id" | "name" | "slug">;
export type ProjectTechnology = Pick<TechnologyRow, "id" | "name" | "slug">;
export type ProjectImage = Pick<
  ProjectImageRow,
  "alt_text" | "height" | "id" | "sort_order" | "storage_path" | "width"
>;

export type CurrentProject = Pick<
  ProjectRow,
  "id" | "status" | "summary" | "title" | "updated_at"
> & {
  category: ProjectCategory | null;
  coverImage: ProjectImage | null;
  technologies: ProjectTechnology[];
};

export type OwnedProject = Pick<
  ProjectRow,
  | "category_id"
  | "demo_url"
  | "description"
  | "id"
  | "repository_url"
  | "status"
  | "summary"
  | "title"
> & {
  images: ProjectImage[];
  technologyIds: number[];
};

const taxonomyErrorMessage = "Unable to load project taxonomy.";
const currentProjectsErrorMessage = "Unable to load your projects.";
const ownedProjectErrorMessage = "Unable to load this project.";

function throwProviderError(message: string, cause: unknown): never {
  throw new Error(message, { cause });
}

function validatedProjectId(projectId: string): string {
  const result = parseProjectId(projectId);

  if (!result.success) {
    throw new Error(result.error);
  }

  return result.data;
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

function createProjectArgs(input: ProjectInput): CreateProjectArgs {
  return {
    p_category_id: input.category_id,
    p_demo_url: input.demo_url,
    p_description: input.description,
    p_repository_url: input.repository_url,
    p_summary: input.summary,
    p_technology_ids: input.technologyIds,
    p_title: input.title,
  };
}

export async function getProjectTaxonomy(): Promise<{
  categories: ProjectCategory[];
  technologies: ProjectTechnology[];
}> {
  const supabase = await createServerSupabaseClient();
  const { data: categories, error: categoryError } = await supabase
    .from("categories")
    .select("id, name, slug")
    .order("sort_order", { ascending: true });

  if (categoryError) {
    throwProviderError(taxonomyErrorMessage, categoryError);
  }

  const { data: technologies, error: technologyError } = await supabase
    .from("technologies")
    .select("id, name, slug")
    .order("sort_order", { ascending: true });

  if (technologyError) {
    throwProviderError(taxonomyErrorMessage, technologyError);
  }

  return {
    categories: categories ?? [],
    technologies: technologies ?? [],
  };
}

export async function getCurrentProjects(): Promise<CurrentProject[]> {
  const { profile } = await requireProfile();
  const supabase = await createServerSupabaseClient();
  const { data: projects, error: projectError } = await supabase
    .from("projects")
    .select("id, title, summary, status, updated_at, category_id")
    .eq("owner_id", profile.user_id)
    .order("updated_at", { ascending: false });

  if (projectError) {
    throwProviderError(currentProjectsErrorMessage, projectError);
  }

  if (!projects || projects.length === 0) {
    return [];
  }

  const projectIds = projects.map((project) => project.id);
  const categoryIds = [...new Set(projects.map((project) => project.category_id))];
  const { data: categories, error: categoryError } = await supabase
    .from("categories")
    .select("id, name, slug")
    .in("id", categoryIds)
    .order("sort_order", { ascending: true });

  if (categoryError) {
    throwProviderError(currentProjectsErrorMessage, categoryError);
  }

  const { data: technologyLinks, error: technologyLinkError } = await supabase
    .from("project_technologies")
    .select("project_id, technology_id")
    .in("project_id", projectIds);

  if (technologyLinkError) {
    throwProviderError(currentProjectsErrorMessage, technologyLinkError);
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
      throwProviderError(currentProjectsErrorMessage, technologyError);
    }

    technologies = data ?? [];
  }

  const { data: imageRows, error: imageError } = await supabase
    .from("project_images")
    .select("project_id, id, storage_path, alt_text, width, height, sort_order")
    .in("project_id", projectIds)
    .order("sort_order", { ascending: true });

  if (imageError) {
    throwProviderError(currentProjectsErrorMessage, imageError);
  }

  const categoryById = new Map(
    (categories ?? []).map((category) => [category.id, category]),
  );
  const technologyIdsByProject = new Map<string, Set<number>>();
  for (const link of technologyLinks ?? []) {
    const technologyIds =
      technologyIdsByProject.get(link.project_id) ?? new Set<number>();
    technologyIds.add(link.technology_id);
    technologyIdsByProject.set(link.project_id, technologyIds);
  }

  const coverByProject = new Map<string, ProjectImage>();
  for (const image of imageRows ?? []) {
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
      status: project.status,
      summary: project.summary,
      technologies: technologies.filter((technology) =>
        selectedTechnologyIds.has(technology.id),
      ),
      title: project.title,
      updated_at: project.updated_at,
    };
  });
}

export async function getOwnedProject(
  projectId: string,
): Promise<OwnedProject | null> {
  const { profile } = await requireProfile();
  const normalizedProjectId = validatedProjectId(projectId);
  const supabase = await createServerSupabaseClient();
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select(
      "id, title, summary, description, category_id, demo_url, repository_url, status",
    )
    .eq("id", normalizedProjectId)
    .eq("owner_id", profile.user_id)
    .maybeSingle();

  if (projectError) {
    throwProviderError(ownedProjectErrorMessage, projectError);
  }

  if (!project) {
    return null;
  }

  const { data: technologyLinks, error: technologyError } = await supabase
    .from("project_technologies")
    .select("technology_id")
    .eq("project_id", normalizedProjectId)
    .order("technology_id", { ascending: true });

  if (technologyError) {
    throwProviderError(ownedProjectErrorMessage, technologyError);
  }

  const { data: images, error: imageError } = await supabase
    .from("project_images")
    .select("id, storage_path, alt_text, width, height, sort_order")
    .eq("project_id", normalizedProjectId)
    .order("sort_order", { ascending: true });

  if (imageError) {
    throwProviderError(ownedProjectErrorMessage, imageError);
  }

  return {
    ...project,
    images: (images ?? []).map(toProjectImage),
    technologyIds: (technologyLinks ?? []).map(
      (technology) => technology.technology_id,
    ),
  };
}

export async function createCurrentProject(
  input: ProjectInput,
): Promise<string> {
  await requireProfile();
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc(
    "create_current_project",
    createProjectArgs(input),
  );

  if (error || data === null) {
    throwProviderError("Unable to create the project.", error);
  }

  return data;
}

export async function updateCurrentProject(
  projectId: string,
  input: ProjectInput,
  status: "draft" | "published",
): Promise<"updated"> {
  await requireProfile();
  const normalizedProjectId = validatedProjectId(projectId);
  if (status !== "draft" && status !== "published") {
    throw new Error("Invalid project status.");
  }

  const args: UpdateProjectArgs = {
    ...createProjectArgs(input),
    p_project_id: normalizedProjectId,
    p_status: status,
  };
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("update_current_project", args);

  if (error) {
    throwProviderError("Unable to update the project.", error);
  }

  return "updated";
}

export async function deleteCurrentProject(projectId: string): Promise<string[]> {
  await requireProfile();
  const normalizedProjectId = validatedProjectId(projectId);
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("delete_current_project", {
    p_project_id: normalizedProjectId,
  });

  if (error) {
    throwProviderError("Unable to delete the project.", error);
  }

  return data ?? [];
}
