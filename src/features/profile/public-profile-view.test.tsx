import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PublicProfileView } from "./public-profile-view";
import type { PublicProfileDetails } from "./public-profile";

const profile: PublicProfileDetails = {
  bio: "I build reliable products for the web.",
  display_name: "Wajeeha Nadeem",
  github_url: "https://github.com/example",
  headline: "Full Stack Developer",
  linkedin_url: "https://linkedin.com/in/example",
  location: "Lahore, Pakistan",
  technologies: [
    { id: 1, name: "React", slug: "react" },
    { id: 2, name: "Next.js", slug: "next-js" },
  ],
  username: "wajeehanadeem",
  website_url: "https://example.com",
};

const project = {
  category: { id: 2, name: "Developer Tool", slug: "developer-tool" },
  coverImage: null,
  coverImageUrl: null,
  id: "550e8400-e29b-41d4-a716-446655440000",
  published_at: "2026-09-14T12:00:00.000Z",
  summary: "Plan and ship focused work.",
  technologies: [{ id: 1, name: "React", slug: "react" }],
  title: "TaskFlow",
};

describe("PublicProfileView", () => {
  it("renders the professional identity, technologies, safe links, and project empty state", () => {
    render(<PublicProfileView avatarUrl={null} profile={profile} projects={[]} />);

    expect(profile).not.toHaveProperty("avatar_path");
    expect(profile).not.toHaveProperty("user_id");

    expect(
      screen.getByRole("heading", { level: 1, name: "Wajeeha Nadeem" }),
    ).toBeInTheDocument();
    expect(screen.getByText("@wajeehanadeem")).toBeInTheDocument();
    expect(screen.getByText("Full Stack Developer")).toBeInTheDocument();
    expect(screen.getByText("I build reliable products for the web.")).toBeInTheDocument();
    expect(screen.getByText("Lahore, Pakistan")).toBeInTheDocument();
    expect(screen.getByText("React")).toBeInTheDocument();
    expect(screen.getByText("Next.js")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Website" })).toHaveAttribute(
      "rel",
      "nofollow noopener noreferrer",
    );
    expect(screen.getByRole("link", { name: "GitHub" })).toHaveAttribute(
      "target",
      "_blank",
    );
    expect(
      screen.getByRole("heading", { level: 2, name: "Projects" }),
    ).toBeInTheDocument();
    expect(screen.getByText("No published projects yet.")).toBeInTheDocument();
    expect(
      screen.getByText("This developer has not published any projects yet."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/when project creation becomes available/i),
    ).toBeNull();

    const hero = document.querySelector(
      'section[aria-labelledby="developer-name"]',
    );
    expect(hero).toHaveClass(
      "rounded-3xl",
      "border",
      "border-[#ded3c7]",
      "bg-[#fcfaf5]",
      "p-6",
      "sm:p-9",
      "lg:p-12",
    );
  });

  it("replaces only the projects branch with a responsive published-project grid", () => {
    const { container } = render(
      <PublicProfileView avatarUrl={null} profile={profile} projects={[project]} />,
    );

    const grid = screen.getByRole("list", { name: "Published projects" });
    expect(grid).toHaveClass("grid", "sm:grid-cols-2", "lg:grid-cols-3");
    expect(screen.getByRole("link", { name: "View TaskFlow" })).toHaveAttribute(
      "href",
      `/projects/${project.id}`,
    );
    expect(
      screen.getByRole("img", { name: "TaskFlow project cover" }),
    ).toHaveTextContent("DevHub");
    expect(screen.queryByText("No published projects yet.")).toBeNull();
    expect(
      container.querySelector('section[aria-labelledby="developer-name"]'),
    ).toBeInTheDocument();
  });

  it("omits empty optional profile sections without placeholders", () => {
    render(
      <PublicProfileView
        avatarUrl={null}
        profile={{
          ...profile,
          bio: null,
          github_url: null,
          headline: null,
          linkedin_url: null,
          location: null,
          technologies: [],
          website_url: null,
        }}
        projects={[]}
      />,
    );

    expect(screen.queryByRole("link", { name: "Website" })).toBeNull();
    expect(screen.queryByText("Technologies")).toBeNull();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Wajeeha Nadeem",
    );
  });
});
