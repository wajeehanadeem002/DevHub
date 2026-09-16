import { describe, expect, it } from "vitest";

import { parseProfileEditFormData } from "./profile-edit-input";

function validProfileFormData() {
  const formData = new FormData();
  formData.set("username", "  WajeehaNadeem  ");
  formData.set("displayName", "  Wajeeha Nadeem  ");
  formData.set("headline", "  Full Stack Developer  ");
  formData.set("bio", "  I build thoughtful web products.  ");
  formData.set("location", "  Lahore, Pakistan  ");
  formData.set("websiteUrl", "https://example.com");
  formData.set("githubUrl", "https://github.com/example");
  formData.set("linkedinUrl", "https://linkedin.com/in/example");
  formData.set("isPublic", "on");
  formData.append("technologyIds", "1");
  formData.append("technologyIds", "3");
  return formData;
}

describe("parseProfileEditFormData", () => {
  it("normalizes editable profile fields and curated technology IDs", () => {
    expect(parseProfileEditFormData(validProfileFormData())).toEqual({
      data: {
        bio: "I build thoughtful web products.",
        display_name: "Wajeeha Nadeem",
        github_url: "https://github.com/example",
        headline: "Full Stack Developer",
        is_public: true,
        linkedin_url: "https://linkedin.com/in/example",
        location: "Lahore, Pakistan",
        technologyIds: [1, 3],
        username: "wajeehanadeem",
        website_url: "https://example.com",
      },
      success: true,
    });
  });

  it("turns blank optional fields into null and an unchecked visibility into false", () => {
    const formData = validProfileFormData();
    formData.set("headline", "  ");
    formData.set("bio", "");
    formData.set("location", " ");
    formData.set("websiteUrl", "");
    formData.set("githubUrl", "");
    formData.set("linkedinUrl", "");
    formData.delete("isPublic");

    const result = parseProfileEditFormData(formData);

    expect(result).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          bio: null,
          github_url: null,
          headline: null,
          is_public: false,
          linkedin_url: null,
          location: null,
          website_url: null,
        }),
        success: true,
      }),
    );
  });

  it("rejects URL schemes that are unsafe on a public profile", () => {
    const formData = validProfileFormData();
    formData.set("websiteUrl", "javascript:alert(1)");

    expect(parseProfileEditFormData(formData)).toEqual({
      fieldErrors: {
        websiteUrl: ["Enter a complete http:// or https:// URL."],
      },
      success: false,
    });
  });

  it("rejects more than eight selected technologies", () => {
    const formData = validProfileFormData();
    formData.delete("technologyIds");
    for (let id = 1; id <= 9; id += 1) {
      formData.append("technologyIds", String(id));
    }

    expect(parseProfileEditFormData(formData)).toEqual({
      fieldErrors: {
        technologies: ["Choose no more than 8 technologies."],
      },
      success: false,
    });
  });

  it("rejects duplicate and malformed technology IDs", () => {
    const duplicateData = validProfileFormData();
    duplicateData.set("technologyIds", "1");
    duplicateData.append("technologyIds", "1");

    expect(parseProfileEditFormData(duplicateData)).toEqual({
      fieldErrors: {
        technologies: ["Choose each technology only once."],
      },
      success: false,
    });

    const malformedData = validProfileFormData();
    malformedData.set("technologyIds", "not-an-id");

    expect(parseProfileEditFormData(malformedData)).toEqual({
      fieldErrors: {
        technologies: ["Choose technologies from the available list."],
      },
      success: false,
    });
  });
});
