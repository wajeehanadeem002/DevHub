import Link from "next/link";

import type { CurrentProject } from "./project-data";
import { ProjectCover } from "./project-cover";

export type DashboardProject = CurrentProject & {
  coverImageUrl: string | null;
};

type DashboardProjectListProps = {
  projects: DashboardProject[];
};

const linkClassName =
  "inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a6a52]";

const updatedDateFormatter = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
  year: "numeric",
});

function formatUpdatedDate(value: string) {
  return updatedDateFormatter.format(new Date(value));
}

export function DashboardProjectList({ projects }: DashboardProjectListProps) {
  if (projects.length === 0) {
    return (
      <section
        aria-labelledby="empty-projects-title"
        className="rounded-2xl border border-dashed border-[#d8c3a8] bg-[#f9f5ee] px-6 py-12 text-center sm:px-10 sm:py-16"
      >
        <h2
          className="text-2xl font-semibold tracking-[-0.035em] text-[#3b2f27]"
          id="empty-projects-title"
        >
          No projects yet
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#75685d]">
          Start with a draft, then shape the details, technologies, and images
          before you publish.
        </p>
        <Link
          className={`${linkClassName} mt-6 bg-[#8a6a52] text-[#fcfaf5] hover:bg-[#3b2f27]`}
          href="/dashboard/projects/new"
        >
          Create project
        </Link>
      </section>
    );
  }

  return (
    <section aria-labelledby="project-list-title">
      <div className="flex items-center justify-between gap-4">
        <h2
          className="text-xl font-semibold tracking-[-0.03em] text-[#3b2f27]"
          id="project-list-title"
        >
          Project library
        </h2>
        <Link
          className={`${linkClassName} bg-[#8a6a52] text-[#fcfaf5] hover:bg-[#3b2f27]`}
          href="/dashboard/projects/new"
        >
          Create project
        </Link>
      </div>

      <ul className="mt-6 grid items-stretch gap-5 sm:grid-cols-2">
        {projects.map((project) => (
          <li className="h-full" key={project.id}>
            <article
              aria-label={project.title}
              className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-[#ded3c7] bg-[#fcfaf5] shadow-[0_16px_45px_rgba(59,47,39,0.06)]"
            >
              <ProjectCover
                image={project.coverImage}
                imageUrl={project.coverImageUrl}
                title={project.title}
              />

              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8a6a52]">
                      {project.category?.name ?? "Uncategorized"}
                    </p>
                    <h3 className="mt-2 text-xl font-semibold tracking-[-0.035em] text-[#3b2f27]">
                      {project.title}
                    </h3>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.1em] ${
                      project.status === "published"
                        ? "bg-[#d8c3a8] text-[#3b2f27]"
                        : "bg-[#e9ded0] text-[#6d513d]"
                    }`}
                  >
                    {project.status === "published" ? "Published" : "Draft"}
                  </span>
                </div>

                <p className="mt-3 text-sm leading-6 text-[#75685d]">
                  {project.summary}
                </p>

                {project.technologies.length > 0 ? (
                  <ul aria-label={`${project.title} technologies`} className="mt-4 flex flex-wrap gap-2">
                    {project.technologies.map((technology) => (
                      <li
                        className="rounded-full border border-[#ded3c7] bg-[#f9f5ee] px-2.5 py-1 text-xs font-semibold text-[#6d513d]"
                        key={technology.id}
                      >
                        {technology.name}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-xs text-[#8f8176]">
                    No technologies selected
                  </p>
                )}

                <time
                  className="mt-5 text-xs text-[#8f8176]"
                  dateTime={project.updated_at}
                >
                  Updated {formatUpdatedDate(project.updated_at)}
                </time>

                <div className="mt-auto flex flex-wrap gap-2 border-t border-[#ded3c7] pt-5">
                  <Link
                    className={`${linkClassName} border border-[#d8c3a8] text-[#6d513d] hover:bg-[#f3ece2]`}
                    href={`/dashboard/projects/${project.id}/edit`}
                  >
                    Edit
                  </Link>
                  {project.status === "published" ? (
                    <Link
                      className={`${linkClassName} bg-[#3b2f27] text-[#fcfaf5] hover:bg-[#8a6a52]`}
                      href={`/projects/${project.id}`}
                    >
                      View project
                    </Link>
                  ) : null}
                </div>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}
