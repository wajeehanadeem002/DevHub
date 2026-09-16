"use server";

import "server-only";

import { redirect } from "next/navigation";

import { createCurrentProfile } from "./current-profile";
import { parseProfileFormData } from "./profile-input";
import type { OnboardingActionState } from "./onboarding-state";

export async function completeProfileOnboarding(
  _previousState: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  const input = parseProfileFormData(formData);

  if (!input.success) {
    return {
      fieldErrors: input.fieldErrors,
      message: "Check the highlighted fields and try again.",
      status: "error",
    };
  }

  let persistenceResult: Awaited<ReturnType<typeof createCurrentProfile>>;

  try {
    persistenceResult = await createCurrentProfile(input.data);
  } catch {
    return {
      fieldErrors: {},
      message: "We couldn't create your profile. Please try again.",
      status: "error",
    };
  }

  if (persistenceResult === "username-taken") {
    return {
      fieldErrors: { username: ["That username is already taken."] },
      message: "Choose a different username to continue.",
      status: "error",
    };
  }

  redirect("/dashboard");
}
