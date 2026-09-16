import { describe, expect, it } from "vitest";

import {
  MAX_PROJECT_IMAGE_BYTES,
  parseProjectImageFormData,
} from "./project-image-input";

function imageFormData(file?: File, altText = "TaskFlow dashboard") {
  const formData = new FormData();
  if (file) {
    formData.set("image", file);
  }
  formData.set("altText", altText);
  return formData;
}

function expectImageFieldError(
  result: ReturnType<typeof parseProjectImageFormData>,
  field: "altText" | "image",
  message: string,
) {
  expect(result).toEqual(
    expect.objectContaining({
      fieldErrors: expect.objectContaining({ [field]: [message] }),
      success: false,
    }),
  );
}

describe("parseProjectImageFormData", () => {
  it("rejects a missing file", () => {
    expectImageFieldError(
      parseProjectImageFormData(imageFormData()),
      "image",
      "Choose a project image to upload.",
    );
  });

  it("rejects an empty file", () => {
    const file = new File([], "dashboard.jpg", { type: "image/jpeg" });

    expectImageFieldError(
      parseProjectImageFormData(imageFormData(file)),
      "image",
      "Choose a non-empty project image.",
    );
  });

  it("rejects a file over 10 MB", () => {
    const file = new File(
      [new Uint8Array(MAX_PROJECT_IMAGE_BYTES + 1)],
      "dashboard.png",
      { type: "image/png" },
    );

    expectImageFieldError(
      parseProjectImageFormData(imageFormData(file)),
      "image",
      "Keep project images at 10 MB or smaller.",
    );
  });

  it("accepts a file at the inclusive 10 MB maximum", () => {
    const file = new File(
      [new Uint8Array(MAX_PROJECT_IMAGE_BYTES)],
      "dashboard.png",
      { type: "image/png" },
    );

    expect(parseProjectImageFormData(imageFormData(file))).toEqual({
      data: {
        altText: "TaskFlow dashboard",
        extension: "png",
        file,
      },
      success: true,
    });
  });

  it("rejects an unsupported MIME type", () => {
    const file = new File(["gif"], "dashboard.gif", { type: "image/gif" });

    expectImageFieldError(
      parseProjectImageFormData(imageFormData(file)),
      "image",
      "Use a JPEG, PNG, or WebP image.",
    );
  });

  it("rejects a MIME type that does not match the file extension", () => {
    const file = new File(["png"], "dashboard.jpg", { type: "image/png" });

    expectImageFieldError(
      parseProjectImageFormData(imageFormData(file)),
      "image",
      "The file extension must match the image type.",
    );
  });

  it("accepts an uppercase extension and normalizes it for storage", () => {
    const file = new File(["png"], "dashboard.PNG", { type: "image/png" });

    expect(
      parseProjectImageFormData(imageFormData(file, " Dashboard view ")),
    ).toEqual({
      data: { altText: "Dashboard view", extension: "png", file },
      success: true,
    });
  });

  it.each([
    ["blank", " ", "Describe the project image."],
    [
      "over 200 characters",
      "a".repeat(201),
      "Keep image alt text to 200 characters or fewer.",
    ],
  ])("rejects %s alt text", (_case, altText, message) => {
    const file = new File(["jpeg"], "dashboard.jpg", { type: "image/jpeg" });

    expectImageFieldError(
      parseProjectImageFormData(imageFormData(file, altText)),
      "altText",
      message,
    );
  });

  it("accepts alt text at the inclusive 200-character maximum", () => {
    const file = new File(["jpeg"], "dashboard.jpg", { type: "image/jpeg" });
    const altText = "a".repeat(200);

    expect(parseProjectImageFormData(imageFormData(file, altText))).toEqual({
      data: { altText, extension: "jpg", file },
      success: true,
    });
  });

  it.each([
    ["dashboard.jpg", "image/jpeg", "jpg"],
    ["dashboard.jpeg", "image/jpeg", "jpg"],
    ["dashboard.png", "image/png", "png"],
    ["dashboard.webp", "image/webp", "webp"],
  ] as const)(
    "accepts %s with matching metadata",
    (name, type, extension) => {
      const file = new File(["image-bytes"], name, { type });

      expect(parseProjectImageFormData(imageFormData(file))).toEqual({
        data: { altText: "TaskFlow dashboard", extension, file },
        success: true,
      });
    },
  );
});
