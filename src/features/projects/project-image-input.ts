import { z } from "zod";

export const MAX_PROJECT_IMAGES = 5;
export const MAX_PROJECT_IMAGE_BYTES = 10 * 1024 * 1024;

const acceptedProjectImageTypes = {
  "image/jpeg": { extension: "jpg", sourceExtensions: ["jpg", "jpeg"] },
  "image/png": { extension: "png", sourceExtensions: ["png"] },
  "image/webp": { extension: "webp", sourceExtensions: ["webp"] },
} as const;

const altTextSchema = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : ""),
  z
    .string()
    .min(1, "Describe the project image.")
    .max(200, "Keep image alt text to 200 characters or fewer."),
);

export type ProjectImageExtension =
  (typeof acceptedProjectImageTypes)[keyof typeof acceptedProjectImageTypes][
    "extension"
  ];
export type ProjectImageMimeType = keyof typeof acceptedProjectImageTypes;

export type ProjectImageFieldErrors = Partial<
  Record<"altText" | "image", string[]>
>;

export type ProjectImageInputResult =
  | {
      data: {
        altText: string;
        extension: ProjectImageExtension;
        file: File;
      };
      success: true;
    }
  | { fieldErrors: ProjectImageFieldErrors; success: false };

function isProjectImageMimeType(
  value: string,
): value is ProjectImageMimeType {
  return value in acceptedProjectImageTypes;
}

function validateProjectImage(
  value: FormDataEntryValue | null,
):
  | { extension: ProjectImageExtension; file: File }
  | { error: string } {
  if (!(value instanceof File)) {
    return { error: "Choose a project image to upload." };
  }

  if (value.size === 0) {
    return { error: "Choose a non-empty project image." };
  }

  if (value.size > MAX_PROJECT_IMAGE_BYTES) {
    return { error: "Keep project images at 10 MB or smaller." };
  }

  if (!isProjectImageMimeType(value.type)) {
    return { error: "Use a JPEG, PNG, or WebP image." };
  }

  const fileExtension = value.name.toLowerCase().split(".").pop() ?? "";
  const typeConfig = acceptedProjectImageTypes[value.type];

  if (
    !(typeConfig.sourceExtensions as readonly string[]).includes(fileExtension)
  ) {
    return { error: "The file extension must match the image type." };
  }

  return { extension: typeConfig.extension, file: value };
}

export function parseProjectImageFormData(
  formData: FormData,
): ProjectImageInputResult {
  const imageResult = validateProjectImage(formData.get("image"));
  const altTextResult = altTextSchema.safeParse(formData.get("altText"));
  const fieldErrors: ProjectImageFieldErrors = {};

  if ("error" in imageResult) {
    fieldErrors.image = [imageResult.error];
  }

  if (!altTextResult.success) {
    fieldErrors.altText = altTextResult.error.issues.map(
      (issue) => issue.message,
    );
  }

  if ("error" in imageResult || !altTextResult.success) {
    return { fieldErrors, success: false };
  }

  return {
    data: {
      altText: altTextResult.data,
      extension: imageResult.extension,
      file: imageResult.file,
    },
    success: true,
  };
}
