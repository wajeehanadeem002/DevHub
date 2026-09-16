import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { getProjectTaxonomyMock, requireProfileMock } = vi.hoisted(() => ({
  getProjectTaxonomyMock: vi.fn(),
  requireProfileMock: vi.fn(),
}));

vi.mock("@/features/projects/project-data", () => ({
  getProjectTaxonomy: getProjectTaxonomyMock,
}));
vi.mock("@/lib/auth/require-profile", () => ({ requireProfile: requireProfileMock }));

import NewProjectPage from "./page";

describe("NewProjectPage", () => {
  it("independently protects the route and supplies curated taxonomy to the composer", async () => {
    requireProfileMock.mockResolvedValue({ profile: { username: "alex" }, userId: "user_1" });
    getProjectTaxonomyMock.mockResolvedValue({
      categories: [{ id: 1, name: "Web Application", slug: "web-application" }],
      technologies: [{ id: 1, name: "React", slug: "react" }],
    });

    render(await NewProjectPage());

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { name: "Create a project" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Web Application" })).toBeInTheDocument();
    expect(requireProfileMock).toHaveBeenCalledTimes(1);
    expect(getProjectTaxonomyMock).toHaveBeenCalledTimes(1);
  });
});
