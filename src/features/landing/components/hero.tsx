import Link from "next/link";

import { ArrowRightIcon } from "@/components/ui/icons";
import { Container } from "@/components/ui/container";

import { HeroProfilePreview } from "./hero-profile-preview";

const stats = [
  { label: "Developers", value: "10K+" },
  { label: "Projects", value: "25K+" },
  { label: "Technologies", value: "50+" },
] as const;

export function Hero() {
  return (
    <section className="relative overflow-hidden pb-24 pt-20 sm:pb-28 sm:pt-24 lg:pb-32 lg:pt-28">
      <div aria-hidden="true" className="pointer-events-none absolute left-[-12rem] top-[-8rem] h-[34rem] w-[34rem] rounded-full bg-[#d8c3a8]/20 blur-[110px]" />
      <div aria-hidden="true" className="pointer-events-none absolute right-[-15rem] top-20 h-[36rem] w-[36rem] rounded-full bg-[#e9ded0]/45 blur-[120px]" />
      <Container className="relative grid items-center gap-16 lg:grid-cols-[0.9fr_1.1fr] lg:gap-10 xl:gap-16">
        <div className="max-w-[610px]">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#ded3c7] bg-[#e9ded0] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8a6a52]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#8a6a52] shadow-[0_0_12px_rgba(138,106,82,0.28)]" />
            The community for builders
          </div>
          <h1 className="mt-7 text-balance text-[3.45rem] font-semibold leading-[0.98] tracking-[-0.058em] text-[#3b2f27] sm:text-[4.65rem] lg:text-[4.35rem] xl:text-[5rem]">
            Build. Showcase. <span className="text-[#8a6a52]">Connect.</span>
          </h1>
          <p className="mt-7 max-w-xl text-pretty text-base leading-7 text-[#75685d] sm:text-lg sm:leading-8">
            A community for developers to showcase their work, discover talented builders, and connect through the projects they create.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link className="group inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#8a6a52] px-5 text-sm font-semibold text-[#fcfaf5] shadow-[0_12px_34px_rgba(59,47,39,0.14)] transition-[background-color,transform,box-shadow] hover:-translate-y-0.5 hover:bg-[#3b2f27] hover:shadow-[0_16px_40px_rgba(59,47,39,0.18)] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#8a6a52] motion-reduce:transform-none" href="#developers">
              Explore Developers
              <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none" />
            </Link>
            <Link className="inline-flex h-11 items-center justify-center rounded-lg border border-[#8a6a52] bg-[#fcfaf5] px-5 text-sm font-semibold text-[#8a6a52] transition-[border-color,background-color,transform] hover:-translate-y-0.5 hover:border-[#3b2f27] hover:bg-[#f6f1e8] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#8a6a52] motion-reduce:transform-none" href="#final-cta">
              Showcase Your Work
            </Link>
          </div>
          <dl className="mt-11 grid max-w-lg grid-cols-3 divide-x divide-[#ded3c7] border-t border-[#ded3c7] pt-6">
            {stats.map((stat, index) => (
              <div className={index === 0 ? "pr-5" : "px-5"} key={stat.label}>
                <dd className="text-lg font-semibold tracking-[-0.025em] text-[#3b2f27] sm:text-xl">{stat.value}</dd>
                <dt className="mt-1 text-[11px] text-[#75685d] sm:text-xs">{stat.label}</dt>
              </div>
            ))}
          </dl>
        </div>
        <HeroProfilePreview />
      </Container>
    </section>
  );
}
