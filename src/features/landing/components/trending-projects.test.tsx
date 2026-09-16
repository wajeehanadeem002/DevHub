import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { ResolvedDiscoverableProject } from "@/features/projects/project-discovery-card-data";

import { TrendingProjects } from "./trending-projects";

const project: ResolvedDiscoverableProject = {
  category: { id: 1, name: "Developer Tools", slug: "developer-tools" },
  coverImage: null,
  coverImageUrl: null,
  id: "550e8400-e29b-41d4-a716-446655440000",
  like_count: 28,
  owner: {
    avatarUrl: null,
    display_name: "Alex Morgan",
    username: "alexmorgan",
  },
  published_at: "2026-09-15T10:00:00.000Z",
  summary: "Plan and ship focused work.",
  technologies: [{ id: 1, name: "React", slug: "react" }],
  title: "TaskFlow",
};

describe("TrendingProjects", () => {
  it("renders real published project cards and the full discovery link", () => {
    render(<TrendingProjects projects={[project]} />);

    expect(screen.getByRole("link", { name: "View TaskFlow" })).toHaveAttribute(
      "href",
      `/projects/${project.id}`,
    );
    expect(screen.getByText("Alex Morgan")).toBeInTheDocument();
    expect(screen.getByText("28 likes")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Explore all projects" }),
    ).toHaveAttribute("href", "/projects");
  });

  it("renders a useful empty state when no work is published", () => {
    render(<TrendingProjects projects={[]} />);

    expect(
      screen.getByText("Published community projects will appear here."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Explore all projects" }),
    ).toHaveAttribute("href", "/projects");
  });
});
