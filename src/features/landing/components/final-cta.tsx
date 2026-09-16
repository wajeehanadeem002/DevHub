import Link from "next/link";

import { ArrowRightIcon, CheckIcon } from "@/components/ui/icons";
import { Container } from "@/components/ui/container";

export function FinalCta() {
  return (
    <section aria-labelledby="final-cta-heading" className="relative overflow-hidden py-24 sm:py-32" id="final-cta">
      <Container>
        <div className="relative overflow-hidden rounded-2xl border border-[#8a6a52]/55 bg-[#3b2f27] px-6 py-14 text-center shadow-[0_30px_100px_rgba(59,47,39,0.18),0_0_80px_rgba(216,195,168,0.1)] sm:px-10 sm:py-20">
          <div aria-hidden="true" className="absolute left-1/2 top-[-14rem] h-[28rem] w-[38rem] -translate-x-1/2 rounded-full bg-[#d8c3a8]/20 blur-[100px]" />
          <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(rgba(252,250,245,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(252,250,245,0.035)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:linear-gradient(to_bottom,black,transparent_80%)]" />
          <div className="relative mx-auto max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d8c3a8]">Start building your presence</p>
            <h2 className="mt-5 text-balance text-3xl font-semibold leading-tight tracking-[-0.042em] text-[#fcfaf5] sm:text-5xl" id="final-cta-heading">
              Your next opportunity might start with your next project.
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-7 text-[#e9ded0] sm:text-lg">
              Build your profile, showcase your work, and connect with developers who are building the future.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4">
              <Link className="group inline-flex h-11 items-center gap-2 rounded-lg bg-[#fcfaf5] px-5 text-sm font-semibold text-[#3b2f27] shadow-[0_12px_34px_rgba(25,18,14,0.18)] transition-[background-color,transform,box-shadow] hover:-translate-y-0.5 hover:bg-[#e9ded0] hover:shadow-[0_16px_40px_rgba(25,18,14,0.22)] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#d8c3a8] motion-reduce:transform-none" href="#main-content">
                Create Your Profile
                <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none" />
              </Link>
              <p className="inline-flex items-center gap-2 text-xs text-[#d8c3a8]">
                <CheckIcon className="h-4 w-4 text-[#d8c3a8]" />
                No complicated setup. Just build and share.
              </p>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
