import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DashboardNavigation } from "./dashboard-navigation";

const profile = {
  avatarUrl: null,
  displayName: "Wajeeha Nadeem",
  isPublic: true,
  username: "wajeehanadeem",
};

describe("DashboardNavigation", () => {
  it("opens saved projects after Projects and marks only Saved projects active", () => {
    render(<DashboardNavigation active="saved" profile={profile} />);

    const savedLink = screen.getByRole("link", { name: "Saved projects" });
    expect(savedLink).toHaveAttribute("href", "/dashboard/saved");
    expect(savedLink).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Projects" })).not.toHaveAttribute(
      "aria-current",
    );
    const links = screen.getAllByRole("link");
    expect(links[links.indexOf(savedLink) - 1]).toBe(
      screen.getByRole("link", { name: "Projects" }),
    );
  });

  it("exposes overview, editing, and public profile destinations", () => {
    render(<DashboardNavigation active="overview" profile={profile} />);

    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Edit profile" })).toHaveAttribute(
      "href",
      "/dashboard/profile",
    );
    expect(
      screen.getByRole("link", { name: "View public profile" }),
    ).toHaveAttribute("href", "/developers/wajeehanadeem");
    expect(screen.getByRole("link", { name: "Projects" })).toHaveAttribute(
      "href",
      "/dashboard/projects",
    );
    expect(screen.queryByText("Next")).toBeNull();
  });

  it("marks the project workspace as the current dashboard destination", () => {
    render(<DashboardNavigation active="projects" profile={profile} />);

    expect(screen.getByRole("link", { name: "Projects" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Overview" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("marks editing active and disables the public destination for a private profile", () => {
    render(
      <DashboardNavigation
        active="profile"
        profile={{ ...profile, isPublic: false }}
      />,
    );

    expect(screen.getByRole("link", { name: "Edit profile" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.queryByRole("link", { name: "View public profile" })).toBeNull();
    expect(screen.getByText("Public profile hidden")).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });
});
