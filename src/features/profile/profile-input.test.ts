import { describe, expect, it } from "vitest";

import { parseProfileFormData } from "./profile-input";

function profileFormData(overrides: Record<string, string> = {}) {
  const formData = new FormData();
  const values = {
    bio: "I build reliable products for the web.",
    displayName: "Alex Morgan",
    headline: "Full Stack Developer",
    location: "Lahore, Pakistan",
    username: " Alex_Morgan ",
    ...overrides,
  };

  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }

  return formData;
}

describe("profile onboarding input", () => {
  it("normalizes a valid professional profile for persistence", () => {
    const result = parseProfileFormData(profileFormData());

    expect(result).toEqual({
      data: {
        bio: "I build reliable products for the web.",
        display_name: "Alex Morgan",
        headline: "Full Stack Developer",
        is_public: true,
        location: "Lahore, Pakistan",
        username: "alex_morgan",
      },
      success: true,
    });
  });

  it.each([
    ["ab", "Use 3–30 lowercase letters, numbers, or underscores."],
    ["alex-morgan", "Use 3–30 lowercase letters, numbers, or underscores."],
    ["_alex", "Use 3–30 lowercase letters, numbers, or underscores."],
  ])("rejects the unsupported username %s", (username, message) => {
    const result = parseProfileFormData(profileFormData({ username }));

    expect(result).toEqual(
      expect.objectContaining({
        fieldErrors: expect.objectContaining({ username: [message] }),
        success: false,
      }),
    );
  });

  it("turns blank optional fields into null database values", () => {
    const result = parseProfileFormData(
      profileFormData({ bio: "  ", headline: "", location: " " }),
    );

    expect(result).toEqual({
      data: expect.objectContaining({
        bio: null,
        headline: null,
        location: null,
      }),
      success: true,
    });
  });

  it("reports field-level errors for required and oversized content", () => {
    const result = parseProfileFormData(
      profileFormData({
        bio: "a".repeat(1001),
        displayName: " ",
        headline: "h".repeat(121),
        location: "l".repeat(101),
      }),
    );

    expect(result).toEqual(
      expect.objectContaining({
        fieldErrors: {
          bio: ["Keep your bio to 1,000 characters or fewer."],
          displayName: ["Enter your display name."],
          headline: ["Keep your headline to 120 characters or fewer."],
          location: ["Keep your location to 100 characters or fewer."],
        },
        success: false,
      }),
    );
  });
});
