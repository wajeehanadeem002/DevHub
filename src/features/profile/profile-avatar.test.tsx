import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProfileAvatar } from "./profile-avatar";

describe("ProfileAvatar", () => {
  it("renders an accessible uploaded avatar", () => {
    render(
      <ProfileAvatar
        avatarUrl="https://example.supabase.co/storage/v1/object/public/avatars/user/avatar.jpg"
        displayName="Wajeeha Nadeem"
        size="md"
      />,
    );

    expect(screen.getByRole("img", { name: "Wajeeha Nadeem avatar" })).toHaveAttribute(
      "src",
      expect.stringContaining("avatar.jpg"),
    );
  });

  it("uses two initials when no uploaded avatar exists", () => {
    render(
      <ProfileAvatar avatarUrl={null} displayName="Wajeeha Nadeem" size="md" />,
    );

    expect(screen.getByText("WN")).toBeInTheDocument();
    expect(
      screen.queryByRole("img", { name: "Wajeeha Nadeem avatar" }),
    ).not.toBeInTheDocument();
  });
});
