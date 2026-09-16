export const projectSteps = [
  { id: "details", label: "Details" },
  { id: "technologies", label: "Technologies" },
  { id: "images", label: "Images" },
  { id: "review", label: "Review" },
] as const;

export type ProjectStep = (typeof projectSteps)[number]["id"];

type ProjectStepperProps = {
  availableSteps?: readonly ProjectStep[];
  completedSteps?: readonly ProjectStep[];
  currentStep: ProjectStep;
  hrefForStep?: (step: ProjectStep) => string;
  onStepChange?: (step: ProjectStep) => void;
};

export function ProjectStepper({
  availableSteps = projectSteps.map((step) => step.id),
  completedSteps = [],
  currentStep,
  hrefForStep,
  onStepChange,
}: ProjectStepperProps) {
  return (
    <nav
      aria-label="Project creation steps"
      className="w-full max-w-full overflow-x-auto pb-2"
    >
      <ol className="flex min-w-max items-center gap-2" role="list">
        {projectSteps.map((step, index) => {
          const isCurrent = step.id === currentStep;
          const isCompleted = completedSteps.includes(step.id);
          const isAvailable = availableSteps.includes(step.id);
          const stateLabel = isCurrent
            ? "current"
            : isCompleted
              ? "completed"
              : "upcoming";
          const content = (
            <>
              <span
                aria-hidden="true"
                className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold ${
                  isCurrent
                    ? "bg-[#3b2f27] text-[#fcfaf5]"
                    : isCompleted
                      ? "bg-[#8a6a52] text-[#fcfaf5]"
                      : "bg-[#e9ded0] text-[#75685d]"
                }`}
              >
                {index + 1}
              </span>
              <span>{step.label}</span>
              <span className="sr-only">, {stateLabel}</span>
            </>
          );

          return (
            <li className="flex items-center gap-2" key={step.id}>
              {isAvailable && hrefForStep ? (
                <Link
                  aria-current={isCurrent ? "step" : undefined}
                  aria-label={`${step.label}, ${stateLabel}`}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-3.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a6a52] ${
                    isCurrent
                      ? "border-[#3b2f27] bg-[#3b2f27] text-[#fcfaf5]"
                      : "border-[#ded3c7] bg-[#fcfaf5] text-[#594b41] hover:border-[#8a6a52]"
                  }`}
                  href={hrefForStep(step.id)}
                >
                  {content}
                </Link>
              ) : isAvailable ? (
                <button
                  aria-current={isCurrent ? "step" : undefined}
                  aria-label={`${step.label}, ${stateLabel}`}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-3.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a6a52] ${
                    isCurrent
                      ? "border-[#3b2f27] bg-[#3b2f27] text-[#fcfaf5]"
                      : "border-[#ded3c7] bg-[#fcfaf5] text-[#594b41] hover:border-[#8a6a52]"
                  }`}
                  onClick={() => onStepChange?.(step.id)}
                  type="button"
                >
                  {content}
                </button>
              ) : (
                <span
                  aria-label={`${step.label}, ${stateLabel}`}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#ded3c7] bg-[#f9f5ee] px-3.5 text-sm font-semibold text-[#8f8176]"
                >
                  {content}
                </span>
              )}
              {index < projectSteps.length - 1 ? (
                <span aria-hidden="true" className="h-px w-5 bg-[#d8c3a8]" />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
import Link from "next/link";
