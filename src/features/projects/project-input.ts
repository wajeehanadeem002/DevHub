import { z } from "zod";

const invalidUrlMessage = "Enter a valid HTTP or HTTPS URL.";

const trimmedRequiredText = (
  maximum: number,
  requiredMessage: string,
  maximumMessage: string,
) =>
  z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : ""),
    z.string().min(1, requiredMessage).max(maximum, maximumMessage),
  );

const optionalHttpUrl = z.preprocess(
  (value) => {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value === "string") {
      const normalized = value.trim();
      return normalized.length > 0 ? normalized : null;
    }

    return value;
  },
  z
    .string({ error: invalidUrlMessage })
    .max(500, "Keep URLs to 500 characters or fewer.")
    .refine((value) => {
      try {
        const url = new URL(value);
        return (
          (url.protocol === "http:" || url.protocol === "https:") &&
          url.username === "" &&
          url.password === ""
        );
      } catch {
        return false;
      }
    }, invalidUrlMessage)
    .nullable(),
);

function isPositiveIntegerString(value: unknown): value is string {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value.trim())) {
    return false;
  }

  return Number.isSafeInteger(Number(value.trim()));
}

const categoryIdSchema = z
  .array(z.unknown())
  .superRefine((values, context) => {
    if (
      values.length === 0 ||
      (values.length === 1 &&
        typeof values[0] === "string" &&
        values[0].trim() === "")
    ) {
      context.addIssue({
        code: "custom",
        message: "Choose a project category.",
      });
      return;
    }

    if (values.length !== 1) {
      context.addIssue({
        code: "custom",
        message: "Choose exactly one project category.",
      });
      return;
    }

    if (!isPositiveIntegerString(values[0])) {
      context.addIssue({
        code: "custom",
        message: "Choose a valid project category.",
      });
    }
  })
  .transform((values) => Number((values[0] as string).trim()));

const technologyIdsSchema = z
  .array(z.unknown())
  .superRefine((values, context) => {
    if (values.length === 0) {
      context.addIssue({
        code: "custom",
        message: "Choose at least one technology.",
      });
      return;
    }

    if (values.length > 8) {
      context.addIssue({
        code: "custom",
        message: "Choose no more than 8 technologies.",
      });
      return;
    }

    if (!values.every(isPositiveIntegerString)) {
      context.addIssue({
        code: "custom",
        message: "Choose valid technologies.",
      });
      return;
    }

    const normalizedValues = values.map((value) => Number(value.trim()));
    if (new Set(normalizedValues).size !== normalizedValues.length) {
      context.addIssue({
        code: "custom",
        message: "Choose each technology only once.",
      });
    }
  })
  .transform((values) =>
    (values as string[]).map((value) => Number(value.trim())),
  );

const projectFormSchema = z.object({
  categoryId: categoryIdSchema,
  demoUrl: optionalHttpUrl,
  description: trimmedRequiredText(
    10_000,
    "Enter a project description.",
    "Keep the project description to 10,000 characters or fewer.",
  ),
  repositoryUrl: optionalHttpUrl,
  summary: trimmedRequiredText(
    240,
    "Enter a project summary.",
    "Keep the project summary to 240 characters or fewer.",
  ),
  technologyIds: technologyIdsSchema,
  title: trimmedRequiredText(
    120,
    "Enter a project title.",
    "Keep the project title to 120 characters or fewer.",
  ),
});

const projectIdSchema = z.preprocess(
  (value) => (typeof value === "string" ? value.trim().toLowerCase() : ""),
  z.uuid(),
);

export type ProjectInput = {
  category_id: number;
  demo_url: string | null;
  description: string;
  repository_url: string | null;
  summary: string;
  technologyIds: number[];
  title: string;
};

export type ProjectFieldErrors = Partial<
  Record<
    | "categoryId"
    | "demoUrl"
    | "description"
    | "repositoryUrl"
    | "summary"
    | "technologyIds"
    | "title",
    string[]
  >
>;

export type ProjectInputResult =
  | { data: ProjectInput; success: true }
  | { fieldErrors: ProjectFieldErrors; success: false };

export type ProjectIdResult =
  | { data: string; success: true }
  | { error: string; success: false };

export function parseProjectFormData(formData: FormData): ProjectInputResult {
  const result = projectFormSchema.safeParse({
    categoryId: formData.getAll("categoryId"),
    demoUrl: formData.get("demoUrl"),
    description: formData.get("description"),
    repositoryUrl: formData.get("repositoryUrl"),
    summary: formData.get("summary"),
    technologyIds: formData.getAll("technologyIds"),
    title: formData.get("title"),
  });

  if (!result.success) {
    return {
      fieldErrors: z.flattenError(result.error)
        .fieldErrors as ProjectFieldErrors,
      success: false,
    };
  }

  return {
    data: {
      category_id: result.data.categoryId,
      demo_url: result.data.demoUrl,
      description: result.data.description,
      repository_url: result.data.repositoryUrl,
      summary: result.data.summary,
      technologyIds: result.data.technologyIds,
      title: result.data.title,
    },
    success: true,
  };
}

export function parseProjectId(value: string): ProjectIdResult {
  const result = projectIdSchema.safeParse(value);

  if (!result.success) {
    return { error: "Invalid project ID.", success: false };
  }

  return { data: result.data, success: true };
}
