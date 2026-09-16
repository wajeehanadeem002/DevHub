import type { Ref } from "react";

import type {
  ProjectCategory,
  ProjectTechnology,
} from "./project-data";
import type { ProjectFieldErrors } from "./project-input";

export type ProjectFieldValues = {
  categoryId?: number;
  demoUrl?: string | null;
  description?: string;
  repositoryUrl?: string | null;
  summary?: string;
  technologyIds?: readonly number[];
  title?: string;
};

const inputClassName =
  "mt-2 w-full rounded-xl border border-[#ded3c7] bg-[#fcfaf5] px-4 py-3 text-[15px] text-[#3b2f27] outline-none transition-[border-color,box-shadow,background-color] placeholder:text-[#75685d]/55 hover:border-[#d8c3a8] focus:border-[#8a6a52] focus:bg-white focus:shadow-[0_0_0_3px_rgba(138,106,82,0.12)]";

function FieldError({ errors, id }: { errors: string[] | undefined; id: string }) {
  return errors?.length ? (
    <p className="mt-2 text-sm text-[#8a3f32]" id={id}>
      {errors[0]}
    </p>
  ) : null;
}

function describedBy(
  fieldErrors: ProjectFieldErrors,
  field: keyof ProjectFieldErrors,
  helpId?: string,
) {
  return [helpId, fieldErrors[field]?.length ? `${field}-error` : undefined]
    .filter(Boolean)
    .join(" ") || undefined;
}

