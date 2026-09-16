import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { ProjectDiscoveryResult } from "./project-discovery";
import type { ResolvedDiscoverableProject } from "./project-discovery-card-data";
import { ProjectDiscoveryView } from "./project-discovery-view";

const projects: ResolvedDiscoverableProject[] = [
  {
    category: { id: 1, name: "Web Applications", slug: "web-applications" },
    coverImage: null,
    coverImageUrl: null,
    id: "550e8400-e29b-41d4-a716-446655440000",
    like_count: 12,
    owner: {
      avatarUrl: null,
      display_name: "Alex Morgan",
      username: "alexmorgan",
    },
    published_at: "2026-09-15T10:00:00.000Z",
    summary: "Build and ship focused work.",
    technologies: [{ id: 1, name: "React", slug: "react" }],
    title: "TaskFlow",
  },
];

const result: ProjectDiscoveryResult = {
  categories: [
    { id: 1, name: "Web Applications", slug: "web-applications" },
    { id: 2, name: "Developer Tools", slug: "developer-tools" },
  ],
  filters: {
    category: "web-applications",
    page: 2,
    q: "task planner",
    sort: "popular",
    technology: "react",
  },
  pageCount: 3,
  projects: [],
  technologies: [
    { id: 1, name: "React", slug: "react" },
    { id: 2, name: "Next.js", slug: "next-js" },
  ],
  totalCount: 13,
};

describe("ProjectDiscoveryView", () => {
  it("renders URL-backed filters, project cards, and preserving pagination", () => {
    render(<ProjectDiscoveryView projects={projects} result={result} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Explore projects" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("search")).toHaveAttribute("action", "/projects");
    expect(screen.getByLabelText("Search projects")).toHaveValue(
      "task planner",
    );
    expect(screen.getByLabelText("Category")).toHaveValue("web-applications");
    expect(screen.getByLabelText("Technology")).toHaveValue("react");
    expect(screen.getByLabelText("Sort projects")).toHaveValue("popular");
    expect(screen.getByText("13 published projects")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View TaskFlow" })).toHaveAttribute(
      "href",
      "/projects/550e8400-e29b-41d4-a716-446655440000",
    );
    expect(screen.getByRole("link", { name: "Clear filters" })).toHaveAttribute(
      "href",
      "/projects",
    );
    expect(screen.getByRole("link", { name: "Previous page" })).toHaveAttribute(
      "href",
      "/projects?q=task+planner&category=web-applications&technology=react&sort=popular",
    );
    expect(screen.getByRole("link", { name: "Next page" })).toHaveAttribute(
      "href",
      "/projects?q=task+planner&category=web-applications&technology=react&sort=popular&page=3",
    );
    expect(screen.getByText("Page 2 of 3")).toBeInTheDocument();
  });

  it("renders a clear empty state without pagination", () => {
    render(
      <ProjectDiscoveryView
        projects={[]}
        result={{
          ...result,
          filters: {
            category: null,
            page: 1,
            q: "missing",
            sort: "newest",
            technology: null,
          },
          pageCount: 1,
          totalCount: 0,
        }}
      />,
    );

    expect(screen.getByText("No published projects found.")).toBeInTheDocument();
    expect(screen.queryByText(/Page 1 of/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Clear filters" })).toHaveAttribute(
      "href",
      "/projects",
    );
  });
});
