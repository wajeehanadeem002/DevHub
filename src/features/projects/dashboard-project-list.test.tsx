import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { CurrentProject } from "./project-data";
import { DashboardProjectList } from "./dashboard-project-list";

const publishedId = "550e8400-e29b-41d4-a716-446655440000";
const draftId = "6ba7b810-9dad-41d1-80b4-00c04fd430c8";

const projects: Array<CurrentProject & { coverImageUrl: string | null }> = [
  {
    category: { id: 2, name: "Developer Tool", slug: "developer-tool" },
    coverImage: {
      alt_text: "TaskFlow planning board",
      height: 720,
      id: "6d08fd19-2701-41ab-9b2a-c827ba66685b",
      sort_order: 0,
      storage_path: "user/taskflow/cover.webp",
      width: 1280,
    },
    coverImageUrl:
      "https://example.supabase.co/storage/v1/object/public/project-images/user/taskflow/cover.webp",
    id: publishedId,
    status: "published",
    summary: "Plan and ship focused work.",
    technologies: [
      { id: 2, name: "Next.js", slug: "next-js" },
      { id: 1, name: "React", slug: "react" },
    ],
    title: "TaskFlow",
    updated_at: "2026-09-14T10:00:00.000Z",
  },
  {
    category: null,
    coverImage: null,
    coverImageUrl: null,
    id: draftId,
    status: "draft",
    summary: "Share small code examples.",
    technologies: [],
    title: "SnippetBox",
    updated_at: "2026-09-13T10:00:00.000Z",
  },
];

describe("DashboardProjectList", () => {
  it("renders an accessible no-projects state with a creation route", () => {
    render(<DashboardProjectList projects={[]} />);

    expect(
      screen.getByRole("heading", { name: "No projects yet" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/start with a draft/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create project" })).toHaveAttribute(
      "href",
      "/dashboard/projects/new",
    );
  });

  it("renders responsive equal-height project cards and ordered metadata", () => {
    const { container } = render(<DashboardProjectList projects={projects} />);
    const taskFlowCard = screen.getByRole("article", { name: "TaskFlow" });
    const snippetBoxCard = screen.getByRole("article", { name: "SnippetBox" });

    expect(container.querySelector("ul")).toHaveClass("sm:grid-cols-2");
    expect(taskFlowCard).toHaveClass("h-full", "min-w-0", "overflow-hidden");
    expect(snippetBoxCard).toHaveClass(
      "h-full",
      "min-w-0",
      "overflow-hidden",
    );
    expect(within(taskFlowCard).getByText("Published")).toBeInTheDocument();
    expect(within(taskFlowCard).getByText("Developer Tool")).toBeInTheDocument();
    expect(
      within(taskFlowCard).getByText("Plan and ship focused work."),
    ).toBeInTheDocument();
    expect(within(taskFlowCard).getByText("Updated Sep 14, 2026")).toBeInTheDocument();
    expect(
      within(taskFlowCard).getByRole("img", {
        name: "TaskFlow planning board",
      }),
    ).toBeInTheDocument();

    const badges = within(taskFlowCard).getAllByRole("listitem");
    expect(badges.map((badge) => badge.textContent)).toEqual([
      "Next.js",
      "React",
    ]);

    expect(within(snippetBoxCard).getByText("Draft")).toBeInTheDocument();
    expect(within(snippetBoxCard).getByText("Uncategorized")).toBeInTheDocument();
    expect(
      within(snippetBoxCard).getByText("Share small code examples."),
    ).toBeInTheDocument();
    expect(within(snippetBoxCard).getByText("No technologies selected")).toBeInTheDocument();
  });

  it("keeps the published status treatment inside the Mocha and Cream palette", () => {
    render(<DashboardProjectList projects={projects} />);
    const publishedStatus = within(
      screen.getByRole("article", { name: "TaskFlow" }),
    ).getByText("Published");

    expect(publishedStatus).toHaveClass(
      "bg-[#d8c3a8]",
      "text-[#3b2f27]",
    );
    expect(publishedStatus.className).not.toMatch(/#(?:dfe8d9|4f6847)/i);
  });

  it("exposes owner editing for every project and public viewing only when published", () => {
    render(<DashboardProjectList projects={projects} />);
    const taskFlowCard = screen.getByRole("article", { name: "TaskFlow" });
    const snippetBoxCard = screen.getByRole("article", { name: "SnippetBox" });

    expect(within(taskFlowCard).getByRole("link", { name: "Edit" })).toHaveAttribute(
      "href",
      `/dashboard/projects/${publishedId}/edit`,
    );
    expect(
      within(taskFlowCard).getByRole("link", { name: "View project" }),
    ).toHaveAttribute("href", `/projects/${publishedId}`);
    expect(within(snippetBoxCard).getByRole("link", { name: "Edit" })).toHaveAttribute(
      "href",
      `/dashboard/projects/${draftId}/edit`,
    );
    expect(
      within(snippetBoxCard).queryByRole("link", { name: "View project" }),
    ).toBeNull();
  });
});
