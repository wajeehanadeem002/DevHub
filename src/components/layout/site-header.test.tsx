import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { authView, userButtonMock } = vi.hoisted(() => ({
  authView: { signedIn: false },
  userButtonMock: vi.fn<
    (props: {
      appearance?: object;
      customMenuItems?: Array<{ href: string; label: string }>;
    }) => null
  >(() => null),
}));

vi.mock("@clerk/nextjs", () => ({
  Show: ({
    children,
    when,
  }: {
    children: React.ReactNode;
    when: "signed-in" | "signed-out";
  }) =>
    authView.signedIn === (when === "signed-in") ? children : null,
  UserButton: userButtonMock,
}));

import { SiteHeader } from "./site-header";

describe("SiteHeader", () => {
  beforeEach(() => {
    authView.signedIn = false;
    userButtonMock.mockClear();
  });

  it("provides primary landing navigation and entry actions", () => {
    render(<SiteHeader />);

    const navigation = screen.getByRole("navigation", {
      name: "Primary navigation",
    });

    expect(navigation).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Explore" })).toHaveAttribute(
      "href",
      "/projects",
    );
    expect(screen.getByRole("link", { name: "Developers" })).toHaveAttribute(
      "href",
      "/#developers",
    );
    expect(screen.getByRole("link", { name: "Projects" })).toHaveAttribute(
      "href",
      "/projects",
    );
    expect(screen.getByRole("searchbox", { name: "Search DevHub" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Sign In" })).toHaveAttribute(
      "href",
      "/sign-in",
    );
    expect(screen.getByRole("link", { name: "Join DevHub" })).toHaveAttribute(
      "href",
      "/sign-up",
    );
    expect(
      screen.queryByRole("link", { name: "Dashboard" }),
    ).not.toBeInTheDocument();
  });

  it("shows a dashboard link and the Clerk account menu when signed in", () => {
    authView.signedIn = true;

    render(<SiteHeader />);

    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
    expect(screen.queryByRole("link", { name: "Sign In" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Join DevHub" }),
    ).not.toBeInTheDocument();
    expect(userButtonMock).toHaveBeenCalledOnce();
    expect(userButtonMock.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        customMenuItems: [{ href: "/dashboard", label: "Dashboard" }],
      }),
    );
  });
});
