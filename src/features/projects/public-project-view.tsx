import Image from "next/image";
import Link from "next/link";

import { Container } from "@/components/ui/container";
import { ProfileAvatar } from "@/features/profile/profile-avatar";

import { ProjectCover, type ProjectCoverImage } from "./project-cover";
import type { ProjectEngagementState } from "./project-engagement";
import { ProjectEngagementControls } from "./project-engagement-controls";
import type { PublicProject, PublicProjectOwner } from "./public-project";

export type ResolvedPublicProjectImage = ProjectCoverImage & {
  publicUrl: string | null;
};

export type ResolvedPublicProjectOwner = Omit<
  PublicProjectOwner,
  "avatar_path"
> & {
  avatarUrl: string | null;
};

export type ResolvedPublicProject = Omit<
  PublicProject,
  "images" | "owner" | "owner_id"
> & {
  images: ResolvedPublicProjectImage[];
  owner: ResolvedPublicProjectOwner;
};

type PublicProjectViewProps = {
  engagement: ProjectEngagementState;
  project: ResolvedPublicProject;
};

const externalLinkClassName =
  "inline-flex min-h-11 items-center justify-center rounded-xl border border-[#d8c3a8] bg-[#fcfaf5] px-4 text-sm font-semibold text-[#594b41] transition-colors hover:border-[#8a6a52] hover:bg-[#e9ded0] hover:text-[#3b2f27] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a6a52]";

const publicationDateFormatter = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
  year: "numeric",
});

function formatPublicationDate(value: string | null) {
  return value
    ? publicationDateFormatter.format(new Date(value))
    : "Recently published";
}

