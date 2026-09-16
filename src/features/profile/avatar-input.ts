export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AVATAR_ACCEPT = "image/jpeg,image/png,image/webp";

const acceptedAvatarTypes = {
  "image/jpeg": { extension: "jpg", sourceExtensions: ["jpg", "jpeg"] },
  "image/png": { extension: "png", sourceExtensions: ["png"] },
  "image/webp": { extension: "webp", sourceExtensions: ["webp"] },
} as const;

export type AvatarExtension =
  (typeof acceptedAvatarTypes)[keyof typeof acceptedAvatarTypes]["extension"];
export type AvatarMimeType = keyof typeof acceptedAvatarTypes;

export type AvatarInputResult =
  | {
      data: {
        extension: AvatarExtension;
        file: File;
        mimeType: AvatarMimeType;
      };
      success: true;
    }
  | { fieldError: string; success: false };

function isAvatarMimeType(value: string): value is AvatarMimeType {
  return value in acceptedAvatarTypes;
}

export function parseAvatarFormData(formData: FormData): AvatarInputResult {
  const value = formData.get("avatar");

  if (!(value instanceof File)) {
    return {
      fieldError: "Choose an avatar image to upload.",
      success: false,
    };
  }

  if (value.size === 0) {
    return {
      fieldError: "Choose a non-empty avatar image.",
      success: false,
    };
  }

  if (value.size > AVATAR_MAX_BYTES) {
    return {
      fieldError: "Keep your avatar image at 2 MB or smaller.",
      success: false,
    };
  }

  if (!isAvatarMimeType(value.type)) {
    return {
      fieldError: "Use a JPEG, PNG, or WebP image.",
      success: false,
    };
  }

  const fileExtension = value.name.toLowerCase().split(".").pop() ?? "";
  const typeConfig = acceptedAvatarTypes[value.type];

  if (!(typeConfig.sourceExtensions as readonly string[]).includes(fileExtension)) {
    return {
      fieldError: "The file extension must match the image type.",
      success: false,
    };
  }

  return {
    data: {
      extension: typeConfig.extension,
      file: value,
      mimeType: value.type,
    },
    success: true,
  };
}
