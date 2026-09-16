import Image from "next/image";
import Link from "next/link";

import { ProjectCover, type ProjectCoverImage } from "./project-cover";
import type { PublicProjectSummary } from "./public-project";

export type PublicProjectCardProject = Omit<
  PublicProjectSummary,
  "coverImage"
> & {
  coverImage: ProjectCoverImage | null;
  coverImageUrl: string | null;
  like_count?: number;
  owner?: {
    avatarUrl: string | null;
    display_name: string;
    username: string;
  };
};

type PublicProjectCardProps = {
  project: PublicProjectCardProject;
};

export function PublicProjectCard({ project }: PublicProjectCardProps) {
  const titleId = `public-project-${project.id}-title`;

  return (
    <Link
      aria-label={`View ${project.title}`}
      className="block h-full rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#8a6a52]"
      href={`/projects/${project.id}`}
    >
      <article
        aria-labelledby={titleId}
        className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-[#ded3c7] bg-[#fcfaf5] shadow-[0_16px_45px_rgba(59,47,39,0.06)] transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-[#d8c3a8] hover:shadow-[0_20px_52px_rgba(59,47,39,0.1)] motion-reduce:transform-none motion-reduce:transition-none"
      >
        <ProjectCover
          image={project.coverImage}
          imageUrl={project.coverImageUrl}
          title={project.title}
        />

        <div className="flex flex-1 flex-col p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8a6a52]">
            {project.category?.name ?? "Uncategorized"}
          </p>
          <h3
            className="mt-2 break-words text-xl font-semibold tracking-[-0.035em] text-[#3b2f27]"
            id={titleId}
          >
            {project.title}
          </h3>
          <p className="mt-3 text-sm leading-6 text-[#75685d]">
            {project.summary}
          </p>

          {project.technologies.length > 0 ? (
            <ul
              aria-label={`${project.title} technologies`}
              className="flex flex-wrap gap-2 pt-5"
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
          ) : null}

          {project.owner ? (
            <div className="mt-auto flex items-center justify-between gap-4 border-t border-[#e7ddd2] pt-5 text-xs text-[#75685d]">
              <div className="flex min-w-0 items-center gap-2.5">
                {project.owner.avatarUrl ? (
                  <Image
                    alt=""
                    className="size-8 shrink-0 rounded-full object-cover"
                    height={32}
                    src={project.owner.avatarUrl}
                    width={32}
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="grid size-8 shrink-0 place-items-center rounded-full bg-[#e9ded0] font-bold text-[#3b2f27]"
                  >
                    {project.owner.display_name.charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-[#3b2f27]">
                    {project.owner.display_name}
                  </span>
                  <span className="block truncate">
                    @{project.owner.username}
                  </span>
                </span>
              </div>
              {typeof project.like_count === "number" ? (
                <span className="shrink-0 font-semibold text-[#6d513d]">
                  {project.like_count} {project.like_count === 1 ? "like" : "likes"}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </article>
    </Link>
  );
}
