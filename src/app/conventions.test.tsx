import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import ErrorPage from "./error";
import Loading from "./loading";
import NotFound from "./not-found";
import robots from "./robots";
import sitemap from "./sitemap";

describe("App Router conventions", () => {
  it("offers recovery from a route error", async () => {
    const reset = vi.fn();

    render(<ErrorPage error={new Error("test failure")} reset={reset} />);
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(reset).toHaveBeenCalledOnce();
  });

  it("exposes accessible loading and not-found states", () => {
    const { rerender } = render(<Loading />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading");

    rerender(<NotFound />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Page not found" }),
    ).toBeInTheDocument();
  });

  it("publishes the landing and project discovery routes", () => {
    expect(sitemap()).toEqual([
      expect.objectContaining({ url: "http://localhost:3000" }),
      expect.objectContaining({
        changeFrequency: "weekly",
        priority: 0.8,
        url: "http://localhost:3000/projects",
      }),
    ]);
  });

  it("keeps future private route groups out of search results", () => {
    expect(robots()).toEqual(
      expect.objectContaining({
        rules: expect.objectContaining({
          disallow: ["/dashboard/", "/onboarding/"],
        }),
      }),
    );
  });
});
