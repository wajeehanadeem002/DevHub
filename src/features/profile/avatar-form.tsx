"use client";

import { useActionState } from "react";

import { AVATAR_ACCEPT } from "./avatar-input";
import { removeAvatarAction, uploadAvatarAction } from "./profile-actions";
import {
  initialAvatarActionState,
  type AvatarActionState,
} from "./profile-edit-state";
import { ProfileAvatar } from "./profile-avatar";

function ActionMessage({ state }: { state: AvatarActionState }) {
  if (!state.message) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      className={
        state.status === "success"
          ? "mt-4 rounded-xl border border-[#c9b89f] bg-[#f3ebdf] px-4 py-3 text-sm text-[#594536]"
          : "mt-4 rounded-xl border border-[#c99b8c] bg-[#fbf0ea] px-4 py-3 text-sm text-[#6f3027]"
      }
      role={state.status === "error" ? "alert" : "status"}
    >
      {state.message}
    </div>
  );
}

export function AvatarForm({
  avatarUrl,
  displayName,
  hasAvatar,
  removeInitialState = initialAvatarActionState,
  uploadInitialState = initialAvatarActionState,
}: {
  avatarUrl: string | null;
  displayName: string;
  hasAvatar: boolean;
  removeInitialState?: AvatarActionState;
  uploadInitialState?: AvatarActionState;
}) {
  const [uploadState, uploadAction, uploadPending] = useActionState(
    uploadAvatarAction,
    uploadInitialState,
  );
  const [removeState, removeAction, removePending] = useActionState(
    removeAvatarAction,
    removeInitialState,
  );

  return (
    <div className="mt-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <ProfileAvatar
          avatarUrl={avatarUrl}
          displayName={displayName}
          size="lg"
        />
        <div>
          <p className="font-semibold text-[#3b2f27]">{displayName}</p>
          <p className="mt-1 text-sm leading-6 text-[#75685d]">
            JPEG, PNG, or WebP. 2 MB maximum.
          </p>
        </div>
      </div>

      <form action={uploadAction} className="mt-6" encType="multipart/form-data">
        <label className="text-sm font-semibold text-[#3b2f27]" htmlFor="avatar">
          Choose avatar image
        </label>
        <input
          accept={AVATAR_ACCEPT}
          aria-describedby={uploadState.fieldError ? "avatar-help avatar-error" : "avatar-help"}
          aria-invalid={Boolean(uploadState.fieldError)}
          className="mt-2 block w-full rounded-xl border border-[#ded3c7] bg-[#f9f5ee] p-2.5 text-sm text-[#75685d] file:mr-3 file:rounded-lg file:border-0 file:bg-[#e9ded0] file:px-3 file:py-2 file:font-semibold file:text-[#3b2f27] hover:border-[#d8c3a8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a6a52]"
          id="avatar"
          name="avatar"
          type="file"
        />
        <p className="mt-2 text-xs leading-5 text-[#75685d]" id="avatar-help">
          Uploading a new image replaces your current DevHub avatar.
        </p>
        {uploadState.fieldError ? (
          <p className="mt-2 text-sm text-[#8a3f32]" id="avatar-error">
            {uploadState.fieldError}
          </p>
        ) : null}
        <button
          className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl bg-[#8a6a52] px-4 text-sm font-semibold text-[#fcfaf5] transition-colors hover:bg-[#3b2f27] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a6a52] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={uploadPending}
          type="submit"
        >
          {uploadPending ? "Uploading…" : "Upload avatar"}
        </button>
        <ActionMessage state={uploadState} />
      </form>

      {hasAvatar ? (
        <form action={removeAction} className="mt-5 border-t border-[#ded3c7] pt-5">
          <button
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#c99b8c] bg-[#fcfaf5] px-4 text-sm font-semibold text-[#7a3e32] transition-colors hover:bg-[#fbf0ea] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a6a52] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={removePending}
            type="submit"
          >
            {removePending ? "Removing…" : "Remove avatar"}
          </button>
          <ActionMessage state={removeState} />
        </form>
      ) : null}
    </div>
  );
}
