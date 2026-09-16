import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PublicProjectCard } from "./public-project-card";

const projectId = "550e8400-e29b-41d4-a716-446655440000";
const coverUrl =
  "https://example.supabase.co/storage/v1/object/public/project-images/user/project/cover.webp";

const project = {
  category: { id: 2, name: "Developer Tool", slug: "developer-tool" },
  coverImage: {
    alt_text: "TaskFlow planning board",
    height: 720,
    id: "1f2df258-437d-40dc-b94a-6fb16452aa2c",
    sort_order: 0,
    width: 1280,
  },
  coverImageUrl: coverUrl,
  id: projectId,
  like_count: 42,
  owner: {
    avatarUrl: "https://cdn.test/alex.webp",
    display_name: "Alex Morgan",
    username: "alexmorgan",
  },
  published_at: "2026-09-14T12:00:00.000Z",
  summary: "Plan and ship focused work.",
  technologies: [
    { id: 2, name: "Next.js", slug: "next-js" },
    { id: 1, name: "React", slug: "react" },
  ],
  title: "TaskFlow",
};

describe("PublicProjectCard", () => {
  it("renders an equal-height responsive project link with ordered public metadata", () => {
    render(<PublicProjectCard project={project} />);

    const link = screen.getByRole("link", { name: "View TaskFlow" });
    const article = within(link).getByRole("article", { name: "TaskFlow" });
    const technologyItems = within(article).getAllByRole("listitem");

    expect(link).toHaveAttribute("href", `/projects/${projectId}`);
    expect(link).toHaveClass("h-full", "focus-visible:outline-2");
    expect(article).toHaveClass("flex", "h-full", "min-w-0", "flex-col");
    expect(within(article).getByText("Developer Tool")).toBeInTheDocument();
    expect(
      within(article).getByText("Plan and ship focused work."),
    ).toBeInTheDocument();
    expect(within(article).getByText("Alex Morgan")).toBeInTheDocument();
    expect(within(article).getByText("@alexmorgan")).toBeInTheDocument();
    expect(within(article).getByText("42 likes")).toBeInTheDocument();
    expect(technologyItems.map((item) => item.textContent)).toEqual([
      "Next.js",
      "React",
    ]);

    const image = within(article).getByRole("img", {
      name: "TaskFlow planning board",
    });
    const renderedSource = new URL(
      image.getAttribute("src") ?? "",
      "http://localhost",
    );
    expect(renderedSource.searchParams.get("url")).toBe(coverUrl);
  });

  it("uses the shared deterministic branded fallback when no cover is available", () => {
    render(
      <PublicProjectCard
        project={{ ...project, coverImage: null, coverImageUrl: null }}
      />,
    );

    expect(
      screen.getByRole("img", { name: "TaskFlow project cover" }),
    ).toHaveTextContent("DevHub");
  });
});
