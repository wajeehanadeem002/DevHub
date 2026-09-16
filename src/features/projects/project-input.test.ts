import { describe, expect, it } from "vitest";

import { parseProjectFormData, parseProjectId } from "./project-input";

const validValues = {
  categoryId: "1",
  demoUrl: "https://taskflow.example",
  description: "TaskFlow helps teams plan focused work.",
  repositoryUrl: "https://github.com/example/taskflow",
  summary: "Modern productivity platform for teams.",
  title: "TaskFlow",
};

function projectFormData(
  overrides: Record<string, string | readonly string[]> = {},
) {
  const formData = new FormData();
  const values = { ...validValues, ...overrides };

  for (const [key, value] of Object.entries(values)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        formData.append(key, item);
      }
    } else {
      formData.set(key, value as string);
    }
  }

  if (!("technologyIds" in overrides)) {
    for (const technologyId of ["1", "2", "7"]) {
      formData.append("technologyIds", technologyId);
    }
  }

  return formData;
}

function expectFieldError(
  result: ReturnType<typeof parseProjectFormData>,
  field: string,
  message: string,
) {
  expect(result).toEqual(
    expect.objectContaining({
      fieldErrors: expect.objectContaining({ [field]: [message] }),
      success: false,
    }),
  );
}

describe("parseProjectFormData", () => {
  it("normalizes a valid project payload and ignores client-owned status", () => {
    const formData = projectFormData({
      categoryId: " 1 ",
      demoUrl: " https://taskflow.example ",
      description: " TaskFlow helps teams plan focused work. ",
      repositoryUrl: " https://github.com/example/taskflow ",
      status: "published",
      summary: " Modern productivity platform for teams. ",
      technologyIds: ["1", " 2 ", "7"],
      title: " TaskFlow ",
    });

    expect(parseProjectFormData(formData)).toEqual({
      data: {
        category_id: 1,
        demo_url: "https://taskflow.example",
        description: "TaskFlow helps teams plan focused work.",
        repository_url: "https://github.com/example/taskflow",
        summary: "Modern productivity platform for teams.",
        technologyIds: [1, 2, 7],
        title: "TaskFlow",
      },
      success: true,
    });
  });

  it("normalizes empty optional URLs to null", () => {
    const result = parseProjectFormData(
      projectFormData({ demoUrl: " ", repositoryUrl: "" }),
    );

    expect(result).toEqual({
      data: expect.objectContaining({ demo_url: null, repository_url: null }),
      success: true,
    });
  });

  it.each(["demoUrl", "repositoryUrl"])(
    "rejects a File submitted for %s instead of silently treating it as empty",
    (field) => {
      const formData = projectFormData();
      formData.set(field, new File(["not-a-url"], "url.txt"));

      expectFieldError(
        parseProjectFormData(formData),
        field,
        "Enter a valid HTTP or HTTPS URL.",
      );
    },
  );

  it.each([
    ["title", 120],
    ["summary", 240],
    ["description", 10_000],
  ] as const)("accepts %s at its inclusive maximum", (field, maximum) => {
    const value = "a".repeat(maximum);
    const result = parseProjectFormData(projectFormData({ [field]: value }));

    expect(result).toEqual({
      data: expect.objectContaining({ [field]: value }),
      success: true,
    });
  });

  it.each(["demoUrl", "repositoryUrl"])(
    "accepts %s at the inclusive 500-character maximum",
    (field) => {
      const url = `https://example.com/${"a".repeat(480)}`;
      const result = parseProjectFormData(projectFormData({ [field]: url }));
      const outputField = field === "demoUrl" ? "demo_url" : "repository_url";

      expect(url).toHaveLength(500);
      expect(result).toEqual({
        data: expect.objectContaining({ [outputField]: url }),
        success: true,
      });
    },
  );

  it("accepts exactly 8 unique positive integer technologies", () => {
    const result = parseProjectFormData(
      projectFormData({
        technologyIds: ["1", "2", "3", "4", "5", "6", "7", "8"],
      }),
    );

    expect(result).toEqual({
      data: expect.objectContaining({
        technologyIds: [1, 2, 3, 4, 5, 6, 7, 8],
      }),
      success: true,
    });
  });

  it.each([
    ["blank", " ", "Enter a project title."],
    [
      "over 120 characters",
      "t".repeat(121),
      "Keep the project title to 120 characters or fewer.",
    ],
  ])("rejects a %s title", (_case, title, message) => {
    expectFieldError(
      parseProjectFormData(projectFormData({ title })),
      "title",
      message,
    );
  });

  it("rejects a summary over 240 characters", () => {
    expectFieldError(
      parseProjectFormData(projectFormData({ summary: "s".repeat(241) })),
      "summary",
      "Keep the project summary to 240 characters or fewer.",
    );
  });

  it("rejects a blank summary", () => {
    expectFieldError(
      parseProjectFormData(projectFormData({ summary: " " })),
      "summary",
      "Enter a project summary.",
    );
  });

  it.each([
    ["blank", " ", "Enter a project description."],
    [
      "over 10,000 characters",
      "d".repeat(10_001),
      "Keep the project description to 10,000 characters or fewer.",
    ],
  ])("rejects a %s description", (_case, description, message) => {
    expectFieldError(
      parseProjectFormData(projectFormData({ description })),
      "description",
      message,
    );
  });

  it.each([
    ["missing", "", "Choose a project category."],
    ["malformed", "1.5", "Choose a valid project category."],
    ["non-positive", "0", "Choose a valid project category."],
  ])("rejects a %s category", (_case, categoryId, message) => {
    expectFieldError(
      parseProjectFormData(projectFormData({ categoryId })),
      "categoryId",
      message,
    );
  });

  it("rejects more than one submitted category", () => {
    const formData = projectFormData();
    formData.append("categoryId", "2");

    expectFieldError(
      parseProjectFormData(formData),
      "categoryId",
      "Choose exactly one project category.",
    );
  });

  it.each([
    [[], "Choose at least one technology."],
    [
      ["1", "2", "3", "4", "5", "6", "7", "8", "9"],
      "Choose no more than 8 technologies.",
    ],
    [["1", "2", "2"], "Choose each technology only once."],
    [["1", "typescript"], "Choose valid technologies."],
    [["0", "2"], "Choose valid technologies."],
  ])("rejects invalid technology selections %#", (technologyIds, message) => {
    expectFieldError(
      parseProjectFormData(projectFormData({ technologyIds })),
      "technologyIds",
      message,
    );
  });

  it.each(["demoUrl", "repositoryUrl"])(
    "rejects javascript URLs for %s",
    (field) => {
      expectFieldError(
        parseProjectFormData(projectFormData({ [field]: "javascript:alert(1)" })),
        field,
        "Enter a valid HTTP or HTTPS URL.",
      );
    },
  );

  it.each(["demoUrl", "repositoryUrl"])(
    "rejects credentials embedded in %s",
    (field) => {
      expectFieldError(
        parseProjectFormData(
          projectFormData({ [field]: "https://user:secret@example.com/path" }),
        ),
        field,
        "Enter a valid HTTP or HTTPS URL.",
      );
    },
  );

  it.each(["demoUrl", "repositoryUrl"])(
    "rejects relative and over-500-character values for %s",
    (field) => {
      expectFieldError(
        parseProjectFormData(projectFormData({ [field]: "/projects/taskflow" })),
        field,
        "Enter a valid HTTP or HTTPS URL.",
      );

      expectFieldError(
        parseProjectFormData(
          projectFormData({ [field]: `https://example.com/${"a".repeat(481)}` }),
        ),
        field,
        "Keep URLs to 500 characters or fewer.",
      );
    },
  );
});

describe("parseProjectId", () => {
  it("returns the canonical representation of a valid UUID", () => {
    expect(parseProjectId(" 550E8400-E29B-41D4-A716-446655440000 ")).toEqual({
      data: "550e8400-e29b-41d4-a716-446655440000",
      success: true,
    });
  });

  it("returns a stable error for an invalid UUID without throwing", () => {
    expect(parseProjectId("not-a-project-id")).toEqual({
      error: "Invalid project ID.",
      success: false,
    });
  });
});