export function ProjectFields({
  categories,
  detailsHeadingRef,
  fieldErrors,
  mode,
  onTechnologyChange,
  selectedTechnologyIds = [],
  technologies,
  technologiesLegendRef,
  values = {},
}: {
  categories: ProjectCategory[];
  detailsHeadingRef?: Ref<HTMLHeadingElement>;
  fieldErrors: ProjectFieldErrors;
  mode: "details" | "technologies";
  onTechnologyChange?: (technologyId: number, checked: boolean) => void;
  selectedTechnologyIds?: readonly number[];
  technologies: ProjectTechnology[];
  technologiesLegendRef?: Ref<HTMLLegendElement>;
  values?: ProjectFieldValues;
}) {
  if (mode === "technologies") {
    const atLimit = selectedTechnologyIds.length >= 8;

    return (
      <fieldset
        aria-describedby={describedBy(
          fieldErrors,
          "technologyIds",
          "technologyIds-help",
        )}
        aria-invalid={Boolean(fieldErrors.technologyIds)}
      >
        <legend
          className="text-2xl font-semibold tracking-[-0.035em] text-[#3b2f27]"
          ref={technologiesLegendRef}
          tabIndex={-1}
        >
          Technologies
        </legend>
        <p className="mt-2 text-sm leading-6 text-[#75685d]" id="technologyIds-help">
          Choose between 1 and 8 technologies that best describe the project.
        </p>
        <p className="mt-2 text-xs font-semibold text-[#8a6a52]">
          {selectedTechnologyIds.length} of 8 technologies selected
        </p>
        <div className="mt-5 flex flex-wrap gap-2.5">
          {technologies.map((technology) => {
            const selected = selectedTechnologyIds.includes(technology.id);
            return (
              <label className="cursor-pointer" key={technology.id}>
                <input
                  checked={selected}
                  className="peer sr-only"
                  disabled={atLimit && !selected}
                  name="technologyIds"
                  onChange={(event) =>
                    onTechnologyChange?.(technology.id, event.target.checked)
                  }
                  type="checkbox"
                  value={technology.id}
                />
                <span className="inline-flex min-h-10 items-center rounded-full border border-[#ded3c7] bg-[#f9f5ee] px-4 text-sm font-medium text-[#594b41] transition-[border-color,background-color,color] hover:border-[#d8c3a8] peer-checked:border-[#8a6a52] peer-checked:bg-[#8a6a52] peer-checked:text-[#fcfaf5] peer-disabled:cursor-not-allowed peer-disabled:opacity-45 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#8a6a52]">
                  {technology.name}
                </span>
              </label>
            );
          })}
        </div>
        <FieldError errors={fieldErrors.technologyIds} id="technologyIds-error" />
      </fieldset>
    );
  }

  return (
    <section aria-labelledby="project-details-title">
      <h2
        className="text-2xl font-semibold tracking-[-0.035em] text-[#3b2f27]"
        id="project-details-title"
        ref={detailsHeadingRef}
        tabIndex={-1}
      >
        Project details
      </h2>
      <p className="mt-2 text-sm leading-6 text-[#75685d]">
        Start with a clear, plain-text overview. You can refine it before publishing.
      </p>

      <div className="mt-6 space-y-5">
        <div>
          <label className="text-sm font-semibold text-[#3b2f27]" htmlFor="title">
            Project title
          </label>
          <input
            aria-describedby={describedBy(fieldErrors, "title", "title-help")}
            aria-invalid={Boolean(fieldErrors.title)}
            className={inputClassName}
            defaultValue={values.title ?? ""}
            id="title"
            maxLength={120}
            name="title"
            required
          />
          <p className="mt-2 text-xs leading-5 text-[#75685d]" id="title-help">
            Up to 120 characters.
          </p>
          <FieldError errors={fieldErrors.title} id="title-error" />
        </div>

        <div>
          <label className="text-sm font-semibold text-[#3b2f27]" htmlFor="summary">
            Project summary
          </label>
          <textarea
            aria-describedby={describedBy(fieldErrors, "summary", "summary-help")}
            aria-invalid={Boolean(fieldErrors.summary)}
            className={`${inputClassName} min-h-24 resize-y`}
            defaultValue={values.summary ?? ""}
            id="summary"
            maxLength={240}
            name="summary"
            required
          />
          <p className="mt-2 text-xs leading-5 text-[#75685d]" id="summary-help">
            A concise overview, up to 240 characters.
          </p>
          <FieldError errors={fieldErrors.summary} id="summary-error" />
        </div>

        <div>
          <label className="text-sm font-semibold text-[#3b2f27]" htmlFor="description">
            Project description
          </label>
          <textarea
            aria-describedby={describedBy(
              fieldErrors,
              "description",
              "description-help",
            )}
            aria-invalid={Boolean(fieldErrors.description)}
            className={`${inputClassName} min-h-48 resize-y`}
            defaultValue={values.description ?? ""}
            id="description"
            maxLength={10_000}
            name="description"
            required
          />
          <p className="mt-2 text-xs leading-5 text-[#75685d]" id="description-help">
            Plain text only, up to 10,000 characters. Markdown and HTML are not used.
          </p>
          <FieldError errors={fieldErrors.description} id="description-error" />
        </div>

        <fieldset
          aria-describedby={describedBy(fieldErrors, "categoryId", "categoryId-help")}
          aria-invalid={Boolean(fieldErrors.categoryId)}
        >
          <legend className="text-sm font-semibold text-[#3b2f27]">Category</legend>
          <p className="mt-2 text-xs leading-5 text-[#75685d]" id="categoryId-help">
            Choose exactly one curated category.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {categories.map((category) => (
              <label
                className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-[#ded3c7] bg-[#f9f5ee] px-4 text-sm font-medium text-[#594b41] hover:border-[#d8c3a8]"
                key={category.id}
              >
                <input
                  className="size-4 accent-[#8a6a52] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a6a52]"
                  defaultChecked={values.categoryId === category.id}
                  name="categoryId"
                  required
                  type="radio"
                  value={category.id}
                />
                {category.name}
              </label>
            ))}
          </div>
          <FieldError errors={fieldErrors.categoryId} id="categoryId-error" />
        </fieldset>

        <div className="grid gap-5 sm:grid-cols-2">
          {(
            [
              ["demoUrl", "Live demo URL", values.demoUrl],
              ["repositoryUrl", "Repository URL", values.repositoryUrl],
            ] as const
          ).map(([name, label, value]) => (
            <div key={name}>
              <label className="text-sm font-semibold text-[#3b2f27]" htmlFor={name}>
                {label}
              </label>
              <input
                aria-describedby={describedBy(fieldErrors, name, `${name}-help`)}
                aria-invalid={Boolean(fieldErrors[name])}
                autoCapitalize="none"
                autoComplete="url"
                className={inputClassName}
                defaultValue={value ?? ""}
                id={name}
                maxLength={500}
                name={name}
                placeholder="https://"
                spellCheck={false}
                type="url"
              />
              <p className="mt-2 text-xs leading-5 text-[#75685d]" id={`${name}-help`}>
                Optional absolute HTTP or HTTPS URL.
              </p>
              <FieldError errors={fieldErrors[name]} id={`${name}-error`} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
