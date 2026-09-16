import type { Metadata } from "next";

import { getProjectDiscovery } from "@/features/projects/project-discovery";
import { resolveDiscoverableProjects } from "@/features/projects/project-discovery-card-data";
import {
  parseProjectDiscoveryFilters,
  type ProjectDiscoverySearchParams,
} from "@/features/projects/project-discovery-input";
import { ProjectDiscoveryView } from "@/features/projects/project-discovery-view";

type ProjectsPageProps = {
  searchParams: Promise<ProjectDiscoverySearchParams>;
};

export const metadata: Metadata = {
  description:
    "Explore published developer projects, technologies, and builders on DevHub.",
  title: "Projects",
};

export default async function ProjectsPage({
  searchParams,
}: ProjectsPageProps) {
  const filters = parseProjectDiscoveryFilters(await searchParams);
  const result = await getProjectDiscovery(filters);
  const projects = await resolveDiscoverableProjects(result.projects);

  return <ProjectDiscoveryView projects={projects} result={result} />;
}
