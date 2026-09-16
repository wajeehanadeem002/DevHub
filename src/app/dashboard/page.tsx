import Link from "next/link";

import { Container } from "@/components/ui/container";
import { CheckIcon, CodeIcon } from "@/components/ui/icons";
import { getAvatarPublicUrl } from "@/features/profile/avatar-storage";
import { DashboardNavigation } from "@/features/profile/dashboard-navigation";
import { requireProfile } from "@/lib/auth/require-profile";

export default async function DashboardPage() {
  const { profile } = await requireProfile();
  const firstName =
    profile.display_name.trim().split(/\s+/)[0] || profile.display_name;
  const headline = profile.headline ?? "Developer profile";
  const avatarUrl = await getAvatarPublicUrl(profile.avatar_path);

  return (
    <main className="flex-1" id="main-content">
      <Container className="py-10 sm:py-12 lg:py-16">
        <div className="grid gap-8 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10">
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <DashboardNavigation
              active="overview"
              profile={{
                avatarUrl,
                displayName: profile.display_name,
                isPublic: profile.is_public,
                username: profile.username,
              }}
            />
          </aside>

          <div className="min-w-0">
            <header className="flex flex-col gap-5 border-b border-[#ded3c7] pb-8 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8a6a52]">
                  Dashboard
                </p>
                <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-[#3b2f27] sm:text-5xl">
                  Welcome, {firstName}.
                </h1>
                <p className="mt-3 text-base text-[#75685d]">{headline}</p>
              </div>
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#d8c3a8] bg-[#fcfaf5] px-3 py-2 text-xs font-semibold text-[#6d513d]">
                <span className="size-2 rounded-full bg-[#8a6a52]" />
                Profile ready
              </div>
            </header>

            <section
              aria-labelledby="profile-status-title"
              className="mt-8 rounded-2xl border border-[#ded3c7] bg-[#fcfaf5] p-6 shadow-[0_18px_48px_rgba(59,47,39,0.06)] sm:p-8"
            >
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8a6a52]">
                    Account status
                  </p>
                  <h2
                    className="mt-3 text-2xl font-semibold tracking-[-0.035em] text-[#3b2f27]"
                    id="profile-status-title"
                  >
                    Your developer identity is set
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-[#75685d]">
                    Your profile is securely connected to your Clerk account.
                    Keep your public identity, links, technologies, and avatar
                    current from profile settings.
                  </p>
                  <Link
                    className="mt-5 inline-flex h-10 items-center rounded-lg bg-[#8a6a52] px-4 text-sm font-semibold text-[#fcfaf5] transition-colors hover:bg-[#3b2f27] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a6a52]"
                    href="/dashboard/profile"
                  >
                    Manage profile
                  </Link>
                </div>
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#e9ded0] text-[#8a6a52]">
                  <CheckIcon className="size-5" />
                </span>
              </div>
            </section>

            <section
              aria-labelledby="project-workspace-title"
              className="mt-6 rounded-2xl border border-dashed border-[#d8c3a8] bg-[#f9f5ee] px-6 py-12 text-center sm:px-10 sm:py-16"
            >
              <span className="mx-auto grid size-12 place-items-center rounded-xl border border-[#ded3c7] bg-[#fcfaf5] text-[#8a6a52] shadow-[0_10px_25px_rgba(59,47,39,0.06)]">
                <CodeIcon className="size-5" />
              </span>
              <h2
                className="mt-5 text-2xl font-semibold tracking-[-0.035em] text-[#3b2f27]"
                id="project-workspace-title"
              >
                Project workspace
              </h2>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[#75685d]">
                Create drafts, organize the technologies behind your work, and
                publish projects to your developer portfolio.
              </p>
              <Link
                className="mt-6 inline-flex h-10 items-center rounded-lg bg-[#8a6a52] px-4 text-sm font-semibold text-[#fcfaf5] transition-colors hover:bg-[#3b2f27] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a6a52]"
                href="/dashboard/projects"
              >
                Open project workspace
              </Link>
            </section>
          </div>
        </div>
      </Container>
    </main>
  );
}
