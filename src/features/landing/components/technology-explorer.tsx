import Link from "next/link";

import { Container } from "@/components/ui/container";

import { technologies } from "../data";
import { SectionHeading } from "./section-heading";

export function TechnologyExplorer() {
  return (
    <section
      aria-labelledby="technologies-heading"
      className="border-y border-[#ded3c7] bg-[#e9ded0]/45 py-24 sm:py-28"
      id="technologies"
    >
      <Container>
        <SectionHeading
          align="center"
          id="technologies-heading"
          subtitle="Find developers and projects built with the technologies you love."
          title="Explore by Technology"
        />
        <div className="mx-auto mt-10 grid max-w-5xl grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {technologies.map((technology) => (
            <Link
              className="group flex min-h-16 items-center gap-3 rounded-xl border border-[#ded3c7] bg-[#fcfaf5] px-4 text-sm font-medium text-[#3b2f27] shadow-[0_12px_30px_rgba(59,47,39,0.05)] transition-[border-color,background-color,color,transform] hover:-translate-y-0.5 hover:border-[#d8c3a8] hover:bg-[#f6f1e8] hover:text-[#8a6a52] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#8a6a52] motion-reduce:transform-none"
              href="#trending-projects"
              key={technology.name}
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[#ded3c7] bg-[#e9ded0] font-mono text-[10px] font-semibold text-[#8a6a52] transition-colors group-hover:border-[#d8c3a8] group-hover:bg-[#d8c3a8]">
                {technology.mark}
              </span>
              <span>{technology.name}</span>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}
