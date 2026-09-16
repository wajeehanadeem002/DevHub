import { Container } from "@/components/ui/container";
import { CodeIcon } from "@/components/ui/icons";
import {
  PublicProjectCard,
  type PublicProjectCardProject,
} from "@/features/projects/public-project-card";

import { ProfileAvatar } from "./profile-avatar";
import type { PublicProfileDetails } from "./public-profile";

type PublicProfileViewProps = {
  avatarUrl: string | null;
  profile: PublicProfileDetails;
  projects: PublicProjectCardProject[];
};

export function PublicProfileView({
  avatarUrl,
  profile,
  projects,
}: PublicProfileViewProps) {
  const links = [
    { href: profile.website_url, label: "Website" },
    { href: profile.github_url, label: "GitHub" },
    { href: profile.linkedin_url, label: "LinkedIn" },
  ].filter((link): link is { href: string; label: string } => Boolean(link.href));

  return (
    <main className="flex-1" id="main-content">
      <div className="relative overflow-hidden border-b border-[#ded3c7]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-0 h-72 w-[48rem] -translate-x-1/2 rounded-full bg-[#d8c3a8]/25 blur-3xl"
        />
        <Container className="relative py-14 sm:py-18 lg:py-22">
          <section
            aria-labelledby="developer-name"
            className="rounded-3xl border border-[#ded3c7] bg-[#fcfaf5] p-6 shadow-[0_24px_70px_rgba(59,47,39,0.08)] sm:p-9 lg:p-12"
          >
            <div className="flex flex-col gap-7 md:flex-row md:items-start">
              <ProfileAvatar
                avatarUrl={avatarUrl}
                displayName={profile.display_name}
                priority
                size="lg"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[#8a6a52]">
                  @{profile.username}
                </p>
                <h1
                  className="mt-2 text-4xl font-semibold tracking-[-0.05em] text-[#3b2f27] sm:text-5xl"
                  id="developer-name"
                >
                  {profile.display_name}
                </h1>
                {profile.headline ? (
                  <p className="mt-3 text-lg font-medium text-[#6d513d] sm:text-xl">
                    {profile.headline}
                  </p>
                ) : null}
                {profile.location ? (
                  <p className="mt-4 flex items-center gap-2 text-sm text-[#75685d]">
                    <svg aria-hidden="true" className="size-4" fill="none" viewBox="0 0 24 24">
                      <path d="M20 10c0 5.5-8 11-8 11S4 15.5 4 10a8 8 0 1 1 16 0Z" stroke="currentColor" strokeWidth="1.6" />
                      <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.6" />
                    </svg>
                    {profile.location}
                  </p>
                ) : null}
              </div>
            </div>

            {profile.bio ? (
              <p className="mt-8 max-w-3xl whitespace-pre-line text-base leading-8 text-[#75685d]">
                {profile.bio}
              </p>
            ) : null}

            {profile.technologies.length > 0 ? (
              <div className="mt-8 border-t border-[#ded3c7] pt-7">
                <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-[#8a6a52]">
                  Technologies
                </h2>
                <div className="mt-4 flex flex-wrap gap-2.5">
                  {profile.technologies.map((technology) => (
                    <span
                      className="rounded-full border border-[#ded3c7] bg-[#f6f1e8] px-3.5 py-2 text-sm font-medium text-[#594b41]"
                      key={technology.id}
                    >
                      {technology.name}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {links.length > 0 ? (
              <div className="mt-7 flex flex-wrap gap-3 border-t border-[#ded3c7] pt-7">
                {links.map((link) => (
                  <a
                    aria-label={link.label}
                    className="inline-flex min-h-10 items-center rounded-xl border border-[#ded3c7] bg-[#f9f5ee] px-4 text-sm font-semibold text-[#594b41] transition-[border-color,background-color,color] hover:border-[#8a6a52] hover:bg-[#e9ded0] hover:text-[#3b2f27] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a6a52]"
                    href={link.href}
                    key={link.label}
                    rel="nofollow noopener noreferrer"
                    target="_blank"
                  >
                    {link.label}
                    <span aria-hidden="true" className="ml-2">↗</span>
                  </a>
                ))}
              </div>
            ) : null}
          </section>
        </Container>
      </div>

      <Container className="py-12 sm:py-16">
        <section aria-labelledby="developer-projects-title">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8a6a52]">
              Showcase
            </p>
            <h2
              className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#3b2f27]"
              id="developer-projects-title"
            >
              Projects
            </h2>
          </div>
          {projects.length > 0 ? (
            <ul
              aria-label="Published projects"
              className="mt-7 grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3"
            >
              {projects.map((project) => (
                <li className="h-full min-w-0" key={project.id}>
                  <PublicProjectCard project={project} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-7 rounded-2xl border border-dashed border-[#d8c3a8] bg-[#f9f5ee] px-6 py-12 text-center sm:py-16">
              <span className="mx-auto grid size-12 place-items-center rounded-xl border border-[#ded3c7] bg-[#fcfaf5] text-[#8a6a52] shadow-[0_10px_25px_rgba(59,47,39,0.06)]">
                <CodeIcon className="size-5" />
              </span>
              <p className="mt-5 text-lg font-semibold text-[#3b2f27]">
                No published projects yet.
              </p>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#75685d]">
                This developer has not published any projects yet.
              </p>
            </div>
          )}
        </section>
      </Container>
    </main>
  );
}
