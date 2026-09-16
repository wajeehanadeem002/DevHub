import { describe, expect, it } from "vitest";

import {
  buildProjectDiscoveryHref,
  parseProjectDiscoveryFilters,
} from "./project-discovery-input";

describe("parseProjectDiscoveryFilters", () => {
  it("normalizes the supported public discovery parameters", () => {
    expect(
      parseProjectDiscoveryFilters({
        category: "developer-tools",
        page: "3",
        q: "  code review  ",
        sort: "popular",
        technology: "next-js",
      }),
    ).toEqual({
      category: "developer-tools",
      page: 3,
      q: "code review",
      sort: "popular",
      technology: "next-js",
    });
  });

  it("limits search text and falls back safely for malformed values", () => {
    expect(
      parseProjectDiscoveryFilters({
        category: "Not A Slug",
        page: "-4",
        q: "x".repeat(110),
        sort: "oldest",
        technology: ["react", "next-js"],
      }),
    ).toEqual({
      category: null,
      page: 1,
      q: "x".repeat(100),
      sort: "newest",
      technology: "react",
    });
  });

  it("uses defaults for missing values and non-integer pages", () => {
    expect(parseProjectDiscoveryFilters({ page: "2.5" })).toEqual({
      category: null,
      page: 1,
      q: "",
      sort: "newest",
      technology: null,
    });
  });
});

describe("buildProjectDiscoveryHref", () => {
  const filters = {
    category: "developer-tools",
    page: 4,
    q: "code review",
    sort: "popular" as const,
    technology: "react",
  };

  it("preserves active filters, applies changes, and emits a stable URL", () => {
    expect(buildProjectDiscoveryHref(filters, { page: 2 })).toBe(
      "/projects?q=code+review&category=developer-tools&technology=react&sort=popular&page=2",
    );
  });

  it("omits empty and default values when filters are cleared", () => {
    expect(
      buildProjectDiscoveryHref(filters, {
        category: null,
        page: 1,
        q: "",
        sort: "newest",
        technology: null,
      }),
    ).toBe("/projects");
  });
});
