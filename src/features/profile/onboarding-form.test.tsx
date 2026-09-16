import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("./onboarding-action", () => ({
  completeProfileOnboarding: vi.fn(),
  initialOnboardingActionState: undefined,
}));

import { OnboardingForm } from "./onboarding-form";

describe("OnboardingForm", () => {
  it("renders without relying on non-action exports from the server module", () => {
    expect(() => render(<OnboardingForm />)).not.toThrow();
  });

  it("collects the approved professional profile fields with browser safeguards", () => {
    render(<OnboardingForm />);

    expect(screen.getByLabelText("Username")).toHaveAttribute("maxlength", "30");
    expect(screen.getByLabelText("Username")).toBeRequired();
    expect(screen.getByLabelText("Display name")).toHaveAttribute(
      "maxlength",
      "80",
    );
    expect(screen.getByLabelText("Display name")).toBeRequired();
    expect(screen.getByLabelText("Professional headline")).toHaveAttribute(
      "maxlength",
      "120",
    );
    expect(screen.getByLabelText("Location")).toHaveAttribute(
      "maxlength",
      "100",
    );
    expect(screen.getByLabelText("Short bio")).toHaveAttribute(
      "maxlength",
      "1000",
    );
    expect(
      screen.getByRole("button", { name: "Create profile" }),
    ).toBeEnabled();
  });

  it("associates server validation feedback with the affected field", () => {
    render(
      <OnboardingForm
        initialState={{
          fieldErrors: { username: ["That username is already taken."] },
          message: "Choose a different username to continue.",
          status: "error",
        }}
      />,
    );

    const username = screen.getByLabelText("Username");
    expect(username).toHaveAttribute("aria-invalid", "true");
    expect(username).toHaveAccessibleDescription(
      /lowercase letters.*That username is already taken/i,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Choose a different username to continue.",
    );
  });
});
