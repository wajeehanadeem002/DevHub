import { CompassIcon, LayersIcon, NetworkIcon, UserIcon } from "@/components/ui/icons";
import { Container } from "@/components/ui/container";

import { SectionHeading } from "./section-heading";

const steps = [
  {
    description: "Build a developer profile that represents your skills and experience.",
    icon: UserIcon,
    number: "01",
    title: "Create Your Profile",
  },
  {
    description: "Add your best projects, technologies, and achievements.",
    icon: LayersIcon,
    number: "02",
    title: "Showcase Your Work",
  },
  {
    description: "Explore developers and projects from the community.",
    icon: CompassIcon,
    number: "03",
    title: "Discover Builders",
  },
  {
    description: "Follow developers, save projects, and grow your network.",
    icon: NetworkIcon,
    number: "04",
    title: "Connect",
  },
] as const;

export function HowItWorks() {
  return (
    <section aria-labelledby="how-it-works-heading" className="py-24 sm:py-28" id="how-it-works">
      <Container>
        <SectionHeading
          align="center"
          id="how-it-works-heading"
          subtitle="A focused place to present your craft and discover the people behind great work."
          title="How DevHub Works"
        />
        <div className="relative mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <div aria-hidden="true" className="absolute left-[12.5%] right-[12.5%] top-10 hidden border-t border-dashed border-[#d8c3a8] xl:block" />
          {steps.map((step) => {
            const StepIcon = step.icon;

            return (
              <article className="relative rounded-xl border border-[#ded3c7] bg-[#fcfaf5] p-6 xl:border-transparent xl:bg-transparent xl:px-4 xl:text-center" key={step.number}>
                <div className="relative z-10 flex items-center justify-between xl:mx-auto xl:h-20 xl:w-20 xl:justify-center xl:rounded-2xl xl:border xl:border-[#ded3c7] xl:bg-[#fcfaf5] xl:shadow-[0_14px_35px_rgba(59,47,39,0.07)]">
                  <span className="grid h-10 w-10 place-items-center rounded-lg border border-[#ded3c7] bg-[#e9ded0] text-[#8a6a52] xl:h-12 xl:w-12">
                    <StepIcon className="h-5 w-5" />
                  </span>
                  <span className="font-mono text-xs font-semibold text-[#8a6a52] xl:absolute xl:-right-7 xl:top-1">{step.number}</span>
                </div>
                <h3 className="mt-6 text-base font-semibold text-[#3b2f27]">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#75685d]">{step.description}</p>
              </article>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
