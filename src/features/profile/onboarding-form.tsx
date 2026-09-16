"use client";

import { useActionState } from "react";

import {
  completeProfileOnboarding,
} from "./onboarding-action";
import {
  initialOnboardingActionState,
  type OnboardingActionState,
} from "./onboarding-state";

const inputClassName =
  "mt-2 w-full rounded-xl border border-[#ded3c7] bg-[#fcfaf5] px-4 py-3 text-[15px] text-[#3b2f27] outline-none transition-[border-color,box-shadow,background-color] placeholder:text-[#75685d]/55 hover:border-[#d8c3a8] focus:border-[#8a6a52] focus:bg-white focus:shadow-[0_0_0_3px_rgba(138,106,82,0.12)]";

function FieldError({
  errors,
  id,
}: {
  errors: string[] | undefined;
  id: string;
}) {
  if (!errors?.length) {
    return null;
  }

  return (
    <p className="mt-2 text-sm text-[#8a3f32]" id={id}>
      {errors[0]}
    </p>
  );
}

export function OnboardingForm({
  initialState = initialOnboardingActionState,
}: {
  initialState?: OnboardingActionState;
}) {
  const [state, formAction, pending] = useActionState(
    completeProfileOnboarding,
    initialState,
  );
  const usernameErrors = state.fieldErrors.username;

  return (
    <form action={formAction} className="mt-8 space-y-6">
      {state.status === "error" && state.message ? (
        <div
          className="rounded-xl border border-[#c99b8c] bg-[#fbf0ea] px-4 py-3 text-sm text-[#6f3027]"
          role="alert"
        >
          {state.message}
        </div>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label
            className="text-sm font-semibold text-[#3b2f27]"
            htmlFor="username"
          >
            Username
          </label>
          <div className="relative">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[#8a6a52]"
            >
              @
            </span>
            <input
              aria-describedby={
                usernameErrors
                  ? "username-help username-error"
                  : "username-help"
              }
              aria-invalid={Boolean(usernameErrors)}
              autoCapitalize="none"
              autoComplete="username"
              className={`${inputClassName} pl-8`}
              id="username"
              maxLength={30}
              name="username"
              pattern="[a-z0-9][a-z0-9_]{1,28}[a-z0-9]"
              placeholder="alexmorgan"
              required
              spellCheck={false}
            />
          </div>
          <p className="mt-2 text-xs leading-5 text-[#75685d]" id="username-help">
            3–30 lowercase letters, numbers, or underscores.
          </p>
          <FieldError errors={usernameErrors} id="username-error" />
        </div>

        <div>
          <label
            className="text-sm font-semibold text-[#3b2f27]"
            htmlFor="displayName"
          >
            Display name
          </label>
          <input
            aria-describedby={
              state.fieldErrors.displayName ? "display-name-error" : undefined
            }
            aria-invalid={Boolean(state.fieldErrors.displayName)}
            autoComplete="name"
            className={inputClassName}
            id="displayName"
            maxLength={80}
            name="displayName"
            placeholder="Alex Morgan"
            required
          />
          <FieldError
            errors={state.fieldErrors.displayName}
            id="display-name-error"
          />
        </div>
      </div>

      <div>
        <label
          className="text-sm font-semibold text-[#3b2f27]"
          htmlFor="headline"
        >
          Professional headline
        </label>
        <input
          aria-describedby={
            state.fieldErrors.headline ? "headline-error" : "headline-help"
          }
          aria-invalid={Boolean(state.fieldErrors.headline)}
          className={inputClassName}
          id="headline"
          maxLength={120}
          name="headline"
          placeholder="Full Stack Developer"
        />
        <p className="mt-2 text-xs leading-5 text-[#75685d]" id="headline-help">
          A clear role helps the right people discover you.
        </p>
        <FieldError errors={state.fieldErrors.headline} id="headline-error" />
      </div>

      <div>
        <label
          className="text-sm font-semibold text-[#3b2f27]"
          htmlFor="bio"
        >
          Short bio
        </label>
        <textarea
          aria-describedby={state.fieldErrors.bio ? "bio-error" : "bio-help"}
          aria-invalid={Boolean(state.fieldErrors.bio)}
          className={`${inputClassName} min-h-32 resize-y`}
          id="bio"
          maxLength={1000}
          name="bio"
          placeholder="Share what you build, the problems you enjoy solving, and the kind of work you care about."
        />
        <p className="mt-2 text-xs leading-5 text-[#75685d]" id="bio-help">
          Plain text only. You can refine this later.
        </p>
        <FieldError errors={state.fieldErrors.bio} id="bio-error" />
      </div>

      <div>
        <label
          className="text-sm font-semibold text-[#3b2f27]"
          htmlFor="location"
        >
          Location
        </label>
        <input
          aria-describedby={
            state.fieldErrors.location ? "location-error" : undefined
          }
          aria-invalid={Boolean(state.fieldErrors.location)}
          autoComplete="address-level2"
          className={inputClassName}
          id="location"
          maxLength={100}
          name="location"
          placeholder="Lahore, Pakistan"
        />
        <FieldError errors={state.fieldErrors.location} id="location-error" />
      </div>

      <div className="flex flex-col gap-4 border-t border-[#ded3c7] pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-sm text-xs leading-5 text-[#75685d]">
          Your profile will be public so developers can discover your work.
        </p>
        <button
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#3b2f27] px-5 text-sm font-semibold text-[#fcfaf5] shadow-[0_10px_28px_rgba(59,47,39,0.14)] transition-[background-color,transform,box-shadow] hover:-translate-y-0.5 hover:bg-[#8a6a52] hover:shadow-[0_14px_32px_rgba(59,47,39,0.18)] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#8a6a52] disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transform-none"
          disabled={pending}
          type="submit"
        >
          {pending ? "Creating profile…" : "Create profile"}
        </button>
      </div>
    </form>
  );
}
