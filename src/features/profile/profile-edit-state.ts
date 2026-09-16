import type { ProfileEditFieldErrors } from "./profile-edit-input";

export type ProfileEditActionState = {
  fieldErrors: ProfileEditFieldErrors;
  message: string;
  status: "error" | "idle" | "success";
};

export type AvatarActionState = {
  fieldError?: string;
  message: string;
  status: "error" | "idle" | "success";
};

export const initialProfileEditActionState: ProfileEditActionState = {
  fieldErrors: {},
  message: "",
  status: "idle",
};

export const initialAvatarActionState: AvatarActionState = {
  message: "",
  status: "idle",
};
