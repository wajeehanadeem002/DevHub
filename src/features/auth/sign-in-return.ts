import { parseProjectId } from "@/features/projects/project-input";

export function parseProjectSignInReturn(
  value: string | string[] | undefined,
) {
  const candidate = Array.isArray(value) ? value[0] : value;
  const match = candidate?.match(/^\/projects\/([^/?#]+)$/);
  const untrustedProjectId = match?.[1];
  if (!untrustedProjectId) return null;

  const projectId = parseProjectId(untrustedProjectId);
  return projectId.success ? `/projects/${projectId.data}` : null;
}
