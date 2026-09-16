import { z } from "zod";

const usernameMessage =
  "Use 3–30 lowercase letters, numbers, or underscores.";
const urlMessage = "Enter a complete http:// or https:// URL.";

const optionalText = (maximum: number, message: string) =>
  z.preprocess(
    (value) => {
      if (typeof value !== "string") {
        return null;
      }

      const normalized = value.trim();
      return normalized.length > 0 ? normalized : null;
    },
    z.string().max(maximum, message).nullable(),
  );

const optionalUrl = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return null;
    }

    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  },
  z
    .string()
    .max(500, "Keep each profile link to 500 characters or fewer.")
    .refine((value) => {
      try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
      } catch {
        return false;
      }
    }, urlMessage)
    .nullable(),
);

const profileEditFormSchema = z.object({
  bio: optionalText(1000, "Keep your bio to 1,000 characters or fewer."),
  displayName: z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : ""),
    z
      .string()
      .min(1, "Enter your display name.")
      .max(80, "Keep your display name to 80 characters or fewer."),
  ),
  githubUrl: optionalUrl,
  headline: optionalText(
    120,
    "Keep your headline to 120 characters or fewer.",
  ),
  isPublic: z.boolean(),
  linkedinUrl: optionalUrl,
  location: optionalText(
    100,
    "Keep your location to 100 characters or fewer.",
  ),
  technologyIds: z
    .array(
      z
        .string()
        .regex(/^\d+$/, "Choose technologies from the available list.")
        .transform(Number)
        .pipe(
          z
            .number()
            .int()
            .positive("Choose technologies from the available list."),
        ),
    )
    .max(8, "Choose no more than 8 technologies.")
    .refine(
      (values) => new Set(values).size === values.length,
      "Choose each technology only once.",
    ),
  username: z.preprocess(
    (value) =>
      typeof value === "string" ? value.trim().toLowerCase() : "",
    z.string().regex(/^[a-z0-9][a-z0-9_]{1,28}[a-z0-9]$/, usernameMessage),
  ),
  websiteUrl: optionalUrl,
});

export type ProfileEditInput = {
  bio: string | null;
  display_name: string;
  github_url: string | null;
  headline: string | null;
  is_public: boolean;
  linkedin_url: string | null;
  location: string | null;
  technologyIds: number[];
  username: string;
  website_url: string | null;
};

export type ProfileEditField =
  | "bio"
  | "displayName"
  | "githubUrl"
  | "headline"
  | "linkedinUrl"
  | "location"
  | "technologies"
  | "username"
  | "websiteUrl";

export type ProfileEditFieldErrors = Partial<
  Record<ProfileEditField, string[]>
>;

export type ProfileEditInputResult =
  | { data: ProfileEditInput; success: true }
  | { fieldErrors: ProfileEditFieldErrors; success: false };

export function parseProfileEditFormData(
  formData: FormData,
): ProfileEditInputResult {
  const result = profileEditFormSchema.safeParse({
    bio: formData.get("bio"),
    displayName: formData.get("displayName"),
    githubUrl: formData.get("githubUrl"),
    headline: formData.get("headline"),
    isPublic: formData.get("isPublic") === "on",
    linkedinUrl: formData.get("linkedinUrl"),
    location: formData.get("location"),
    technologyIds: formData.getAll("technologyIds"),
    username: formData.get("username"),
    websiteUrl: formData.get("websiteUrl"),
  });

  if (!result.success) {
    const flattened = z.flattenError(result.error).fieldErrors;
    const { technologyIds, ...fieldErrors } = flattened;

    return {
      fieldErrors: {
        ...fieldErrors,
        ...(technologyIds ? { technologies: technologyIds } : {}),
      } as ProfileEditFieldErrors,
      success: false,
    };
  }

  return {
    data: {
      bio: result.data.bio,
      display_name: result.data.displayName,
      github_url: result.data.githubUrl,
      headline: result.data.headline,
      is_public: result.data.isPublic,
      linkedin_url: result.data.linkedinUrl,
      location: result.data.location,
      technologyIds: result.data.technologyIds,
      username: result.data.username,
      website_url: result.data.websiteUrl,
    },
    success: true,
  };
}
