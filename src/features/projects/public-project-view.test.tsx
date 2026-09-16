import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("./project-engagement-actions", () => ({
  setProjectLikedAction: vi.fn(),
  setProjectSavedAction: vi.fn(),
}));

import type { ProjectEngagementState } from "./project-engagement";
import {
  PublicProjectView,
  type ResolvedPublicProject,
} from "./public-project-view";

const projectId = "550e8400-e29b-41d4-a716-446655440000";
const engagement: ProjectEngagementState = {
  isOwner: false,
  isSignedIn: true,
  liked: true,
  saved: true,
};
const project: ResolvedPublicProject = {
  category: { id: 2, name: "Developer Tool", slug: "developer-tool" },
  demo_url: "https://taskflow.example",
  description: "Plan together.\n<strong>Ship with focus.</strong>",
  id: projectId,
  like_count: 99,
  images: [
    {
      alt_text: "TaskFlow planning board",
      height: 720,
      id: "1f2df258-437d-40dc-b94a-6fb16452aa2c",
      publicUrl:
        "https://example.supabase.co/storage/v1/object/public/project-images/user/project/cover.webp",
      sort_order: 0,
      width: 1280,
    },
    {
      alt_text: "TaskFlow review screen",
      height: 900,
      id: "876e5d2f-2666-4dfe-aec0-8ba9a7a0b192",
      publicUrl:
        "https://example.supabase.co/storage/v1/object/public/project-images/user/project/review.webp",
      sort_order: 1,
      width: 1440,
    },
    {
      alt_text: "TaskFlow reports screen",
      height: 900,
      id: "b04aa9ad-3656-4cee-a8bb-7c7e8308ef1a",
      publicUrl:
        "https://example.supabase.co/storage/v1/object/public/project-images/user/project/reports.webp",
      sort_order: 2,
      width: 1440,
    },
  ],
  owner: {
    avatarUrl: null,
    display_name: "Alex Morgan",
    headline: "Full Stack Developer",
    username: "alexmorgan",
  },
  published_at: "2026-09-14T12:00:00.000Z",
  repository_url: "https://github.com/example/taskflow",
  summary: "Plan and ship focused work.",
  technologies: [
    { id: 2, name: "Next.js", slug: "next-js" },
    { id: 1, name: "React", slug: "react" },
  ],
  title: "TaskFlow",
};

describe("PublicProjectView", () => {
  it("renders one H1, plain-text details, safe links, owner identity, and ordered imagery", () => {
    const { container } = render(
      <PublicProjectView engagement={engagement} project={project} />,
    );

    expect(project.owner).not.toHaveProperty("user_id");
    for (const sensitiveValue of [
      "user_clerk_123",
      "user_clerk_123/avatar.webp",
      "user_clerk_123/taskflow/cover.webp",
    ]) {
      expect(container.textContent).not.toContain(sensitiveValue);
    }

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole("heading", { level: 1, name: "TaskFlow" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Plan and ship focused work.")).toBeInTheDocument();

    const description = screen.getByText((content) =>
      content.includes("<strong>Ship with focus.</strong>"),
    );
    expect(description).toHaveClass("whitespace-pre-line");
    expect(container.querySelector("strong")).toBeNull();

    expect(screen.getAllByText("Developer Tool")).toHaveLength(2);
    const technologies = screen.getByRole("list", {
      name: "TaskFlow technologies",
    });
    expect(
      within(technologies).getAllByRole("listitem").map((item) => item.textContent),
    ).toEqual(["Next.js", "React"]);

    expect(
      screen.getByRole("link", { name: "View Alex Morgan's profile" }),
    ).toHaveAttribute("href", "/developers/alexmorgan");
    for (const name of ["Live demo", "Repository"]) {
      expect(screen.getByRole("link", { name })).toHaveAttribute(
        "target",
        "_blank",
      );
      expect(screen.getByRole("link", { name })).toHaveAttribute(
        "rel",
        "nofollow noopener noreferrer",
      );
    }

    expect(
      screen.getByRole("img", { name: "TaskFlow planning board" }),
    ).toBeInTheDocument();
    const gallery = screen.getByRole("list", { name: "Project gallery" });
    expect(
      within(gallery).getAllByRole("img").map((image) => image.getAttribute("alt")),
    ).toEqual(["TaskFlow review screen", "TaskFlow reports screen"]);
  });

  it("renders the shared fallback and omits optional links and gallery without images", () => {
    render(
      <PublicProjectView
        engagement={engagement}
        project={{
          ...project,
          demo_url: null,
          images: [],
          repository_url: null,
        }}
      />,
    );

    expect(
      screen.getByRole("img", { name: "TaskFlow project cover" }),
    ).toHaveTextContent("DevHub");
    expect(screen.queryByRole("list", { name: "Project gallery" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Live demo" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Repository" })).toBeNull();
  });

  it("places initialized Like and Save controls after technologies and before external links in the sidebar", () => {
    render(<PublicProjectView engagement={engagement} project={project} />);

    const sidebar = screen.getByRole("complementary");
    const technologies = within(sidebar).getByRole("list", {
      name: "TaskFlow technologies",
    });
    const like = within(sidebar).getByRole("button", { name: "Like project" });
    const save = within(sidebar).getByRole("button", { name: "Save project" });
    expect(like).toHaveAttribute("aria-pressed", "true");
    expect(save).toHaveAttribute("aria-pressed", "true");
    expect(within(sidebar).getByText("99 likes")).toBeInTheDocument();
    for (const control of [like, save]) {
      expect(
        technologies.compareDocumentPosition(control) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      for (const name of ["Live demo", "Repository"]) {
        const link = within(sidebar).getByRole("link", { name });
        expect(
          control.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();
      }
    }
  });

  it("shows the owner notice without engagement buttons", () => {
    render(
      <PublicProjectView
        engagement={{ ...engagement, isOwner: true, liked: false, saved: false }}
        project={project}
      />,
    );

    expect(
      within(screen.getByRole("complementary")).getByText("This is your project"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Like project" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Save project" })).toBeNull();
  });

  it("offers signed-out visitors a sign-in link returning to this project", () => {
    render(
      <PublicProjectView
        engagement={{
          isOwner: false,
          isSignedIn: false,
          liked: false,
          saved: false,
        }}
        project={project}
      />,
    );

    expect(
      within(screen.getByRole("complementary")).getByRole("link", {
        name: "Sign in to like or save",
      }),
    ).toHaveAttribute(
      "href",
      "/sign-in?returnTo=%2Fprojects%2F550e8400-e29b-41d4-a716-446655440000",
    );
    expect(screen.queryByRole("button", { name: "Like project" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Save project" })).toBeNull();
  });
});
