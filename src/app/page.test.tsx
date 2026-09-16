import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getTrendingProjectsMock, resolveDiscoverableProjectsMock } = vi.hoisted(
  () => ({
    getTrendingProjectsMock: vi.fn(),
    resolveDiscoverableProjectsMock: vi.fn(),
  }),
);

vi.mock("server-only", () => ({}));
vi.mock("@/features/projects/project-discovery", () => ({
  getTrendingProjects: getTrendingProjectsMock,
}));
vi.mock("@/features/projects/project-discovery-card-data", () => ({
  resolveDiscoverableProjects: resolveDiscoverableProjectsMock,
}));

import HomePage from "./page";

describe("HomePage", () => {
  beforeEach(() => {
    getTrendingProjectsMock.mockReset();
    resolveDiscoverableProjectsMock.mockReset();
    getTrendingProjectsMock.mockResolvedValue([]);
    resolveDiscoverableProjectsMock.mockResolvedValue([]);
  });

  it("presents the product promise and primary discovery paths", async () => {
    render(await HomePage());

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Build. Showcase. Connect.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "A community for developers to showcase their work, discover talented builders, and connect through the projects they create.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Explore Developers" })).toHaveAttribute(
      "href",
      "#developers",
    );
    expect(screen.getByRole("link", { name: "Showcase Your Work" })).toHaveAttribute(
      "href",
      "#final-cta",
    );
  });

  it("exposes every landing section as an accessible region", async () => {
    render(await HomePage());

    for (const sectionName of [
      "Trending Projects",
      "Discover Developers",
      "Explore by Technology",
      "How DevHub Works",
      "Developer Profile Preview",
      "Your next opportunity might start with your next project.",
    ]) {
      expect(screen.getByRole("region", { name: sectionName })).toBeInTheDocument();
    }
  });

  it("loads and resolves the four most-liked published projects", async () => {
    const rawProjects = [{ id: "project-1" }];
    const resolvedProjects = [
      {
        category: null,
        coverImage: null,
        coverImageUrl: null,
        id: "project-1",
        like_count: 1,
        owner: {
          avatarUrl: null,
          display_name: "Alex Morgan",
          username: "alexmorgan",
        },
        published_at: "2026-09-15T10:00:00.000Z",
        summary: "A focused project.",
        technologies: [],
        title: "TaskFlow",
      },
    ];
    getTrendingProjectsMock.mockResolvedValue(rawProjects);
    resolveDiscoverableProjectsMock.mockResolvedValue(resolvedProjects);

    render(await HomePage());

    expect(getTrendingProjectsMock).toHaveBeenCalledWith(4);
    expect(resolveDiscoverableProjectsMock).toHaveBeenCalledWith(rawProjects);
  });
});
