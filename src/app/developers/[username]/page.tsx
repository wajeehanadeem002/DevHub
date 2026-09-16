import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getAvatarPublicUrl } from "@/features/profile/avatar-storage";
import { getPublicProfile } from "@/features/profile/public-profile";
import { PublicProfileView } from "@/features/profile/public-profile-view";
import { getProjectImagePublicUrl } from "@/features/projects/project-image-storage";
import { getPublishedProjectsByOwner } from "@/features/projects/public-project";

type DeveloperProfilePageProps = {
  params: Promise<{ username: string }>;
};

export async function generateMetadata({
  params,
}: DeveloperProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  const profile = await getPublicProfile(username);

  if (!profile) {
    return { title: "Developer profile" };
  }

  return {
    description:
      profile.bio ??
      profile.headline ??
      `Discover ${profile.display_name} on DevHub.`,
    title: `${profile.display_name} (@${profile.username})`,
  };
}

export default async function DeveloperProfilePage({
  params,
}: DeveloperProfilePageProps) {
  const { username } = await params;
  const profile = await getPublicProfile(username);

  if (!profile) {
    notFound();
  }

  const {
    avatar_path: avatarPath,
    user_id: ownerId,
    ...profileDetails
  } = profile;
  const [avatarUrl, projects] = await Promise.all([
    getAvatarPublicUrl(avatarPath),
    getPublishedProjectsByOwner(ownerId),
  ]);
  const resolvedProjects = await Promise.all(
    projects.map(async ({ coverImage, ...project }) => {
      if (!coverImage) {
        return { ...project, coverImage: null, coverImageUrl: null };
      }

      const { storage_path: storagePath, ...resolvedCoverImage } = coverImage;
      return {
        ...project,
        coverImage: resolvedCoverImage,
        coverImageUrl: await getProjectImagePublicUrl(storagePath),
      };
    }),
  );

  return (
    <PublicProfileView
      avatarUrl={avatarUrl}
      profile={profileDetails}
      projects={resolvedProjects}
    />
  );
}
