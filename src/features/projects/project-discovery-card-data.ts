import "server-only";

import { getAvatarPublicUrl } from "@/features/profile/avatar-storage";

import type { ProjectCoverImage } from "./project-cover";
import type { DiscoverableProject } from "./project-discovery";
import { getProjectImagePublicUrl } from "./project-image-storage";

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

function withoutStoragePath(
  project: DiscoverableProject,
): ProjectCoverImage | null {
  if (!project.coverImage) {
    return null;
  }

  const { alt_text, height, id, sort_order, width } = project.coverImage;
  return { alt_text, height, id, sort_order, width };
}

export async function resolveDiscoverableProjects(
  projects: DiscoverableProject[],
): Promise<ResolvedDiscoverableProject[]> {
  return Promise.all(
    projects.map(async (project) => {
      const [avatarUrl, coverImageUrl] = await Promise.all([
        project.owner.avatar_path
          ? getAvatarPublicUrl(project.owner.avatar_path)
          : Promise.resolve(null),
        project.coverImage?.storage_path
          ? getProjectImagePublicUrl(project.coverImage.storage_path)
          : Promise.resolve(null),
      ]);

      return {
        category: project.category,
        coverImage: withoutStoragePath(project),
        coverImageUrl,
        id: project.id,
        like_count: project.like_count,
        owner: {
          avatarUrl,
          display_name: project.owner.display_name,
          username: project.owner.username,
        },
        published_at: project.published_at,
        summary: project.summary,
        technologies: project.technologies,
        title: project.title,
      };
    }),
  );
}
