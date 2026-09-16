"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import {
  initialProjectActionState,
  type ProjectActionState,
} from "./project-action-state";
import {
  publishProjectAction,
  unpublishProjectAction,
  updateProjectAction,
} from "./project-actions";
import type {
  OwnedProject,
  ProjectCategory,
  ProjectTechnology,
} from "./project-data";
import { ProjectDeleteForm } from "./project-delete-form";
import { ProjectFields } from "./project-fields";
import {
  ProjectImageManager,
  type ResolvedProjectImage,
} from "./project-image-manager";
import { ProjectStepper, type ProjectStep, projectSteps } from "./project-stepper";

export type EditorProject = Omit<OwnedProject, "images"> & {
  images: ResolvedProjectImage[];
};

function ActionMessage({ state }: { state: ProjectActionState }) {
  return state.message ? (
    <div
      aria-live="polite"
      className={`mb-6 rounded-xl border px-4 py-3 text-sm ${
        state.status === "error"
          ? "border-[#c99b8c] bg-[#fbf0ea] text-[#6f3027]"
          : "border-[#c9b89f] bg-[#f3ebdf] text-[#594536]"
      }`}
      role={state.status === "error" ? "alert" : "status"}
    >
      {state.message}
    </div>
  ) : null;
}

function PendingStatus({ children, pending }: { children: string; pending: boolean }) {
  return pending ? (
    <p aria-live="polite" className="sr-only" role="status">
      {children}
    </p>
  ) : null;
}

function PersistedProjectForm({
  categories,
  currentStep,
  project,
  technologies,
}: {
  categories: ProjectCategory[];
  currentStep: "details" | "technologies";
  project: EditorProject;
  technologies: ProjectTechnology[];
}) {
  const updateAction = updateProjectAction.bind(null, project.id);
  const [state, formAction, pending] = useActionState(
    updateAction,
    initialProjectActionState,
  );
  const [selectedTechnologyIds, setSelectedTechnologyIds] = useState<number[]>(
    project.technologyIds,
  );

  function changeTechnology(technologyId: number, checked: boolean) {
    setSelectedTechnologyIds((current) => {
      if (!checked) {
        return current.filter((id) => id !== technologyId);
      }
      return current.length >= 8 || current.includes(technologyId)
        ? current
        : [...current, technologyId];
    });
  }

  const values = {
    categoryId: project.category_id,
    demoUrl: project.demo_url,
    description: project.description,
    repositoryUrl: project.repository_url,
    summary: project.summary,
    technologyIds: project.technologyIds,
    title: project.title,
  };

  return (
    <form action={formAction} aria-label="Save project">
      <PendingStatus pending={pending}>Saving project changes.</PendingStatus>
      <ActionMessage state={state} />
      <div hidden={currentStep !== "details"}>
        <ProjectFields
          categories={categories}
          fieldErrors={state.fieldErrors}
          mode="details"
          technologies={technologies}
          values={values}
        />
      </div>
      <div hidden={currentStep !== "technologies"}>
        <ProjectFields
          categories={categories}
          fieldErrors={state.fieldErrors}
          mode="technologies"
          onTechnologyChange={changeTechnology}
          selectedTechnologyIds={selectedTechnologyIds}
          technologies={technologies}
          values={values}
        />
      </div>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[#ded3c7] pt-6">
        <Link
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#d8c3a8] px-5 text-sm font-semibold text-[#6d513d] hover:bg-[#f3ece2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a6a52]"
          href={`/dashboard/projects/${project.id}/edit?step=${
            currentStep === "details" ? "technologies" : "images"
          }`}
        >
          {currentStep === "details" ? "Next: technologies" : "Next: images"}
        </Link>
        <button
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#3b2f27] px-5 text-sm font-semibold text-[#fcfaf5] shadow-[0_10px_28px_rgba(59,47,39,0.14)] hover:bg-[#8a6a52] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a6a52] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={pending}
          type="submit"
        >
          {pending ? "Saving project…" : "Save project"}
        </button>
      </div>
    </form>
  );
}

function StatusForm({ project }: { project: EditorProject }) {
  const action = (
    project.status === "published"
      ? unpublishProjectAction
      : publishProjectAction
  ).bind(null, project.id);
  const [state, formAction, pending] = useActionState(
    action,
    initialProjectActionState,
  );
  const publish = project.status !== "published";

  return (
    <form action={formAction}>
      <PendingStatus pending={pending}>
        {publish ? "Publishing project." : "Unpublishing project."}
      </PendingStatus>
      <button
        className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#3b2f27] px-5 text-sm font-semibold text-[#fcfaf5] hover:bg-[#8a6a52] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a6a52] disabled:cursor-not-allowed disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending
          ? publish
            ? "Publishing project…"
            : "Unpublishing project…"
          : publish
            ? "Publish project"
            : "Unpublish project"}
      </button>
      {state.status === "error" ? <ActionMessage state={state} /> : null}
    </form>
  );
}

