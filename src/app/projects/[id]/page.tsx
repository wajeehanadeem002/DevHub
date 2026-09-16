import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getAvatarPublicUrl } from "@/features/profile/avatar-storage";
import { getProjectEngagement } from "@/features/projects/project-engagement";
import { getProjectImagePublicUrl } from "@/features/projects/project-image-storage";
import { getPublicProject } from "@/features/projects/public-project";
import {
  PublicProjectView,
  type ResolvedPublicProject,
} from "@/features/projects/public-project-view";

type PublicProjectPageProps = {
  params: Promise<{ id: string }>;
};

const missingProjectMetadata: Metadata = {
  description: "Explore published developer work on DevHub.",
  title: "Project",
};

export async function generateMetadata({
  params,
}: PublicProjectPageProps): Promise<Metadata> {
  const { id } = await params;
  const project = await getPublicProject(id);

  if (!project) {
    return missingProjectMetadata;
  }

  return { description: project.summary, title: project.title };
}

export default async function PublicProjectPage({
  params,
}: PublicProjectPageProps) {
  const { id } = await params;
  const project = await getPublicProject(id);

  if (!project) {
    notFound();
  }

  const { owner_id: ownerId, ...publicProject } = project;
  const [engagement, avatarUrl, images] = await Promise.all([
    getProjectEngagement(project.id, ownerId),
    getAvatarPublicUrl(project.owner.avatar_path),
    Promise.all(
      project.images.map(async ({ storage_path: storagePath, ...image }) => ({
        ...image,
        publicUrl: await getProjectImagePublicUrl(storagePath),
      })),
    ),
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
}
