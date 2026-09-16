"use client";

import { useActionState } from "react";

import type { TechnologyOption } from "./current-profile";
import { updateProfileAction } from "./profile-actions";
import type { ProfileEditFieldErrors } from "./profile-edit-input";
import {
  initialProfileEditActionState,
  type ProfileEditActionState,
} from "./profile-edit-state";

const inputClassName =
  "mt-2 w-full rounded-xl border border-[#ded3c7] bg-[#fcfaf5] px-4 py-3 text-[15px] text-[#3b2f27] outline-none transition-[border-color,box-shadow,background-color] placeholder:text-[#75685d]/55 hover:border-[#d8c3a8] focus:border-[#8a6a52] focus:bg-white focus:shadow-[0_0_0_3px_rgba(138,106,82,0.12)]";

type EditableProfile = {
  bio: string | null;
  display_name: string;
  github_url: string | null;
  headline: string | null;
  is_public: boolean;
  linkedin_url: string | null;
  location: string | null;
  technologyIds: number[];
  username: string;
  website_url: string | null;
};

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

function describedBy(
  fieldErrors: ProfileEditFieldErrors,
  field: keyof ProfileEditFieldErrors,
  helpId?: string,
) {
  const ids = [helpId, fieldErrors[field] ? `${field}-error` : undefined].filter(
    Boolean,
  );
  return ids.length > 0 ? ids.join(" ") : undefined;
}

