import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("./profile-actions", () => ({
  removeAvatarAction: vi.fn(),
  uploadAvatarAction: vi.fn(),
}));

import { AvatarForm } from "./avatar-form";

describe("AvatarForm", () => {
  it("shows upload requirements, the current avatar, and removal when available", () => {
    render(
      <AvatarForm
        avatarUrl="https://example.supabase.co/storage/v1/object/public/avatars/user/avatar.jpg"
        displayName="Wajeeha Nadeem"
        hasAvatar
      />,
    );

    expect(screen.getByRole("img", { name: "Wajeeha Nadeem avatar" })).toBeInTheDocument();
    expect(screen.getByLabelText("Choose avatar image")).toHaveAttribute(
      "accept",
      "image/jpeg,image/png,image/webp",
    );
    expect(screen.getByText(/JPEG, PNG, or WebP.*2 MB maximum/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upload avatar" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Remove avatar" })).toBeEnabled();
  });

  it("uses initials and omits removal when no avatar exists", () => {
    render(
      <AvatarForm avatarUrl={null} displayName="Wajeeha Nadeem" hasAvatar={false} />,
    );

    expect(screen.getByText("WN")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove avatar" })).toBeNull();
  });

  it("associates avatar action errors with the file input", () => {
    render(
      <AvatarForm
        avatarUrl={null}
        displayName="Wajeeha Nadeem"
        hasAvatar={false}
        uploadInitialState={{
          fieldError: "Use a JPEG, PNG, or WebP image.",
          message: "Check the selected image and try again.",
          status: "error",
        }}
      />,
    );

    expect(screen.getByLabelText("Choose avatar image")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByLabelText("Choose avatar image")).toHaveAccessibleDescription(
      expect.stringMatching(/Use a JPEG, PNG, or WebP image/),
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Check the selected image and try again.",
    );
  });
});
