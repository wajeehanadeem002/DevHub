import { DeveloperDiscovery } from "@/features/landing/components/developer-discovery";
import { FinalCta } from "@/features/landing/components/final-cta";
import { Hero } from "@/features/landing/components/hero";
import { HowItWorks } from "@/features/landing/components/how-it-works";
import { ProfilePreview } from "@/features/landing/components/profile-preview";
import { TechnologyExplorer } from "@/features/landing/components/technology-explorer";
import { TrendingProjects } from "@/features/landing/components/trending-projects";
import { getTrendingProjects } from "@/features/projects/project-discovery";
import { resolveDiscoverableProjects } from "@/features/projects/project-discovery-card-data";

export default async function HomePage() {
  const projects = await resolveDiscoverableProjects(
    await getTrendingProjects(4),
  );

  return (
    <main className="overflow-hidden" id="main-content">
      <Hero />
      <TrendingProjects projects={projects} />
      <DeveloperDiscovery />
      <TechnologyExplorer />
      <HowItWorks />
      <ProfilePreview />
      <FinalCta />
    </main>
  );
}
