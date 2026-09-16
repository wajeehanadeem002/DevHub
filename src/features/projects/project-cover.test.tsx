import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProjectCover } from "./project-cover";

describe("ProjectCover", () => {
  it("renders a stored remote image with its trusted accessibility metadata", () => {
    const remoteCoverUrl =
      "https://example.supabase.co/storage/v1/object/public/project-images/user/project/cover.webp";

    render(
      <ProjectCover
        image={{
          alt_text: "TaskFlow planning board",
          height: 720,
          id: "6d08fd19-2701-41ab-9b2a-c827ba66685b",
          sort_order: 0,
          storage_path: "user/project/cover.webp",
          width: 1280,
        }}
        imageUrl={remoteCoverUrl}
        title="TaskFlow"
      />,
    );

    const image = screen.getByRole("img", {
      name: "TaskFlow planning board",
    });
    const renderedSource = new URL(
      image.getAttribute("src") ?? "",
      "http://localhost",
    );

    expect(image).toHaveAttribute("width", "1280");
    expect(image).toHaveAttribute("height", "720");
    expect(renderedSource.searchParams.get("url")).toBe(remoteCoverUrl);
  });

  it.each([
    [null, null],
    [
      {
        alt_text: "Unavailable TaskFlow cover",
        height: 720,
        id: "6d08fd19-2701-41ab-9b2a-c827ba66685b",
        sort_order: 0,
        storage_path: "user/project/cover.webp",
        width: 1280,
      },
      null,
    ],
  ])("renders a deterministic branded fallback without a usable remote image", (image, imageUrl) => {
    render(
      <ProjectCover image={image} imageUrl={imageUrl} title="TaskFlow" />,
    );

    expect(
      screen.getByRole("img", { name: "TaskFlow project cover" }),
    ).toHaveTextContent("DevHub");
    expect(
      screen.queryByRole("img", { name: "Unavailable TaskFlow cover" }),
    ).toBeNull();
  });
});
