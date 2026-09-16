import { getAvatarPublicUrl } from "@/features/profile/avatar-storage";
import { getCurrentSavedProjects } from "@/features/projects/project-discovery";
import { resolveDiscoverableProjects } from "@/features/projects/project-discovery-card-data";
import { SavedProjectsView } from "@/features/projects/saved-projects-view";
import { requireProfile } from "@/lib/auth/require-profile";

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
