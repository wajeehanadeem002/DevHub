import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getProjectDiscoveryMock,
  parseProjectDiscoveryFiltersMock,
  projectDiscoveryViewPropsMock,
  resolveDiscoverableProjectsMock,
} = vi.hoisted(() => ({
  getProjectDiscoveryMock: vi.fn(),
  parseProjectDiscoveryFiltersMock: vi.fn(),
  projectDiscoveryViewPropsMock: vi.fn(),
  resolveDiscoverableProjectsMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/features/projects/project-discovery", () => ({
  getProjectDiscovery: getProjectDiscoveryMock,
}));
vi.mock("@/features/projects/project-discovery-card-data", () => ({
  resolveDiscoverableProjects: resolveDiscoverableProjectsMock,
}));
vi.mock("@/features/projects/project-discovery-input", () => ({
  parseProjectDiscoveryFilters: parseProjectDiscoveryFiltersMock,
}));
vi.mock("@/features/projects/project-discovery-view", () => ({
  ProjectDiscoveryView: (props: unknown) => {
    projectDiscoveryViewPropsMock(props);
    return <h1>Explore projects</h1>;
  },
}));

import ProjectsPage, { metadata } from "./page";

const filters = {
  category: "web-applications",
  page: 2,
  q: "task",
  sort: "popular" as const,
  technology: "react",
};
const result = {
  categories: [],
  filters,
  pageCount: 2,
  projects: [{ id: "project-1" }],
  technologies: [],
  totalCount: 13,
};
const resolvedProjects = [{ id: "project-1", coverImageUrl: null }];

describe("ProjectsPage", () => {
  beforeEach(() => {
    getProjectDiscoveryMock.mockReset();
    parseProjectDiscoveryFiltersMock.mockReset();
    projectDiscoveryViewPropsMock.mockReset();
    resolveDiscoverableProjectsMock.mockReset();
    parseProjectDiscoveryFiltersMock.mockReturnValue(filters);
    getProjectDiscoveryMock.mockResolvedValue(result);
    resolveDiscoverableProjectsMock.mockResolvedValue(resolvedProjects);
  });

  it("awaits URL filters and resolves public project card data on the server", async () => {
    let searchParamsRead = false;
    const rawSearchParams = {
      category: "web-applications",
      page: "2",
      q: "task",
      sort: "popular",
      technology: "react",
    };
    const searchParams = Promise.resolve(rawSearchParams).then((value) => {
      searchParamsRead = true;
      return value;
    });

    render(await ProjectsPage({ searchParams }));

    expect(searchParamsRead).toBe(true);
    expect(parseProjectDiscoveryFiltersMock).toHaveBeenCalledWith(
      rawSearchParams,
    );
    expect(getProjectDiscoveryMock).toHaveBeenCalledWith(filters);
    expect(resolveDiscoverableProjectsMock).toHaveBeenCalledWith(
      result.projects,
    );
    expect(projectDiscoveryViewPropsMock).toHaveBeenCalledWith({
      projects: resolvedProjects,
      result,
    });
    expect(
      screen.getByRole("heading", { level: 1, name: "Explore projects" }),
    ).toBeInTheDocument();
  });

  it("exports discovery metadata", () => {
    expect(metadata).toEqual({
      description:
        "Explore published developer projects, technologies, and builders on DevHub.",
      title: "Projects",
    });
  });
});
