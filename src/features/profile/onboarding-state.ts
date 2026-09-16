import type { ProfileFieldErrors } from "./profile-input";

export type OnboardingActionState = {
  fieldErrors: ProfileFieldErrors;
  message: string;
  status: "error" | "idle";
};

export const initialOnboardingActionState: OnboardingActionState = {
  fieldErrors: {},
  message: "",
  status: "idle",
};
