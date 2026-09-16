import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const actionMocks = vi.hoisted(() => ({
  deleteProjectActionMock: vi.fn(),
  publishProjectActionMock: vi.fn(),
  removeProjectImageActionMock: vi.fn(),
  reorderProjectImagesActionMock: vi.fn(),
  unpublishProjectActionMock: vi.fn(),
  updateProjectActionMock: vi.fn(),
  uploadProjectImageActionMock: vi.fn(),
}));

vi.mock("./project-actions", () => ({
  deleteProjectAction: actionMocks.deleteProjectActionMock,
  publishProjectAction: actionMocks.publishProjectActionMock,
  removeProjectImageAction: actionMocks.removeProjectImageActionMock,
  reorderProjectImagesAction: actionMocks.reorderProjectImagesActionMock,
  unpublishProjectAction: actionMocks.unpublishProjectActionMock,
  updateProjectAction: actionMocks.updateProjectActionMock,
  uploadProjectImageAction: actionMocks.uploadProjectImageActionMock,
}));

import { EditProjectComposer } from "./edit-project-composer";

const projectId = "550e8400-e29b-41d4-a716-446655440000";
const categories = [
  { id: 1, name: "Web Application", slug: "web-application" },
  { id: 2, name: "Developer Tool", slug: "developer-tool" },
];
const technologies = [
  { id: 1, name: "React", slug: "react" },
  { id: 2, name: "Next.js", slug: "next-js" },
  { id: 3, name: "TypeScript", slug: "typescript" },
];
const project = {
  category_id: 2,
  demo_url: "https://taskflow.dev",
  description: "A focused task manager for thoughtful teams.",
  id: projectId,
  images: [],
  repository_url: "https://github.com/alex/taskflow",
  status: "draft" as const,
  summary: "Plan and ship focused work.",
  technologyIds: [1, 2],
  title: "TaskFlow",
};
const idleState = { fieldErrors: {}, message: "", status: "idle" };

