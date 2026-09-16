import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const actionMocks = vi.hoisted(() => ({
  removeProjectImageActionMock: vi.fn(),
  reorderProjectImagesActionMock: vi.fn(),
  uploadProjectImageActionMock: vi.fn(),
}));

vi.mock("./project-actions", () => ({
  removeProjectImageAction: actionMocks.removeProjectImageActionMock,
  reorderProjectImagesAction: actionMocks.reorderProjectImagesActionMock,
  uploadProjectImageAction: actionMocks.uploadProjectImageActionMock,
}));

import { ProjectImageManager } from "./project-image-manager";

const projectId = "550e8400-e29b-41d4-a716-446655440000";
const images = [
  {
    alt_text: "TaskFlow planning board",
    height: 720,
    id: "1f2df258-437d-40dc-b94a-6fb16452aa2c",
    publicUrl: "https://example.supabase.co/storage/v1/object/public/project-images/cover.webp",
    sort_order: 0,
    storage_path: "private/raw/cover.webp",
    width: 1280,
  },
  {
    alt_text: "TaskFlow timeline",
    height: 720,
    id: "1cfa37a4-64a4-4619-b50f-1022d10d0949",
    publicUrl: "https://example.supabase.co/storage/v1/object/public/project-images/timeline.webp",
    sort_order: 1,
    storage_path: "private/raw/timeline.webp",
    width: 1280,
  },
];
const idleState = { fieldErrors: {}, message: "", status: "idle" };

