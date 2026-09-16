import Link from "next/link";

import { Container } from "@/components/ui/container";
import { DashboardNavigation } from "@/features/profile/dashboard-navigation";

import type { ResolvedDiscoverableProject } from "./project-discovery-card-data";
import { PublicProjectCard } from "./public-project-card";

type SavedProjectsViewProps = {
  profile: {
    avatarUrl: string | null;
    displayName: string;
    isPublic: boolean;
    username: string;
  };
  projects: ResolvedDiscoverableProject[];
};

export function SavedProjectsView({ profile, projects }: SavedProjectsViewProps) {
  return (
    <main className="flex-1" id="main-content">
      <Container className="py-10 sm:py-12 lg:py-16">
        <div className="grid gap-8 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10">
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <DashboardNavigation active="saved" profile={profile} />
          </aside>

          <div className="min-w-0">
            <header className="border-b border-[#ded3c7] pb-8">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8a6a52]">
                Project workspace
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-[#3b2f27] sm:text-5xl">
                Saved projects
              </h1>
            </header>

            {projects.length > 0 ? (
              <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {projects.map((project) => (
                  <PublicProjectCard key={project.id} project={project} />
                ))}
              </div>
            ) : (
              <section
                aria-labelledby="saved-empty-title"
                className="mt-8 rounded-2xl border border-[#ded3c7] bg-[#fcfaf5] p-6 shadow-[0_16px_45px_rgba(59,47,39,0.06)] sm:p-8"
              >
                <h2
                  className="text-xl font-semibold tracking-[-0.035em] text-[#3b2f27]"
                  id="saved-empty-title"
                >
                  No saved projects yet.
                </h2>
                <p className="mt-3 text-sm leading-6 text-[#75685d]">
                  Save useful community projects and they will appear here.
                </p>
                <Link
                  className="mt-5 inline-flex rounded-xl bg-[#3b2f27] px-4 py-3 text-sm font-semibold text-[#fcfaf5] transition-colors hover:bg-[#5b4636] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a6a52]"
                  href="/projects"
                >
                  Explore projects
                </Link>
              </section>
            )}
          </div>
        </div>
      </Container>
    </main>
  );
}
