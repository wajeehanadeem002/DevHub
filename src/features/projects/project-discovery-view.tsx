import Link from "next/link";

import { Container } from "@/components/ui/container";

import type { ProjectDiscoveryResult } from "./project-discovery";
import type { ResolvedDiscoverableProject } from "./project-discovery-card-data";
import { buildProjectDiscoveryHref } from "./project-discovery-input";
import { PublicProjectCard } from "./public-project-card";

type ProjectDiscoveryViewProps = {
  projects: ResolvedDiscoverableProject[];
  result: ProjectDiscoveryResult;
};

const fieldClassName =
  "h-11 w-full rounded-xl border border-[#ded3c7] bg-[#fcfaf5] px-3.5 text-sm text-[#3b2f27] outline-none transition-[border-color,box-shadow] focus:border-[#8a6a52] focus:shadow-[0_0_0_3px_rgba(138,106,82,0.12)]";

export function ProjectDiscoveryView({
  projects,
  result,
}: ProjectDiscoveryViewProps) {
  const { categories, filters, pageCount, technologies, totalCount } = result;
  const hasFilters = Boolean(
    filters.q ||
      filters.category ||
      filters.technology ||
      filters.sort !== "newest",
  );

  return (
    <main className="flex-1" id="main-content">
      <section className="border-b border-[#ded3c7] py-14 sm:py-18">
        <Container>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8a6a52]">
            Project discovery
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-[#3b2f27] sm:text-5xl">
            Explore projects
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[#75685d]">
            Discover published work from the DevHub community and find the
            tools, ideas, and developers behind it.
          </p>

          <form
            action="/projects"
            className="mt-9 grid gap-4 rounded-2xl border border-[#ded3c7] bg-[#fcfaf5] p-5 shadow-[0_16px_45px_rgba(59,47,39,0.05)] md:grid-cols-2 xl:grid-cols-[minmax(240px,1.5fr)_1fr_1fr_0.8fr_auto]"
            method="get"
            role="search"
          >
            <label className="grid gap-2 text-xs font-semibold text-[#5e4b3e]">
              Search projects
              <input
                className={fieldClassName}
                defaultValue={filters.q}
                maxLength={100}
                name="q"
                placeholder="Search title, summary, or description"
                type="search"
              />
            </label>
            <label className="grid gap-2 text-xs font-semibold text-[#5e4b3e]">
              Category
              <select
                className={fieldClassName}
                defaultValue={filters.category ?? ""}
                name="category"
              >
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.slug}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-xs font-semibold text-[#5e4b3e]">
              Technology
              <select
                className={fieldClassName}
                defaultValue={filters.technology ?? ""}
                name="technology"
              >
                <option value="">All technologies</option>
                {technologies.map((technology) => (
                  <option key={technology.id} value={technology.slug}>
                    {technology.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-xs font-semibold text-[#5e4b3e]">
              Sort projects
              <select
                className={fieldClassName}
                defaultValue={filters.sort}
                name="sort"
              >
                <option value="newest">Newest</option>
                <option value="popular">Most liked</option>
              </select>
            </label>
            <button
              className="h-11 self-end rounded-xl bg-[#3b2f27] px-5 text-sm font-semibold text-[#fcfaf5] transition-colors hover:bg-[#8a6a52] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a6a52]"
              type="submit"
            >
              Apply filters
            </button>
          </form>
        </Container>
      </section>

      <section className="py-12 sm:py-16">
        <Container>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm font-semibold text-[#5e4b3e]" aria-live="polite">
              {totalCount} published {totalCount === 1 ? "project" : "projects"}
            </p>
            {hasFilters && projects.length > 0 ? (
              <Link
                className="rounded-md text-sm font-semibold text-[#8a6a52] underline decoration-[#c9ad8e] underline-offset-4 hover:text-[#3b2f27] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#8a6a52]"
                href="/projects"
              >
                Clear filters
              </Link>
            ) : null}
          </div>

          {projects.length > 0 ? (
            <div className="mt-7 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {projects.map((project) => (
                <PublicProjectCard key={project.id} project={project} />
              ))}
            </div>
          ) : (
            <div className="mt-7 rounded-2xl border border-dashed border-[#d8c3a8] bg-[#fcfaf5]/60 px-6 py-16 text-center">
              <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#3b2f27]">
                No published projects found.
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#75685d]">
                Try a broader search or clear the filters to explore all
                community projects.
              </p>
              {hasFilters ? (
                <Link
                  className="mt-5 inline-flex rounded-xl border border-[#c9ad8e] px-4 py-2.5 text-sm font-semibold text-[#6d513d] transition-colors hover:bg-[#efe3d3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a6a52]"
                  href="/projects"
                >
                  Clear filters
                </Link>
              ) : null}
            </div>
          )}

          {pageCount > 1 ? (
            <nav
              aria-label="Project pagination"
              className="mt-10 flex items-center justify-center gap-4"
            >
              {filters.page > 1 ? (
                <Link
                  aria-label="Previous page"
                  className="rounded-xl border border-[#c9ad8e] px-4 py-2.5 text-sm font-semibold text-[#6d513d] transition-colors hover:bg-[#efe3d3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a6a52]"
                  href={buildProjectDiscoveryHref(filters, {
                    page: filters.page - 1,
                  })}
                >
                  Previous
                </Link>
              ) : null}
              <span className="text-sm font-medium text-[#75685d]">
                Page {filters.page} of {pageCount}
              </span>
              {filters.page < pageCount ? (
                <Link
                  aria-label="Next page"
                  className="rounded-xl border border-[#c9ad8e] px-4 py-2.5 text-sm font-semibold text-[#6d513d] transition-colors hover:bg-[#efe3d3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a6a52]"
                  href={buildProjectDiscoveryHref(filters, {
                    page: filters.page + 1,
                  })}
                >
                  Next
                </Link>
              ) : null}
            </nav>
          ) : null}
        </Container>
      </section>
    </main>
  );
}