describe("ProjectImageManager", () => {
  const NativeURL = globalThis.URL;
  const createObjectURL = vi.fn(() => "blob:taskflow-preview");
  const revokeObjectURL = vi.fn();

  beforeEach(() => {
    for (const mock of Object.values(actionMocks)) {
      mock.mockReset();
      mock.mockResolvedValue({ fieldErrors: {}, message: "Done.", status: "success" });
    }
    class TestURL extends NativeURL {}
    Object.defineProperties(TestURL, {
      createObjectURL: { value: createObjectURL },
      revokeObjectURL: { value: revokeObjectURL },
    });
    vi.stubGlobal("URL", TestURL);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    createObjectURL.mockClear();
    revokeObjectURL.mockClear();
  });

  it("explains optional publishing and renders cover/order/removal controls", () => {
    render(<ProjectImageManager images={images} projectId={projectId} />);

    expect(screen.getByText(/images are optional for publishing/i)).toBeInTheDocument();
    expect(screen.getByText("2 of 5 image slots used")).toBeInTheDocument();
    expect(screen.getByText("Cover")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "TaskFlow planning board" })).toHaveAttribute(
      "src", expect.not.stringContaining("private/raw"),
    );
    expect(screen.getAllByRole("button", { name: /remove/i })).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Move TaskFlow planning board left" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Move TaskFlow timeline right" })).toBeDisabled();
  });

  it("submits the upload with the bound project, file, and alt text and announces pending", async () => {
    const user = userEvent.setup();
    let finishAction!: (state: typeof idleState) => void;
    actionMocks.uploadProjectImageActionMock.mockImplementation(
      () => new Promise((resolve) => { finishAction = resolve; }),
    );
    render(<ProjectImageManager images={[]} projectId={projectId} />);
    const file = new File(["project image"], "taskflow.png", { type: "image/png" });

    await user.upload(screen.getByLabelText("Choose project image"), file);
    await user.type(screen.getByLabelText("Image description"), "TaskFlow planning board");
    const imageInput = screen.getByLabelText<HTMLInputElement>("Choose project image");
    expect(imageInput.files).toHaveLength(1);
    expect(imageInput.value).toContain("taskflow.png");
    // jsdom retains valueMissing for a populated required file input; browsers clear it.
    imageInput.required = false;
    expect(screen.getByLabelText("Image description")).toBeValid();
    await user.click(screen.getByRole("button", { name: "Upload image" }));

    await waitFor(() => expect(actionMocks.uploadProjectImageActionMock).toHaveBeenCalledTimes(1));
    const [boundProjectId, previousState, formData] = actionMocks.uploadProjectImageActionMock.mock.calls[0]!;
    expect(boundProjectId).toBe(projectId);
    expect(previousState).toEqual(idleState);
    expect(Array.from((formData as FormData).entries())).toEqual([
      ["image", file],
      ["altText", "TaskFlow planning board"],
    ]);
    expect(screen.getByRole("status")).toHaveTextContent("Uploading project image.");
    await act(async () => finishAction({ fieldErrors: {}, message: "Done.", status: "success" }));
  });

  it("submits removal with both bound IDs and announces pending", async () => {
    const user = userEvent.setup();
    let finishAction!: (state: typeof idleState) => void;
    actionMocks.removeProjectImageActionMock.mockImplementation(
      () => new Promise((resolve) => { finishAction = resolve; }),
    );
    render(<ProjectImageManager images={images} projectId={projectId} />);

    await user.click(screen.getByRole("button", { name: "Remove TaskFlow planning board" }));
    await waitFor(() => expect(actionMocks.removeProjectImageActionMock).toHaveBeenCalledTimes(1));
    const [boundProjectId, boundImageId, previousState, formData] =
      actionMocks.removeProjectImageActionMock.mock.calls[0]!;
    expect(boundProjectId).toBe(projectId);
    expect(boundImageId).toBe(images[0]!.id);
    expect(previousState).toEqual(idleState);
    expect(Array.from((formData as FormData).entries())).toEqual([]);
    expect(screen.getByRole("status")).toHaveTextContent("Removing project image.");
    await act(async () => finishAction({ fieldErrors: {}, message: "Done.", status: "success" }));
  });

  it("submits the complete reordered ID array with the bound project and announces pending", async () => {
    const user = userEvent.setup();
    let finishAction!: (state: typeof idleState) => void;
    actionMocks.reorderProjectImagesActionMock.mockImplementation(
      () => new Promise((resolve) => { finishAction = resolve; }),
    );
    render(<ProjectImageManager images={images} projectId={projectId} />);

    await user.click(screen.getByRole("button", { name: "Move TaskFlow planning board right" }));
    await waitFor(() => expect(actionMocks.reorderProjectImagesActionMock).toHaveBeenCalledTimes(1));
    const [boundProjectId, previousState, formData] =
      actionMocks.reorderProjectImagesActionMock.mock.calls[0]!;
    expect(boundProjectId).toBe(projectId);
    expect(previousState).toEqual(idleState);
    expect(Array.from((formData as FormData).entries())).toEqual([
      ["imageIds", images[1]!.id],
      ["imageIds", images[0]!.id],
    ]);
    expect(screen.getByRole("status")).toHaveTextContent("Reordering project images.");
    await act(async () => finishAction({ fieldErrors: {}, message: "Done.", status: "success" }));
  });

  it("creates a local preview and revokes each object URL on change and unmount", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<ProjectImageManager images={[]} projectId={projectId} />);
    const input = screen.getByLabelText("Choose project image");
    const first = new File(["first"], "first.png", { type: "image/png" });
    const second = new File(["second"], "second.webp", { type: "image/webp" });

    await user.upload(input, first);
    expect(createObjectURL).toHaveBeenCalledWith(first);
    expect(screen.getByRole("img", { name: "Selected project image preview" })).toHaveAttribute(
      "src", "blob:taskflow-preview",
    );
    await user.upload(input, second);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:taskflow-preview");
    unmount();
    expect(revokeObjectURL).toHaveBeenCalledTimes(2);
  });

  it("stops uploads when all five image slots are occupied", () => {
    const fiveImages = Array.from({ length: 5 }, (_, index) => {
      const base = images[index % images.length]!;
      return {
        ...base,
        alt_text: `Project view ${index + 1}`,
        id: `00000000-0000-4000-8000-00000000000${index}`,
        sort_order: index,
      };
    });
    render(<ProjectImageManager images={fiveImages} projectId={projectId} />);

    expect(screen.getByText("5 of 5 image slots used")).toBeInTheDocument();
    expect(screen.getByLabelText("Choose project image")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Upload image" })).toBeDisabled();
  });
});
