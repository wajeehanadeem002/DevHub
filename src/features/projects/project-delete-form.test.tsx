import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { deleteProjectActionMock } = vi.hoisted(() => ({
  deleteProjectActionMock: vi.fn(),
}));

vi.mock("./project-actions", () => ({ deleteProjectAction: deleteProjectActionMock }));

import { ProjectDeleteForm } from "./project-delete-form";

const projectId = "550e8400-e29b-41d4-a716-446655440000";

describe("ProjectDeleteForm", () => {
  beforeEach(() => {
    deleteProjectActionMock.mockReset();
    deleteProjectActionMock.mockResolvedValue({
      fieldErrors: {}, message: "Deleted.", status: "success",
    });
  });

  it("submits the canonical project ID only after explicit checkbox confirmation", async () => {
    const user = userEvent.setup();
    let finishAction!: (state: {
      fieldErrors: Record<string, never>; message: string; status: "success";
    }) => void;
    deleteProjectActionMock.mockImplementation(
      () => new Promise((resolve) => { finishAction = resolve; }),
    );
    render(<ProjectDeleteForm projectId={projectId} projectTitle="TaskFlow" />);

    const form = screen.getByRole("form", { name: "Delete TaskFlow" });
    expect(form.querySelector('input[name="projectId"]')).toHaveValue(projectId);
    const confirmation = screen.getByRole("checkbox", {
      name: /permanently delete TaskFlow/i,
    });
    const submit = screen.getByRole("button", { name: "Delete project" });
    expect(submit).toBeDisabled();
    await user.click(confirmation);
    expect(submit).toBeEnabled();
    expect(confirmation).toHaveAttribute("name", "confirmDelete");
    await user.click(submit);

    await waitFor(() => expect(deleteProjectActionMock).toHaveBeenCalledTimes(1));
    const [boundProjectId, previousState, formData] = deleteProjectActionMock.mock.calls[0]!;
    expect(boundProjectId).toBe(projectId);
    expect(previousState).toEqual({ fieldErrors: {}, message: "", status: "idle" });
    expect(Array.from((formData as FormData).entries())).toEqual([
      ["projectId", projectId],
      ["confirmDelete", "on"],
    ]);
    expect(screen.getByRole("status")).toHaveTextContent("Deleting project.");

    await act(async () => {
      finishAction({ fieldErrors: {}, message: "Deleted.", status: "success" });
    });
  });

  it("announces action errors and cleanup warnings without weakening confirmation", () => {
    render(
      <ProjectDeleteForm
        initialState={{
          cleanupWarning: "Some project image files could not be cleaned up yet.",
          fieldErrors: {},
          message: "Project deleted.",
          status: "success",
        }}
        projectId={projectId}
        projectTitle="TaskFlow"
      />,
    );

    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
    expect(screen.getByRole("status")).toHaveTextContent("Project deleted.");
    expect(screen.getByRole("status")).toHaveTextContent(/could not be cleaned up yet/i);
    expect(screen.getByRole("button", { name: "Delete project" })).toBeDisabled();
  });
});
