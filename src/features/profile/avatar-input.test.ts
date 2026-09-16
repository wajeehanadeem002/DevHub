import { describe, expect, it } from "vitest";

import { AVATAR_MAX_BYTES, parseAvatarFormData } from "./avatar-input";

function avatarForm(file: File) {
  const formData = new FormData();
  formData.set("avatar", file);
  return formData;
}

describe("parseAvatarFormData", () => {
  it("accepts JPEG, PNG, and WebP files with matching extensions", () => {
    const cases = [
      ["portrait.jpg", "image/jpeg", "jpg"],
      ["portrait.PNG", "image/png", "png"],
      ["portrait.webp", "image/webp", "webp"],
    ] as const;

    for (const [name, type, extension] of cases) {
      const file = new File(["image-bytes"], name, { type });
      expect(parseAvatarFormData(avatarForm(file))).toEqual({
        data: { extension, file, mimeType: type },
        success: true,
      });
    }
  });

  it("rejects an absent or empty avatar", () => {
    expect(parseAvatarFormData(new FormData())).toEqual({
      fieldError: "Choose an avatar image to upload.",
      success: false,
    });

    const emptyFile = new File([], "portrait.jpg", { type: "image/jpeg" });
    expect(parseAvatarFormData(avatarForm(emptyFile))).toEqual({
      fieldError: "Choose a non-empty avatar image.",
      success: false,
    });
  });

  it("rejects files larger than two megabytes", () => {
    const file = new File(
      [new Uint8Array(AVATAR_MAX_BYTES + 1)],
      "portrait.png",
      { type: "image/png" },
    );

    expect(parseAvatarFormData(avatarForm(file))).toEqual({
      fieldError: "Keep your avatar image at 2 MB or smaller.",
      success: false,
    });
  });

  it("rejects unsupported types and misleading file extensions", () => {
    const gif = new File(["gif"], "portrait.gif", { type: "image/gif" });
    expect(parseAvatarFormData(avatarForm(gif))).toEqual({
      fieldError: "Use a JPEG, PNG, or WebP image.",
      success: false,
    });

    const misleading = new File(["png"], "portrait.jpg", {
      type: "image/png",
    });
    expect(parseAvatarFormData(avatarForm(misleading))).toEqual({
      fieldError: "The file extension must match the image type.",
      success: false,
    });
  });
});
