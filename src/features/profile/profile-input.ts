import { z } from "zod";

const usernameMessage =
  "Use 3–30 lowercase letters, numbers, or underscores.";

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

const profileFormSchema = z.object({
  bio: optionalText(1000, "Keep your bio to 1,000 characters or fewer."),
  displayName: z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : ""),
    z
      .string()
      .min(1, "Enter your display name.")
      .max(80, "Keep your display name to 80 characters or fewer."),
  ),
  headline: optionalText(
    120,
    "Keep your headline to 120 characters or fewer.",
  ),
  location: optionalText(
    100,
    "Keep your location to 100 characters or fewer.",
  ),
  username: z.preprocess(
    (value) =>
      typeof value === "string" ? value.trim().toLowerCase() : "",
    z.string().regex(/^[a-z0-9][a-z0-9_]{1,28}[a-z0-9]$/, usernameMessage),
  ),
});

export type ProfileInput = {
  bio: string | null;
  display_name: string;
  headline: string | null;
  is_public: true;
  location: string | null;
  username: string;
};

export type ProfileFieldErrors = Partial<
  Record<"bio" | "displayName" | "headline" | "location" | "username", string[]>
>;

export type ProfileInputResult =
  | { data: ProfileInput; success: true }
  | { fieldErrors: ProfileFieldErrors; success: false };

export function parseProfileFormData(formData: FormData): ProfileInputResult {
  const result = profileFormSchema.safeParse({
    bio: formData.get("bio"),
    displayName: formData.get("displayName"),
    headline: formData.get("headline"),
    location: formData.get("location"),
    username: formData.get("username"),
  });

  if (!result.success) {
    return {
      fieldErrors: z.flattenError(result.error)
        .fieldErrors as ProfileFieldErrors,
      success: false,
    };
  }

  return {
    data: {
      bio: result.data.bio,
      display_name: result.data.displayName,
      headline: result.data.headline,
      is_public: true,
      location: result.data.location,
      username: result.data.username,
    },
    success: true,
  };
}
