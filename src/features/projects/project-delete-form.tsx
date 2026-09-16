"use client";

import { useActionState, useState } from "react";

import {
  initialProjectActionState,
  type ProjectActionState,
} from "./project-action-state";
import { deleteProjectAction } from "./project-actions";

export function ProjectDeleteForm({
  initialState = initialProjectActionState,
  projectId,
  projectTitle,
}: {
  initialState?: ProjectActionState;
  projectId: string;
  projectTitle: string;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const deleteAction = deleteProjectAction.bind(null, projectId);
  const [state, formAction, pending] = useActionState(deleteAction, initialState);

  return (
    <form
      action={formAction}
      aria-label={`Delete ${projectTitle}`}
      className="rounded-2xl border border-[#c99b8c] bg-[#fbf0ea] p-5"
    >
      <input name="projectId" type="hidden" value={projectId} />
      {pending ? (
        <p aria-live="polite" className="sr-only" role="status">
          Deleting project.
        </p>
      ) : null}
      <h3 className="text-lg font-semibold text-[#6f3027]">Delete project</h3>
      <p className="mt-2 text-sm leading-6 text-[#7a4b42]">
        This permanently removes the project, its technology links, and its image records.
      </p>
      <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-[#c99b8c] bg-[#fcfaf5] p-4 text-sm text-[#6f3027]">
        <input
          checked={confirmed}
          className="mt-0.5 size-4 accent-[#8a3f32] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a6a52]"
          name="confirmDelete"
          onChange={(event) => setConfirmed(event.target.checked)}
          type="checkbox"
        />
        I understand and want to permanently delete {projectTitle}.
      </label>
      {state.message || state.cleanupWarning ? (
        <div
          aria-live="polite"
          className="mt-4 rounded-xl border border-[#c99b8c] bg-[#fcfaf5] px-4 py-3 text-sm text-[#6f3027]"
          role={state.status === "error" ? "alert" : "status"}
        >
          {state.message ? <p>{state.message}</p> : null}
          {state.cleanupWarning ? <p className="mt-1">{state.cleanupWarning}</p> : null}
        </div>
      ) : null}
      <button
        className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl bg-[#8a3f32] px-4 text-sm font-semibold text-[#fcfaf5] hover:bg-[#6f3027] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a6a52] disabled:cursor-not-allowed disabled:opacity-50"
        disabled={!confirmed || pending}
        type="submit"
      >
        {pending ? "Deleting project…" : "Delete project"}
      </button>
    </form>
  );
}