describe("EditProjectComposer", () => {
  beforeEach(() => {
    for (const mock of Object.values(actionMocks)) mock.mockReset();
    actionMocks.updateProjectActionMock.mockResolvedValue({
      fieldErrors: {}, message: "Saved.", status: "success",
    });
    actionMocks.publishProjectActionMock.mockResolvedValue({
      fieldErrors: {}, message: "Published.", status: "success",
    });
    actionMocks.unpublishProjectActionMock.mockResolvedValue({
      fieldErrors: {}, message: "Unpublished.", status: "success",
    });
  });

  it("submits the bound update action with every persisted project field", async () => {
    const user = userEvent.setup();
    let finishAction!: (state: typeof idleState) => void;
    actionMocks.updateProjectActionMock.mockImplementation(
      () => new Promise((resolve) => { finishAction = resolve; }),
    );
    render(
      <EditProjectComposer
        categories={categories}
        currentStep="details"
        project={project}
        technologies={technologies}
      />,
    );

    expect(screen.getByRole("link", { name: /details.*current/i })).toHaveAttribute(
      "aria-current", "step",
    );
    expect(screen.getByLabelText("Project title")).toHaveValue("TaskFlow");
    expect(screen.getByRole("radio", { name: "Developer Tool" })).toBeChecked();
    await user.click(screen.getByRole("button", { name: "Save project" }));

    await waitFor(() => expect(actionMocks.updateProjectActionMock).toHaveBeenCalledTimes(1));
    const [boundProjectId, previousState, formData] = actionMocks.updateProjectActionMock.mock.calls[0]!;
    expect(boundProjectId).toBe(projectId);
    expect(previousState).toEqual(idleState);
    expect(Array.from((formData as FormData).entries())).toEqual([
      ["title", "TaskFlow"],
      ["summary", "Plan and ship focused work."],
      ["description", "A focused task manager for thoughtful teams."],
      ["categoryId", "2"],
      ["demoUrl", "https://taskflow.dev"],
      ["repositoryUrl", "https://github.com/alex/taskflow"],
      ["technologyIds", "1"],
      ["technologyIds", "2"],
    ]);
    expect(screen.getByRole("status")).toHaveTextContent("Saving project changes.");

    await act(async () => finishAction({ fieldErrors: {}, message: "Saved.", status: "success" }));
  });

  it("submits the bound publish action and announces its pending state", async () => {
    const user = userEvent.setup();
    let finishAction!: (state: typeof idleState) => void;
    actionMocks.publishProjectActionMock.mockImplementation(
      () => new Promise((resolve) => { finishAction = resolve; }),
    );
    render(
      <EditProjectComposer
        categories={categories}
        currentStep="review"
        project={project}
        technologies={technologies}
      />,
    );

    const review = screen.getByRole("region", { name: "Project review" });
    expect(within(review).getByRole("heading", { name: "TaskFlow" })).toBeInTheDocument();
    expect(within(review).getByText("Draft")).toBeInTheDocument();
    expect(within(review).getByText("Developer Tool")).toBeInTheDocument();
    expect(within(review).getByText("React")).toBeInTheDocument();
    expect(within(review).getByRole("link", { name: "Live demo" })).toHaveAttribute(
      "rel", "nofollow noopener noreferrer",
    );
    await user.click(within(review).getByRole("button", { name: "Publish project" }));

    await waitFor(() => expect(actionMocks.publishProjectActionMock).toHaveBeenCalledTimes(1));
    const [boundProjectId, previousState, formData] = actionMocks.publishProjectActionMock.mock.calls[0]!;
    expect(boundProjectId).toBe(projectId);
    expect(previousState).toEqual(idleState);
    expect(Array.from((formData as FormData).entries())).toEqual([]);
    expect(within(review).getByRole("status")).toHaveTextContent("Publishing project.");
    expect(within(review).getByRole("link", { name: "Back to details" })).toHaveAttribute(
      "href", `/dashboard/projects/${projectId}/edit?step=details`,
    );
    expect(screen.getByText(/images are optional for publishing/i)).toBeInTheDocument();

    await act(async () => finishAction({ fieldErrors: {}, message: "Published.", status: "success" }));
  });

  it("submits the bound unpublish action and announces its pending state", async () => {
    const user = userEvent.setup();
    let finishAction!: (state: typeof idleState) => void;
    actionMocks.unpublishProjectActionMock.mockImplementation(
      () => new Promise((resolve) => { finishAction = resolve; }),
    );
    render(
      <EditProjectComposer
        categories={categories}
        currentStep="review"
        project={{ ...project, status: "published" }}
        technologies={technologies}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Unpublish project" }));
    await waitFor(() => expect(actionMocks.unpublishProjectActionMock).toHaveBeenCalledTimes(1));
    const [boundProjectId, previousState, formData] = actionMocks.unpublishProjectActionMock.mock.calls[0]!;
    expect(boundProjectId).toBe(projectId);
    expect(previousState).toEqual(idleState);
    expect(Array.from((formData as FormData).entries())).toEqual([]);
    expect(screen.getByRole("status")).toHaveTextContent("Unpublishing project.");
    expect(screen.getByRole("link", { name: "View public project" })).toHaveAttribute(
      "href", `/projects/${projectId}`,
    );

    await act(async () => finishAction({ fieldErrors: {}, message: "Unpublished.", status: "success" }));
  });

  it("shows only Unpublish after publishing without retaining a success box", async () => {
    const user = userEvent.setup();
    let finishAction!: (state: typeof idleState) => void;
    actionMocks.publishProjectActionMock.mockImplementation(
      () => new Promise((resolve) => { finishAction = resolve; }),
    );
    const { rerender } = render(
      <EditProjectComposer
        categories={categories}
        currentStep="review"
        project={project}
        technologies={technologies}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Publish project" }));
    await waitFor(() => expect(actionMocks.publishProjectActionMock).toHaveBeenCalledTimes(1));
    await act(async () => {
      finishAction({ fieldErrors: {}, message: "Project published.", status: "success" });
    });
    rerender(
      <EditProjectComposer
        categories={categories}
        currentStep="review"
        project={{ ...project, status: "published" }}
        technologies={technologies}
      />,
    );

    expect(screen.getByRole("button", { name: "Unpublish project" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Publish project" })).not.toBeInTheDocument();
    expect(screen.queryByText("Project published.")).not.toBeInTheDocument();
  });

  it("shows only Publish after unpublishing without retaining a success box", async () => {
    const user = userEvent.setup();
    let finishAction!: (state: typeof idleState) => void;
    actionMocks.unpublishProjectActionMock.mockImplementation(
      () => new Promise((resolve) => { finishAction = resolve; }),
    );
    const { rerender } = render(
      <EditProjectComposer
        categories={categories}
        currentStep="review"
        project={{ ...project, status: "published" }}
        technologies={technologies}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Unpublish project" }));
    await waitFor(() => expect(actionMocks.unpublishProjectActionMock).toHaveBeenCalledTimes(1));
    await act(async () => {
      finishAction({ fieldErrors: {}, message: "Project unpublished.", status: "success" });
    });
    rerender(
      <EditProjectComposer
        categories={categories}
        currentStep="review"
        project={project}
        technologies={technologies}
      />,
    );

    expect(screen.getByRole("button", { name: "Publish project" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Unpublish project" })).not.toBeInTheDocument();
    expect(screen.queryByText("Project unpublished.")).not.toBeInTheDocument();
  });

  it("keeps status-action errors visible", async () => {
    const user = userEvent.setup();
    actionMocks.publishProjectActionMock.mockResolvedValue({
      fieldErrors: {},
      message: "Unable to publish this project.",
      status: "error",
    });
    render(
      <EditProjectComposer
        categories={categories}
        currentStep="review"
        project={project}
        technologies={technologies}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Publish project" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unable to publish this project.",
    );
  });
});
