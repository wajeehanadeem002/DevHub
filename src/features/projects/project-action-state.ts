import type { ProjectFieldErrors } from "./project-input";
import type { ProjectImageFieldErrors } from "./project-image-input";

type ProjectActionStatus = "error" | "idle" | "success";

type ProjectActionStateBase = {
  cleanupWarning?: string;
  message: string;
  status: ProjectActionStatus;
};

export type ProjectActionState = ProjectActionStateBase & {
  fieldErrors: ProjectFieldErrors;
};

export type ProjectImageActionState = ProjectActionStateBase & {
  fieldErrors: ProjectImageFieldErrors;
};

export const initialProjectActionState: ProjectActionState = {
  fieldErrors: {},
  message: "",
  status: "idle",
};

export const initialProjectImageActionState: ProjectImageActionState = {
  fieldErrors: {},
  message: "",
  status: "idle",
};
