import { redirect } from "next/navigation";

import { Container } from "@/components/ui/container";
import { getCurrentProfile } from "@/features/profile/current-profile";
import { OnboardingForm } from "@/features/profile/onboarding-form";

export default async function OnboardingPage() {
  const { profile } = await getCurrentProfile();

  if (profile) {
    redirect("/dashboard");
  }

  return (
    <main className="relative flex-1 overflow-hidden" id="main-content">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-80 w-[46rem] -translate-x-1/2 rounded-full bg-[#d8c3a8]/20 blur-3xl"
      />
      <Container className="relative py-12 sm:py-16 lg:py-20">
        <section
          aria-labelledby="onboarding-title"
          className="grid items-start gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:gap-16"
        >
          <div className="pt-2 lg:sticky lg:top-28">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#8a6a52]">
              Developer onboarding
            </p>
            <h1
              className="mt-5 max-w-lg text-4xl font-semibold tracking-[-0.055em] text-[#3b2f27] sm:text-5xl"
              id="onboarding-title"
            >
              Create your DevHub profile
            </h1>
            <p className="mt-5 max-w-md text-base leading-7 text-[#75685d] sm:text-lg">
              Introduce yourself to the developer community with a focused,
              professional profile.
            </p>

            <ol className="mt-9 space-y-5" aria-label="Profile setup progress">
              <li className="flex items-center gap-4 text-sm font-semibold text-[#3b2f27]">
                <span className="grid size-8 place-items-center rounded-full bg-[#3b2f27] text-xs text-[#fcfaf5]">
                  01
                </span>
                Profile basics
              </li>
              <li className="flex items-center gap-4 text-sm text-[#75685d]">
                <span className="grid size-8 place-items-center rounded-full border border-[#ded3c7] bg-[#fcfaf5] text-xs">
                  02
                </span>
                Showcase projects
                <span className="rounded-full bg-[#e9ded0] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#8a6a52]">
                  Next
                </span>
              </li>
            </ol>
          </div>

          <div className="rounded-2xl border border-[#ded3c7] bg-[#fcfaf5] p-6 shadow-[0_24px_70px_rgba(59,47,39,0.08)] sm:p-8 lg:p-10">
            <div className="border-b border-[#ded3c7] pb-6">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8a6a52]">
                Profile basics
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.035em] text-[#3b2f27]">
                Tell the community who you are
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#75685d]">
                Start with the essentials. Profile links and technologies can
                be added when profile editing is introduced.
              </p>
            </div>
            <OnboardingForm />
          </div>
        </section>
      </Container>
    </main>
  );
}
