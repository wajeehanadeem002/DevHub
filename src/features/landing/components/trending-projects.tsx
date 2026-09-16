import Link from "next/link";

import { Container } from "@/components/ui/container";
import type { ResolvedDiscoverableProject } from "@/features/projects/project-discovery-card-data";
import { PublicProjectCard } from "@/features/projects/public-project-card";

import { SectionHeading } from "./section-heading";

type TrendingProjectsProps = {
  projects: ResolvedDiscoverableProject[];
};

export function TrendingProjects({ projects }: TrendingProjectsProps) {
  return (
    <section
      aria-labelledby="trending-projects-heading"
      className="border-y border-[#ded3c7] bg-[#e9ded0]/45 py-24 sm:py-28"
      id="trending-projects"
    >
      <Container>
        <SectionHeading
          id="trending-projects-heading"
          subtitle="Discover what developers are building."
          title="Trending Projects"
        />
        <div className="mt-10">
          {projects.length > 0 ? (
            <div className="grid items-stretch gap-5 md:grid-cols-2 xl:grid-cols-4">
              {projects.map((project) => (
                <PublicProjectCard key={project.id} project={project} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#c9ad8e] bg-[#fcfaf5]/65 px-6 py-12 text-center text-sm text-[#75685d]">
              Published community projects will appear here.
            </div>
          )}
          <div className="mt-8 flex justify-center">
            <Link
              className="inline-flex rounded-xl border border-[#8a6a52] px-5 py-3 text-sm font-semibold text-[#6d513d] transition-[background-color,color] hover:bg-[#8a6a52] hover:text-[#fcfaf5] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#8a6a52]"
              href="/projects"
            >
              Explore all projects
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
