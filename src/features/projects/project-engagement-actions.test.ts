import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  revalidatePathMock,
  setCurrentProjectLikedMock,
  setCurrentProjectSavedMock,
  unstableRethrowMock,
} = vi.hoisted(() => ({
  revalidatePathMock: vi.fn(),
  setCurrentProjectLikedMock: vi.fn(),
  setCurrentProjectSavedMock: vi.fn(),
  unstableRethrowMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));
vi.mock("next/navigation", () => ({ unstable_rethrow: unstableRethrowMock }));
vi.mock("./project-engagement", () => ({
  setCurrentProjectLiked: setCurrentProjectLikedMock,
  setCurrentProjectSaved: setCurrentProjectSavedMock,
}));

import {
  setProjectLikedAction,
  setProjectSavedAction,
} from "./project-engagement-actions";

const projectId = "550e8400-e29b-41d4-a716-446655440000";
const likeFailureMessage =
  "We couldn't update this project's like. Please try again.";
const saveFailureMessage =
  "We couldn't update this project's saved state. Please try again.";

function expectEngagementPaths(projectId: string) {
  const expectedPaths = [
    "/",
    "/projects",
    `/projects/${projectId}`,
    "/dashboard/saved",
  ];

  expect(revalidatePathMock.mock.calls).toEqual(
    expectedPaths.map((path) => [path]),
  );
}

describe("project engagement actions", () => {
  beforeEach(() => {
    revalidatePathMock.mockReset();
    setCurrentProjectLikedMock.mockReset();
    setCurrentProjectSavedMock.mockReset();
    unstableRethrowMock.mockReset();
  });

  it("short-circuits invalid project IDs before the like mutation", async () => {
    const result = await setProjectLikedAction("not-a-project-id", true);

    expect(result).toEqual({ message: likeFailureMessage, status: "error" });
    expect(setCurrentProjectLikedMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("short-circuits non-boolean like states before mutation", async () => {
    const result = await setProjectLikedAction(projectId, "true" as never);

    expect(result).toEqual({ message: likeFailureMessage, status: "error" });
    expect(setCurrentProjectLikedMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("maps a successful like mutation and revalidates engagement paths in order", async () => {
    setCurrentProjectLikedMock.mockResolvedValue({ likeCount: 8, liked: true });

    const result = await setProjectLikedAction(projectId, true);

    expect(result).toEqual({ likeCount: 8, liked: true, status: "success" });
    expect(setCurrentProjectLikedMock).toHaveBeenCalledWith(projectId, true);
    expectEngagementPaths(projectId);
  });

  it("returns the safe like failure without revalidation when its mutation fails", async () => {
    const providerError = new Error("provider detail: user-private-data");
    setCurrentProjectLikedMock.mockRejectedValue(providerError);

    const result = await setProjectLikedAction(projectId, true);

    expect(result).toEqual({ message: likeFailureMessage, status: "error" });
    expect(result).not.toMatchObject({ message: providerError.message });
    expect(unstableRethrowMock).toHaveBeenCalledWith(providerError);
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("short-circuits invalid project IDs before the save mutation", async () => {
    const result = await setProjectSavedAction("not-a-project-id", true);

    expect(result).toEqual({ message: saveFailureMessage, status: "error" });
    expect(setCurrentProjectSavedMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("short-circuits non-boolean save states before mutation", async () => {
    const result = await setProjectSavedAction(projectId, 1 as never);

    expect(result).toEqual({ message: saveFailureMessage, status: "error" });
    expect(setCurrentProjectSavedMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("maps a successful save mutation and revalidates engagement paths in order", async () => {
    setCurrentProjectSavedMock.mockResolvedValue({ saved: true });

    const result = await setProjectSavedAction(projectId, true);

    expect(result).toEqual({ saved: true, status: "success" });
    expect(setCurrentProjectSavedMock).toHaveBeenCalledWith(projectId, true);
    expectEngagementPaths(projectId);
  });

  it("returns the safe save failure without revalidation when its mutation fails", async () => {
    const providerError = new Error("provider detail: user-private-data");
    setCurrentProjectSavedMock.mockRejectedValue(providerError);

    const result = await setProjectSavedAction(projectId, true);

    expect(result).toEqual({ message: saveFailureMessage, status: "error" });
    expect(result).not.toMatchObject({ message: providerError.message });
    expect(unstableRethrowMock).toHaveBeenCalledWith(providerError);
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});
