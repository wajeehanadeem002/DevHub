import { Container } from "@/components/ui/container";

import { developers } from "../data";
import { DeveloperCard } from "./developer-card";
import { SectionHeading } from "./section-heading";

export function DeveloperDiscovery() {
  return (
    <section
      aria-labelledby="developers-heading"
      className="py-24 sm:py-28"
      id="developers"
    >
      <Container>
        <SectionHeading
          id="developers-heading"
          subtitle="Find talented builders by their skills, projects, and experience."
          title="Discover Developers"
        />
        <div className="mt-10 grid items-stretch gap-5 md:grid-cols-2 xl:grid-cols-4">
          {developers.map((developer) => (
            <DeveloperCard developer={developer} key={developer.username} />
          ))}
        </div>
      </Container>
    </section>
  );
}
