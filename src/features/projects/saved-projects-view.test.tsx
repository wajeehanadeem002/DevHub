import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { ResolvedDiscoverableProject } from "./project-discovery-card-data";
import { SavedProjectsView } from "./saved-projects-view";

const profile = {
  avatarUrl: null,
  displayName: "Wajeeha Nadeem",
  isPublic: false,
  username: "wajeehanadeem",
};
const project: ResolvedDiscoverableProject = {
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
};

describe("SavedProjectsView", () => {
  it("renders the saved dashboard destination and a shared detail card", () => {
    render(<SavedProjectsView profile={profile} projects={[project]} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Saved projects" }),
    ).toBeInTheDocument();
    const navigation = screen.getByRole("navigation", {
      name: "Dashboard navigation",
    });
    expect(
      within(navigation).getByRole("link", { name: "Saved projects" }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      within(navigation).getByText("Public profile hidden"),
    ).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "View TaskFlow" });
    expect(link).toHaveAttribute(
      "href",
      "/projects/550e8400-e29b-41d4-a716-446655440000",
    );
    expect(
      within(link).getByRole("article", { name: "TaskFlow" }),
    ).toBeInTheDocument();
    expect(within(link).getByText("Alex Morgan")).toBeInTheDocument();
    expect(within(link).getByText("12 likes")).toBeInTheDocument();
    expect(within(link).queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(
      screen.queryByText("No saved projects yet."),
    ).not.toBeInTheDocument();
  });

  it("preserves saved order rather than sorting by title or publication date", () => {
    render(
      <SavedProjectsView
        profile={profile}
        projects={[
          project,
          {
            ...project,
            id: "second-project",
            title: "Alpha",
            published_at: "2026-09-16T10:00:00.000Z",
          },
        ]}
      />,
    );

    expect(
      screen.getAllByRole("article").map(
        (article) => within(article).getByRole("heading").textContent,
      ),
    ).toEqual(["TaskFlow", "Alpha"]);
  });

  it("offers project discovery when there are no saved projects", () => {
    render(<SavedProjectsView profile={profile} projects={[]} />);

    const emptyState = screen.getByRole("region", {
      name: "No saved projects yet.",
    });
    expect(
      within(emptyState).getByText("No saved projects yet."),
    ).toBeInTheDocument();
    expect(
      within(emptyState).getByText(
        "Save useful community projects and they will appear here.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Explore projects" })).toHaveAttribute(
      "href",
      "/projects",
    );
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
  });
});
