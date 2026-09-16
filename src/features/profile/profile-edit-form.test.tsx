import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("./profile-actions", () => ({ updateProfileAction: vi.fn() }));

import { ProfileEditForm } from "./profile-edit-form";

const profile = {
  bio: "Building thoughtful web products.",
  display_name: "Wajeeha Nadeem",
  github_url: "https://github.com/example",
  headline: "Full Stack Developer",
  is_public: true,
  linkedin_url: "https://linkedin.com/in/example",
  location: "Lahore, Pakistan",
  technologyIds: [1],
  username: "wajeehanadeem",
  website_url: "https://example.com",
};

const technologies = [
  { id: 1, name: "React", slug: "react" },
  { id: 2, name: "Next.js", slug: "next-js" },
];

describe("ProfileEditForm", () => {
  it("renders current values, safe URL fields, technologies, and visibility", () => {
    render(<ProfileEditForm profile={profile} technologies={technologies} />);

    expect(screen.getByLabelText("Username")).toHaveValue("wajeehanadeem");
    expect(screen.getByLabelText("Display name")).toHaveValue("Wajeeha Nadeem");
    expect(screen.getByLabelText("Professional headline")).toHaveValue(
      "Full Stack Developer",
    );
    expect(screen.getByLabelText("Short bio")).toHaveValue(
      "Building thoughtful web products.",
    );
    expect(screen.getByLabelText("Website")).toHaveAttribute("type", "url");
    expect(screen.getByLabelText("GitHub profile")).toHaveAttribute("type", "url");
    expect(screen.getByLabelText("LinkedIn profile")).toHaveAttribute("type", "url");
    expect(screen.getByRole("checkbox", { name: "React" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Next.js" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Public profile" })).toBeChecked();
    expect(screen.getByText("Choose up to 8 technologies.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save profile" })).toBeEnabled();
  });

  it("associates action validation errors with their fields", () => {
    render(
      <ProfileEditForm
        initialState={{
          fieldErrors: {
            technologies: ["Choose no more than 8 technologies."],
            websiteUrl: ["Enter a complete http:// or https:// URL."],
          },
          message: "Check the highlighted fields and try again.",
          status: "error",
        }}
        profile={profile}
        technologies={technologies}
      />,
    );

    expect(screen.getByLabelText("Website")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Website")).toHaveAccessibleDescription(
      "Enter a complete http:// or https:// URL.",
    );
    expect(screen.getByRole("group", { name: "Technologies" })).toHaveAccessibleDescription(
      /Choose no more than 8 technologies/,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Check the highlighted fields and try again.",
    );
  });
});
