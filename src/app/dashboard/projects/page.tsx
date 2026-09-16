import { Container } from "@/components/ui/container";
import { getAvatarPublicUrl } from "@/features/profile/avatar-storage";
import { DashboardNavigation } from "@/features/profile/dashboard-navigation";
import { DashboardProjectList } from "@/features/projects/dashboard-project-list";
import { getCurrentProjects } from "@/features/projects/project-data";
import { getProjectImagePublicUrl } from "@/features/projects/project-image-storage";
import { requireProfile } from "@/lib/auth/require-profile";

export default async function DashboardProjectsPage() {
  const profilePromise = requireProfile();
  const projectsPromise = getCurrentProjects();
  const [{ profile }, projects] = await Promise.all([
    profilePromise,
    projectsPromise,
  ]);

  const avatarUrlPromise = getAvatarPublicUrl(profile.avatar_path);
  const projectsWithCoverUrlsPromise = Promise.all(
    projects.map(async (project) => ({
      ...project,
      coverImageUrl: project.coverImage
        ? await getProjectImagePublicUrl(project.coverImage.storage_path)
        : null,
    })),
  );
  const [avatarUrl, projectsWithCoverUrls] = await Promise.all([
    avatarUrlPromise,
    projectsWithCoverUrlsPromise,
  ]);

  return (
    <main className="flex-1" id="main-content">
      <Container className="py-10 sm:py-12 lg:py-16">
        <div className="grid gap-8 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10">
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <DashboardNavigation
              active="projects"
              profile={{
                avatarUrl,
                displayName: profile.display_name,
                isPublic: profile.is_public,
                username: profile.username,
              }}
            />
          </aside>

          <div className="min-w-0">
            <header className="border-b border-[#ded3c7] pb-8">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8a6a52]">
                Project workspace
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-[#3b2f27] sm:text-5xl">
                Your projects
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-[#75685d]">
                Build drafts, keep your project details current, and publish
                work when it is ready for your public portfolio.
              </p>
            </header>

            <div className="mt-8">
              <DashboardProjectList projects={projectsWithCoverUrls} />
            </div>
          </div>
        </div>
      </Container>
    </main>
  );
}
