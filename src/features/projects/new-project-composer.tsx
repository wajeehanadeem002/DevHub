"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  initialProjectActionState,
  type ProjectActionState,
} from "./project-action-state";
import { createProjectAction } from "./project-actions";
import type { ProjectCategory, ProjectTechnology } from "./project-data";
import { ProjectFields } from "./project-fields";
import { ProjectStepper, type ProjectStep } from "./project-stepper";

const detailsFields = [
  "title",
  "summary",
  "description",
  "categoryId",
  "demoUrl",
  "repositoryUrl",
] as const;

export function NewProjectComposer({
  categories,
  initialState = initialProjectActionState,
  technologies,
}: {
  categories: ProjectCategory[];
  initialState?: ProjectActionState;
  technologies: ProjectTechnology[];
}) {
  const [step, setStep] = useState<ProjectStep>("details");
  const [selectedTechnologyIds, setSelectedTechnologyIds] = useState<number[]>([]);
  const detailsHeadingRef = useRef<HTMLHeadingElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const returnToDetailsRef = useRef(false);
  const technologiesLegendRef = useRef<HTMLLegendElement>(null);
  const focusStepRef = useRef<ProjectStep | null>(null);

  function moveToStep(nextStep: ProjectStep) {
    focusStepRef.current = nextStep;
    setStep(nextStep);
  }

  async function submitProject(
    previousState: ProjectActionState,
    formData: FormData,
  ) {
    const nextState = await createProjectAction(previousState, formData);
    returnToDetailsRef.current = detailsFields.some(
      (field) => nextState.fieldErrors[field]?.length,
    );
    return nextState;
  }

  const [state, formAction, pending] = useActionState(
    submitProject,
    initialState,
  );

  useEffect(() => {
    if (!returnToDetailsRef.current) {
      return;
    }
    returnToDetailsRef.current = false;
    moveToStep("details");
  }, [state]);

  useEffect(() => {
    if (focusStepRef.current !== step) {
      return;
    }
    focusStepRef.current = null;
    (step === "details" ? detailsHeadingRef : technologiesLegendRef).current?.focus();
  }, [step]);

  function detailsAreValid() {
    const form = formRef.current;
    if (!form || !form.reportValidity()) {
      const firstInvalidControl = Array.from(form?.elements ?? []).find(
        (control): control is HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement =>
          (control instanceof HTMLInputElement ||
            control instanceof HTMLSelectElement ||
            control instanceof HTMLTextAreaElement) &&
          !control.validity.valid,
      );
      firstInvalidControl?.focus();
      return false;
    }
    return true;
  }

  function requestStepChange(nextStep: ProjectStep) {
    if (
      step === "details" &&
      nextStep === "technologies" &&
      !detailsAreValid()
    ) {
      return;
    }
    moveToStep(nextStep);
  }

  function changeTechnology(technologyId: number, checked: boolean) {
    setSelectedTechnologyIds((current) => {
      if (!checked) {
        return current.filter((id) => id !== technologyId);
      }
      if (current.includes(technologyId) || current.length >= 8) {
        return current;
      }
      return [...current, technologyId];
    });
  }

  return (
    <div className="min-w-0">
      <ProjectStepper
        availableSteps={["details", "technologies"]}
        completedSteps={step === "technologies" ? ["details"] : []}
        currentStep={step}
        onStepChange={requestStepChange}
      />

      <form
        action={formAction}
        aria-label="Create project"
        className="mt-7 rounded-2xl border border-[#ded3c7] bg-[#fcfaf5] p-6 shadow-[0_18px_48px_rgba(59,47,39,0.06)] sm:p-8"
        ref={formRef}
      >
        {pending ? (
          <p aria-live="polite" className="sr-only" role="status">
            Creating project draft.
          </p>
        ) : null}
        {state.message ? (
          <div
            aria-live="polite"
            className={
              state.status === "success"
                ? "mb-6 rounded-xl border border-[#c9b89f] bg-[#f3ebdf] px-4 py-3 text-sm text-[#594536]"
                : "mb-6 rounded-xl border border-[#c99b8c] bg-[#fbf0ea] px-4 py-3 text-sm text-[#6f3027]"
            }
            role={state.status === "error" ? "alert" : "status"}
          >
            {state.message}
          </div>
        ) : null}

        <div hidden={step !== "details"}>
          <ProjectFields
            categories={categories}
            detailsHeadingRef={detailsHeadingRef}
            fieldErrors={state.fieldErrors}
            mode="details"
            technologies={technologies}
          />
        </div>
        <div hidden={step !== "technologies"}>
          <ProjectFields
            categories={categories}
            fieldErrors={state.fieldErrors}
            mode="technologies"
            onTechnologyChange={changeTechnology}
            selectedTechnologyIds={selectedTechnologyIds}
            technologies={technologies}
            technologiesLegendRef={technologiesLegendRef}
          />
        </div>

        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-[#ded3c7] pt-6 sm:flex-row sm:items-center sm:justify-between">
          {step === "technologies" ? (
            <button
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#d8c3a8] px-5 text-sm font-semibold text-[#6d513d] hover:bg-[#f3ece2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a6a52]"
              onClick={() => moveToStep("details")}
              type="button"
            >
              Back to details
            </button>
          ) : (
            <span />
          )}
          {step === "details" ? (
            <button
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#3b2f27] px-5 text-sm font-semibold text-[#fcfaf5] hover:bg-[#8a6a52] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a6a52]"
              onClick={() => requestStepChange("technologies")}
              type="button"
            >
              Continue to technologies
            </button>
          ) : (
            <button
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#3b2f27] px-5 text-sm font-semibold text-[#fcfaf5] shadow-[0_10px_28px_rgba(59,47,39,0.14)] hover:bg-[#8a6a52] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a6a52] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={pending}
              type="submit"
            >
              {pending ? "Creating draft…" : "Create draft and add images"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