function ProjectReview({
  categories,
  project,
  technologies,
}: {
  categories: ProjectCategory[];
  project: EditorProject;
  technologies: ProjectTechnology[];
}) {
  const category = categories.find((item) => item.id === project.category_id);
  const selectedTechnologies = technologies.filter((technology) =>
    project.technologyIds.includes(technology.id),
  );

  return (
    <section aria-label="Project review">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8a6a52]">
        {project.status === "published" ? "Published" : "Draft"}
      </p>
      <h2 className="mt-3 text-3xl font-semibold tracking-[-0.045em] text-[#3b2f27]">
        {project.title}
      </h2>
      <p className="mt-3 text-lg leading-7 text-[#594b41]">{project.summary}</p>
      <p className="mt-6 whitespace-pre-line text-sm leading-7 text-[#75685d]">
        {project.description}
      </p>

      <dl className="mt-7 grid gap-5 border-y border-[#ded3c7] py-6 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-bold uppercase tracking-[0.14em] text-[#8a6a52]">Category</dt>
          <dd className="mt-2 text-sm font-semibold text-[#3b2f27]">
            {category?.name ?? "Uncategorized"}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-bold uppercase tracking-[0.14em] text-[#8a6a52]">Technologies</dt>
          <dd className="mt-2 flex flex-wrap gap-2">
            {selectedTechnologies.map((technology) => (
              <span
                className="rounded-full border border-[#ded3c7] bg-[#f9f5ee] px-3 py-1 text-xs font-semibold text-[#6d513d]"
                key={technology.id}
              >
                {technology.name}
              </span>
            ))}
          </dd>
        </div>
      </dl>

      <div className="mt-6 flex flex-wrap gap-3">
        {project.demo_url ? (
          <a
            className="text-sm font-semibold text-[#6d513d] underline decoration-[#d8c3a8] underline-offset-4"
            href={project.demo_url}
            rel="nofollow noopener noreferrer"
            target="_blank"
          >
            Live demo
          </a>
        ) : null}
        {project.repository_url ? (
          <a
            className="text-sm font-semibold text-[#6d513d] underline decoration-[#d8c3a8] underline-offset-4"
            href={project.repository_url}
            rel="nofollow noopener noreferrer"
            target="_blank"
          >
            Repository
          </a>
        ) : null}
      </div>

      <div className="mt-8 rounded-2xl border border-[#ded3c7] bg-[#f9f5ee] p-5">
        <p className="text-sm font-semibold text-[#3b2f27]">
          Images are optional for publishing.
        </p>
        <p className="mt-1 text-sm leading-6 text-[#75685d]">
          Publish now with the DevHub fallback, or return to Images to add visual context.
        </p>
      </div>

      <div className="mt-8 flex flex-wrap items-start justify-between gap-4 border-t border-[#ded3c7] pt-6">
        <div className="flex flex-wrap gap-3">
          <Link
            className="inline-flex min-h-11 items-center rounded-xl border border-[#d8c3a8] px-4 text-sm font-semibold text-[#6d513d] hover:bg-[#f3ece2]"
            href={`/dashboard/projects/${project.id}/edit?step=details`}
          >
            Back to details
          </Link>
          <Link
            className="inline-flex min-h-11 items-center rounded-xl border border-[#d8c3a8] px-4 text-sm font-semibold text-[#6d513d] hover:bg-[#f3ece2]"
            href={`/dashboard/projects/${project.id}/edit?step=images`}
          >
            Edit images
          </Link>
          {project.status === "published" ? (
            <Link
              className="inline-flex min-h-11 items-center rounded-xl border border-[#d8c3a8] px-4 text-sm font-semibold text-[#6d513d] hover:bg-[#f3ece2]"
              href={`/projects/${project.id}`}
            >
              View public project
            </Link>
          ) : null}
        </div>
        <StatusForm project={project} />
      </div>

      <div className="mt-10 border-t border-[#ded3c7] pt-8">
        <ProjectDeleteForm projectId={project.id} projectTitle={project.title} />
      </div>
    </section>
  );
}

export function EditProjectComposer({
  categories,
  currentStep,
  project,
  technologies,
}: {
  categories: ProjectCategory[];
  currentStep: ProjectStep;
  project: EditorProject;
  technologies: ProjectTechnology[];
}) {
  const category = categories.find((item) => item.id === project.category_id);
  const completedSteps = projectSteps
    .slice(0, projectSteps.findIndex((step) => step.id === currentStep))
    .map((step) => step.id);

  return (
    <div className="min-w-0">
      <ProjectStepper
        completedSteps={completedSteps}
        currentStep={currentStep}
        hrefForStep={(step) =>
          `/dashboard/projects/${project.id}/edit?step=${step}`
        }
      />

      <div className="mt-7 grid min-w-0 gap-6 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-[#ded3c7] bg-[#f9f5ee] p-5 lg:sticky lg:top-28 lg:self-start">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8a6a52]">Project summary</p>
          <p className="mt-3 break-words text-lg font-semibold text-[#3b2f27]">{project.title}</p>
          <p className="mt-2 text-sm leading-6 text-[#75685d]">{project.summary}</p>
          <dl className="mt-5 space-y-3 border-t border-[#ded3c7] pt-4 text-xs">
            <div>
              <dt className="text-[#8f8176]">Status</dt>
              <dd className="mt-1 font-semibold capitalize text-[#3b2f27]">{project.status}</dd>
            </div>
            <div>
              <dt className="text-[#8f8176]">Category</dt>
              <dd className="mt-1 font-semibold text-[#3b2f27]">{category?.name ?? "Uncategorized"}</dd>
            </div>
            <div>
              <dt className="text-[#8f8176]">Images</dt>
              <dd className="mt-1 font-semibold text-[#3b2f27]">{project.images.length} of 5</dd>
            </div>
          </dl>
        </aside>

        <div className="min-w-0 rounded-2xl border border-[#ded3c7] bg-[#fcfaf5] p-6 shadow-[0_18px_48px_rgba(59,47,39,0.06)] sm:p-8">
          {currentStep === "details" || currentStep === "technologies" ? (
            <PersistedProjectForm
              categories={categories}
              currentStep={currentStep}
              project={project}
              technologies={technologies}
            />
          ) : currentStep === "images" ? (
            <ProjectImageManager images={project.images} projectId={project.id} />
          ) : (
            <ProjectReview
              categories={categories}
              project={project}
              technologies={technologies}
            />
          )}
        </div>
      </div>
    </div>
  );
}