export function PublicProjectView({ engagement, project }: PublicProjectViewProps) {
  const cover = project.images[0] ?? null;
  const gallery = project.images.slice(1).filter((image) => image.publicUrl);

  return (
    <main className="min-w-0 flex-1 overflow-x-clip" id="main-content">
      <Container className="py-10 sm:py-14 lg:py-18">
        <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1.55fr)_minmax(17rem,0.65fr)] lg:gap-10">
          <article className="min-w-0">
            <div className="overflow-hidden rounded-3xl border border-[#ded3c7] bg-[#e9ded0] shadow-[0_24px_70px_rgba(59,47,39,0.09)]">
              {cover?.publicUrl ? (
                <Image
                  alt={cover.alt_text}
                  className="aspect-[16/9] h-auto w-full object-cover"
                  height={cover.height}
                  sizes="(min-width: 1280px) 820px, (min-width: 1024px) 65vw, 100vw"
                  src={cover.publicUrl}
                  width={cover.width}
                />
              ) : (
                <ProjectCover image={null} imageUrl={null} title={project.title} />
              )}
            </div>

            <header className="pt-8 sm:pt-10">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8a6a52]">
                {project.category?.name ?? "Project"}
              </p>
              <h1 className="mt-3 break-words text-4xl font-semibold tracking-[-0.05em] text-[#3b2f27] sm:text-5xl lg:text-6xl">
                {project.title}
              </h1>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-[#6d513d] sm:text-xl">
                {project.summary}
              </p>
            </header>

            <section
              aria-labelledby="project-about-title"
              className="mt-10 border-t border-[#ded3c7] pt-8"
            >
              <h2
                className="text-2xl font-semibold tracking-[-0.035em] text-[#3b2f27]"
                id="project-about-title"
              >
                About this project
              </h2>
              <p className="mt-4 whitespace-pre-line text-base leading-8 text-[#75685d]">
                {project.description}
              </p>
            </section>

            {gallery.length > 0 ? (
              <section
                aria-labelledby="project-gallery-title"
                className="mt-10 border-t border-[#ded3c7] pt-8"
              >
                <h2
                  className="text-2xl font-semibold tracking-[-0.035em] text-[#3b2f27]"
                  id="project-gallery-title"
                >
                  Gallery
                </h2>
                <ul
                  aria-label="Project gallery"
                  className="mt-5 grid gap-5 sm:grid-cols-2"
                >
                  {gallery.map((image) => (
                    <li
                      className="min-w-0 overflow-hidden rounded-2xl border border-[#ded3c7] bg-[#e9ded0]"
                      key={image.id}
                    >
                      <Image
                        alt={image.alt_text}
                        className="aspect-[16/10] h-auto w-full object-cover"
                        height={image.height}
                        sizes="(min-width: 1024px) 32vw, (min-width: 640px) 50vw, 100vw"
                        src={image.publicUrl!}
                        width={image.width}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </article>

          <aside className="min-w-0 lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-2xl border border-[#ded3c7] bg-[#fcfaf5] p-5 shadow-[0_16px_45px_rgba(59,47,39,0.06)] sm:p-6">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8a6a52]">
                Created by
              </p>
              <Link
                aria-label={`View ${project.owner.display_name}'s profile`}
                className="mt-4 flex items-center gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#8a6a52]"
                href={`/developers/${project.owner.username}`}
              >
                <ProfileAvatar
                  avatarUrl={project.owner.avatarUrl}
                  displayName={project.owner.display_name}
                  size="sm"
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-[#3b2f27]">
                    {project.owner.display_name}
                  </span>
                  <span className="block truncate text-xs text-[#8a6a52]">
                    @{project.owner.username}
                  </span>
                </span>
              </Link>
              {project.owner.headline ? (
                <p className="mt-4 text-sm leading-6 text-[#75685d]">
                  {project.owner.headline}
                </p>
              ) : null}

              <dl className="mt-6 space-y-5 border-t border-[#ded3c7] pt-6">
                <div>
                  <dt className="text-xs font-bold uppercase tracking-[0.14em] text-[#8a6a52]">
                    Category
                  </dt>
                  <dd className="mt-2 text-sm font-semibold text-[#594b41]">
                    {project.category?.name ?? "Uncategorized"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-[0.14em] text-[#8a6a52]">
                    Published
                  </dt>
                  <dd className="mt-2 text-sm text-[#75685d]">
                    <time dateTime={project.published_at ?? undefined}>
                      {formatPublicationDate(project.published_at)}
                    </time>
                  </dd>
                </div>
              </dl>

              {project.technologies.length > 0 ? (
                <div className="mt-6 border-t border-[#ded3c7] pt-6">
                  <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-[#8a6a52]">
                    Technologies
                  </h2>
                  <ul
                    aria-label={`${project.title} technologies`}
                    className="mt-3 flex flex-wrap gap-2"
                  >
                    {project.technologies.map((technology) => (
                      <li
                        className="rounded-full border border-[#ded3c7] bg-[#f9f5ee] px-2.5 py-1 text-xs font-semibold text-[#6d513d]"
                        key={technology.id}
                      >
                        {technology.name}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="mt-6 border-t border-[#ded3c7] pt-6">
                <ProjectEngagementControls
                  initialLikeCount={project.like_count}
                  initialLiked={engagement.liked}
                  initialSaved={engagement.saved}
                  isOwner={engagement.isOwner}
                  isSignedIn={engagement.isSignedIn}
                  projectId={project.id}
                />
              </div>

              {project.demo_url || project.repository_url ? (
                <div className="mt-6 flex flex-col gap-2 border-t border-[#ded3c7] pt-6 sm:flex-row sm:flex-wrap lg:flex-col">
                  {project.demo_url ? (
                    <a
                      className={externalLinkClassName}
                      href={project.demo_url}
                      rel="nofollow noopener noreferrer"
                      target="_blank"
                    >
                      Live demo
                      <span aria-hidden="true" className="ml-2">↗</span>
                    </a>
                  ) : null}
                  {project.repository_url ? (
                    <a
                      className={externalLinkClassName}
                      href={project.repository_url}
                      rel="nofollow noopener noreferrer"
                      target="_blank"
                    >
                      Repository
                      <span aria-hidden="true" className="ml-2">↗</span>
                    </a>
                  ) : null}
                </div>
              ) : null}
            </div>
          </aside>
        </div>
      </Container>
    </main>
  );
}
