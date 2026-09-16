import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SiteFooter } from "./site-footer";

describe("SiteFooter", () => {
  it("organizes platform, community, company, and social links", () => {
    render(<SiteFooter />);

    expect(
      screen.getByText("Where developers build, showcase, and connect."),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Platform" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Community" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Company" })).toBeVisible();
    expect(screen.getByRole("link", { name: "GitHub" })).toBeVisible();
    expect(screen.getByRole("link", { name: "LinkedIn" })).toBeVisible();
    expect(screen.getByRole("link", { name: "X" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Explore" })).toHaveAttribute(
      "href",
      "/projects",
    );
    expect(screen.getByRole("link", { name: "Projects" })).toHaveAttribute(
      "href",
      "/projects",
    );
  });
});
