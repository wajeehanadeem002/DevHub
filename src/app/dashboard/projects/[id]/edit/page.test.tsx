import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/features/projects/project-actions", () => ({
  publishProjectAction: vi.fn(),
  unpublishProjectAction: vi.fn(),
  updateProjectAction: vi.fn(),
  uploadProjectImageAction: vi.fn(),
  removeProjectImageAction: vi.fn(),
  reorderProjectImagesAction: vi.fn(),
  deleteProjectAction: vi.fn(),
}));

const {
  getOwnedProjectMock,
  getProjectImagePublicUrlMock,
  getProjectTaxonomyMock,
  notFoundMock,
} = vi.hoisted(() => ({
  getOwnedProjectMock: vi.fn(),
  getProjectImagePublicUrlMock: vi.fn(),
  getProjectTaxonomyMock: vi.fn(),
  notFoundMock: vi.fn((): never => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("@/features/projects/project-data", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/projects/project-data")>();
  return {
    ...actual,
    getOwnedProject: getOwnedProjectMock,
    getProjectTaxonomy: getProjectTaxonomyMock,
  };
});
vi.mock("@/features/projects/project-image-storage", () => ({
  getProjectImagePublicUrl: getProjectImagePublicUrlMock,
}));
vi.mock("next/navigation", () => ({ notFound: notFoundMock }));

import EditProjectPage from "./page";

const projectId = "550e8400-e29b-41d4-a716-446655440000";
const image = {
  alt_text: "TaskFlow planning board",
  height: 720,
  id: "1f2df258-437d-40dc-b94a-6fb16452aa2c",
  sort_order: 0,
  storage_path: "user/project/private-cover.webp",
  width: 1280,
};
const project = {
  category_id: 2,
  demo_url: null,
  description: "A focused task manager.",
  id: projectId,
  images: [image],
  repository_url: null,
  status: "draft" as const,
  summary: "Plan and ship focused work.",
  technologyIds: [1],
  title: "TaskFlow",
};

describe("EditProjectPage", () => {
  beforeEach(() => {
    getOwnedProjectMock.mockReset();
    getProjectTaxonomyMock.mockReset();
    getProjectImagePublicUrlMock.mockReset();
    notFoundMock.mockClear();
    getOwnedProjectMock.mockResolvedValue(project);
    getProjectTaxonomyMock.mockResolvedValue({
      categories: [{ id: 2, name: "Developer Tool", slug: "developer-tool" }],
      technologies: [{ id: 1, name: "React", slug: "react" }],
    });
    getProjectImagePublicUrlMock.mockResolvedValue(
      "https://example.supabase.co/storage/v1/object/public/project-images/cover.webp",
    );
  });

  it("awaits async params and searchParams and resolves every image before rendering Images", async () => {
    let paramsRead = false;
    let searchRead = false;
    const params = Promise.resolve({ id: projectId }).then((value) => {
      paramsRead = true;
      return value;
    });
    const searchParams = Promise.resolve({ step: "images" }).then((value) => {
      searchRead = true;
      return value;
    });

    render(await EditProjectPage({ params, searchParams }));

    expect(paramsRead).toBe(true);
    expect(searchRead).toBe(true);
    expect(screen.getByRole("link", { name: /images.*current/i })).toHaveAttribute(
      "aria-current",
      "step",
    );
    expect(screen.getByRole("img", { name: image.alt_text })).toBeInTheDocument();
    expect(document.body.textContent).not.toContain(image.storage_path);
    expect(getProjectImagePublicUrlMock).toHaveBeenCalledWith(image.storage_path);
  });

  it("normalizes a missing, repeated, or invalid step to Details", async () => {
    for (const step of [undefined, ["images", "review"], "unexpected"] as const) {
      const query: { step?: string | string[] } = {};
      if (typeof step === "string") {
        query.step = step;
      } else if (step) {
        query.step = [...step];
      }
      const { unmount } = render(
        await EditProjectPage({
          params: Promise.resolve({ id: projectId }),
          searchParams: Promise.resolve(query),
        }),
      );
      expect(screen.getByRole("link", { name: /details.*current/i })).toHaveAttribute(
        "aria-current",
        "step",
      );
      unmount();
    }
  });

  it("uses notFound for a missing or not-owned project without resolving images", async () => {
    getOwnedProjectMock.mockResolvedValue(null);

    await expect(
      EditProjectPage({
        params: Promise.resolve({ id: projectId }),
        searchParams: Promise.resolve({ step: "review" }),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFoundMock).toHaveBeenCalledTimes(1);
    expect(getProjectImagePublicUrlMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid route UUID before owner, taxonomy, or image queries", async () => {
    await expect(
      EditProjectPage({
        params: Promise.resolve({ id: "not-a-project-id" }),
        searchParams: Promise.resolve({ step: "images" }),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(notFoundMock).toHaveBeenCalledTimes(1);
    expect(getOwnedProjectMock).not.toHaveBeenCalled();
    expect(getProjectTaxonomyMock).not.toHaveBeenCalled();
    expect(getProjectImagePublicUrlMock).not.toHaveBeenCalled();
  });
});