export function ProfileEditForm({
  initialState = initialProfileEditActionState,
  profile,
  technologies,
}: {
  initialState?: ProfileEditActionState;
  profile: EditableProfile;
  technologies: TechnologyOption[];
}) {
  const [state, formAction, pending] = useActionState(
    updateProfileAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-8">
      {state.message ? (
        <div
          aria-live="polite"
          className={
            state.status === "success"
              ? "rounded-xl border border-[#c9b89f] bg-[#f3ebdf] px-4 py-3 text-sm text-[#594536]"
              : "rounded-xl border border-[#c99b8c] bg-[#fbf0ea] px-4 py-3 text-sm text-[#6f3027]"
          }
          role={state.status === "error" ? "alert" : "status"}
        >
          {state.message}
        </div>
      ) : null}

      <section aria-labelledby="profile-basics-title">
        <h2
          className="text-xl font-semibold tracking-[-0.03em] text-[#3b2f27]"
          id="profile-basics-title"
        >
          Profile basics
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#75685d]">
          Keep your public identity focused, clear, and professional.
        </p>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div>
            <label className="text-sm font-semibold text-[#3b2f27]" htmlFor="username">
              Username
            </label>
            <div className="relative">
              <span aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[#8a6a52]">
                @
              </span>
              <input
                aria-describedby={describedBy(state.fieldErrors, "username", "username-help")}
                aria-invalid={Boolean(state.fieldErrors.username)}
                autoCapitalize="none"
                autoComplete="username"
                className={`${inputClassName} pl-8`}
                defaultValue={profile.username}
                id="username"
                maxLength={30}
                name="username"
                pattern="[a-z0-9][a-z0-9_]{1,28}[a-z0-9]"
                required
                spellCheck={false}
              />
            </div>
            <p className="mt-2 text-xs leading-5 text-[#75685d]" id="username-help">
              3–30 lowercase letters, numbers, or underscores.
            </p>
            <FieldError errors={state.fieldErrors.username} id="username-error" />
          </div>

          <div>
            <label className="text-sm font-semibold text-[#3b2f27]" htmlFor="displayName">
              Display name
            </label>
            <input
              aria-describedby={describedBy(state.fieldErrors, "displayName")}
              aria-invalid={Boolean(state.fieldErrors.displayName)}
              autoComplete="name"
              className={inputClassName}
              defaultValue={profile.display_name}
              id="displayName"
              maxLength={80}
              name="displayName"
              required
            />
            <FieldError errors={state.fieldErrors.displayName} id="displayName-error" />
          </div>
        </div>

        <div className="mt-5">
          <label className="text-sm font-semibold text-[#3b2f27]" htmlFor="headline">
            Professional headline
          </label>
          <input
            aria-describedby={describedBy(state.fieldErrors, "headline")}
            aria-invalid={Boolean(state.fieldErrors.headline)}
            className={inputClassName}
            defaultValue={profile.headline ?? ""}
            id="headline"
            maxLength={120}
            name="headline"
          />
          <FieldError errors={state.fieldErrors.headline} id="headline-error" />
        </div>

        <div className="mt-5">
          <label className="text-sm font-semibold text-[#3b2f27]" htmlFor="bio">
            Short bio
          </label>
          <textarea
            aria-describedby={describedBy(state.fieldErrors, "bio", "bio-help")}
            aria-invalid={Boolean(state.fieldErrors.bio)}
            className={`${inputClassName} min-h-32 resize-y`}
            defaultValue={profile.bio ?? ""}
            id="bio"
            maxLength={1000}
            name="bio"
          />
          <p className="mt-2 text-xs leading-5 text-[#75685d]" id="bio-help">
            Plain text only, up to 1,000 characters.
          </p>
          <FieldError errors={state.fieldErrors.bio} id="bio-error" />
        </div>

        <div className="mt-5">
          <label className="text-sm font-semibold text-[#3b2f27]" htmlFor="location">
            Location
          </label>
          <input
            aria-describedby={describedBy(state.fieldErrors, "location")}
            aria-invalid={Boolean(state.fieldErrors.location)}
            autoComplete="address-level2"
            className={inputClassName}
            defaultValue={profile.location ?? ""}
            id="location"
            maxLength={100}
            name="location"
          />
          <FieldError errors={state.fieldErrors.location} id="location-error" />
        </div>
      </section>

      <section aria-labelledby="profile-links-title" className="border-t border-[#ded3c7] pt-8">
        <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#3b2f27]" id="profile-links-title">
          Profile links
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#75685d]">
          Add complete public URLs beginning with http:// or https://.
        </p>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {(
            [
              ["websiteUrl", "Website", profile.website_url],
              ["githubUrl", "GitHub profile", profile.github_url],
              ["linkedinUrl", "LinkedIn profile", profile.linkedin_url],
            ] as const
          ).map(([name, label, value]) => (
            <div className={name === "websiteUrl" ? "sm:col-span-2" : ""} key={name}>
              <label className="text-sm font-semibold text-[#3b2f27]" htmlFor={name}>
                {label}
              </label>
              <input
                aria-describedby={describedBy(state.fieldErrors, name)}
                aria-invalid={Boolean(state.fieldErrors[name])}
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
              <FieldError errors={state.fieldErrors[name]} id={`${name}-error`} />
            </div>
          ))}
        </div>
      </section>

      <fieldset
        aria-describedby={describedBy(state.fieldErrors, "technologies", "technologies-help")}
        className="border-t border-[#ded3c7] pt-8"
      >
        <legend className="text-xl font-semibold tracking-[-0.03em] text-[#3b2f27]">
          Technologies
        </legend>
        <p className="mt-2 text-sm leading-6 text-[#75685d]" id="technologies-help">
          Choose up to 8 technologies.
        </p>
        <div className="mt-5 flex flex-wrap gap-2.5">
          {technologies.map((technology) => (
            <label className="cursor-pointer" key={technology.id}>
              <input
                className="peer sr-only"
                defaultChecked={profile.technologyIds.includes(technology.id)}
                name="technologyIds"
                type="checkbox"
                value={technology.id}
              />
              <span className="inline-flex min-h-10 items-center rounded-full border border-[#ded3c7] bg-[#f9f5ee] px-4 text-sm font-medium text-[#594b41] transition-[border-color,background-color,color] hover:border-[#d8c3a8] peer-checked:border-[#8a6a52] peer-checked:bg-[#8a6a52] peer-checked:text-[#fcfaf5] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#8a6a52]">
                {technology.name}
              </span>
            </label>
          ))}
        </div>
        <FieldError errors={state.fieldErrors.technologies} id="technologies-error" />
      </fieldset>

      <section aria-labelledby="profile-visibility-title" className="border-t border-[#ded3c7] pt-8">
        <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#3b2f27]" id="profile-visibility-title">
          Visibility
        </h2>
        <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-[#ded3c7] bg-[#f9f5ee] p-4 hover:border-[#d8c3a8]">
          <input
            aria-label="Public profile"
            className="mt-1 size-4 accent-[#8a6a52] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a6a52]"
            defaultChecked={profile.is_public}
            name="isPublic"
            type="checkbox"
          />
          <span>
            <span className="block text-sm font-semibold text-[#3b2f27]">Public profile</span>
            <span className="mt-1 block text-xs leading-5 text-[#75685d]">
              Allow visitors to view your developer profile at your public username URL.
            </span>
          </span>
        </label>
      </section>

      <div className="flex justify-end border-t border-[#ded3c7] pt-6">
        <button
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#3b2f27] px-5 text-sm font-semibold text-[#fcfaf5] shadow-[0_10px_28px_rgba(59,47,39,0.14)] transition-[background-color,transform,box-shadow] hover:-translate-y-0.5 hover:bg-[#8a6a52] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#8a6a52] disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transform-none"
          disabled={pending}
          type="submit"
        >
          {pending ? "Saving profile…" : "Save profile"}
        </button>
      </div>
    </form>
  );
}
