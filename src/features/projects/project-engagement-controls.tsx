"use client";

import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";

import {
  setProjectLikedAction,
  setProjectSavedAction,
} from "./project-engagement-actions";

export type ProjectEngagementControlsProps = {
  initialLikeCount: number;
  initialLiked: boolean;
  initialSaved: boolean;
  isOwner: boolean;
  isSignedIn: boolean;
  projectId: string;
};

type EligibleProjectEngagementControlsProps = Pick<
  ProjectEngagementControlsProps,
  "initialLikeCount" | "initialLiked" | "initialSaved" | "projectId"
>;

const buttonClassName =
  "inline-flex min-h-10 items-center justify-center rounded-xl border px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a6a52] disabled:cursor-not-allowed disabled:opacity-60";

function EligibleProjectEngagementControls({
  initialLikeCount,
  initialLiked,
  initialSaved,
  projectId,
}: EligibleProjectEngagementControlsProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [saved, setSaved] = useState(initialSaved);
  const [likeCount, setLikeCount] = useState(Math.max(0, initialLikeCount));
  const [message, setMessage] = useState("");
  const [likePending, setLikePending] = useState(false);
  const [savePending, setSavePending] = useState(false);
  const [, startLikeTransition] = useTransition();
  const [, startSaveTransition] = useTransition();

  function updateLike() {
    const previousLiked = liked;
    const previousCount = likeCount;
    const requestedLiked = !liked;

    setLiked(requestedLiked);
    setLikeCount(Math.max(0, likeCount + (requestedLiked ? 1 : -1)));
    setMessage("");
    setLikePending(true);

    startLikeTransition(async () => {
      try {
        const result = await setProjectLikedAction(projectId, requestedLiked);

        if (result.status === "success") {
          setLiked(result.liked);
          setLikeCount(Math.max(0, result.likeCount));
        } else {
          setLiked(previousLiked);
          setLikeCount(previousCount);
          setMessage(result.message);
        }
      } catch (error) {
        unstable_rethrow(error);
        setLiked(previousLiked);
        setLikeCount(previousCount);
        setMessage("We couldn't update this project's like. Please try again.");
      } finally {
        setLikePending(false);
      }
    });
  }

  function updateSave() {
    const previousSaved = saved;
    const requestedSaved = !saved;

    setSaved(requestedSaved);
    setMessage("");
    setSavePending(true);

    startSaveTransition(async () => {
      try {
        const result = await setProjectSavedAction(projectId, requestedSaved);

        if (result.status === "success") {
          setSaved(result.saved);
        } else {
          setSaved(previousSaved);
          setMessage(result.message);
        }
      } catch (error) {
        unstable_rethrow(error);
        setSaved(previousSaved);
        setMessage(
          "We couldn't update this project's saved state. Please try again.",
        );
      } finally {
        setSavePending(false);
      }
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          aria-label="Like project"
          aria-pressed={liked}
          className={`${buttonClassName} ${
            liked
              ? "border-[#8a6a52] bg-[#8a6a52] text-[#fcfaf5] hover:bg-[#3b2f27]"
              : "border-[#d8c3a8] bg-[#fcfaf5] text-[#594b41] hover:border-[#8a6a52] hover:bg-[#e9ded0]"
          }`}
          disabled={likePending}
          onClick={updateLike}
          type="button"
        >
          {liked ? "Liked" : "Like"}
        </button>
        <span className="text-sm font-semibold text-[#6d513d]">
          {likeCount} likes
        </span>
        <button
          aria-label="Save project"
          aria-pressed={saved}
          className={`${buttonClassName} ${
            saved
              ? "border-[#3b2f27] bg-[#3b2f27] text-[#fcfaf5] hover:bg-[#8a6a52]"
              : "border-[#d8c3a8] bg-[#fcfaf5] text-[#594b41] hover:border-[#8a6a52] hover:bg-[#e9ded0]"
          }`}
          disabled={savePending}
          onClick={updateSave}
          type="button"
        >
          {saved ? "Saved" : "Save"}
        </button>
      </div>
      {message ? (
        <p
          aria-live="polite"
          className="mt-3 rounded-xl border border-[#c99b8c] bg-[#fbf0ea] px-4 py-3 text-sm text-[#6f3027]"
          role="status"
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}

export function ProjectEngagementControls({
  initialLikeCount,
  initialLiked,
  initialSaved,
  isOwner,
  isSignedIn,
  projectId,
}: ProjectEngagementControlsProps): ReactNode {
  if (!isSignedIn) {
    const returnTo = `/projects/${projectId}`;

    return (
      <Link
        className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#d8c3a8] bg-[#fcfaf5] px-4 text-sm font-semibold text-[#594b41] transition-colors hover:border-[#8a6a52] hover:bg-[#e9ded0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a6a52]"
        href={`/sign-in?returnTo=${encodeURIComponent(returnTo)}`}
      >
        Sign in to like or save
      </Link>
    );
  }

  if (isOwner) {
    return (
      <p className="rounded-xl border border-[#ded3c7] bg-[#f9f5ee] px-4 py-3 text-sm font-semibold text-[#6d513d]">
        This is your project
      </p>
    );
  }

  return (
    <EligibleProjectEngagementControls
      initialLikeCount={initialLikeCount}
      initialLiked={initialLiked}
      initialSaved={initialSaved}
      projectId={projectId}
    />
  );
}
