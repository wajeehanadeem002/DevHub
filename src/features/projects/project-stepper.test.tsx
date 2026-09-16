import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ProjectStepper } from "./project-stepper";

describe("ProjectStepper", () => {
  it("renders an ordered, horizontally contained four-step flow with current and completed semantics", async () => {
    const user = userEvent.setup();
    const onStepChange = vi.fn();
    const { container } = render(
      <ProjectStepper
        availableSteps={["details", "technologies"]}
        completedSteps={["details"]}
        currentStep="technologies"
        onStepChange={onStepChange}
      />,
    );

    const navigation = screen.getByRole("navigation", {
      name: "Project creation steps",
    });
    expect(navigation).toHaveClass("overflow-x-auto");
    expect(container.querySelector("ol")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /details.*completed/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /technologies.*current/i })).toHaveAttribute(
      "aria-current",
      "step",
    );
    expect(screen.getByLabelText("Images, upcoming")).toBeInTheDocument();
    expect(screen.getByLabelText("Review, upcoming")).toBeInTheDocument();

    await user.tab();
    expect(screen.getByRole("button", { name: /details.*completed/i })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onStepChange).toHaveBeenCalledWith("details");
  });
});
