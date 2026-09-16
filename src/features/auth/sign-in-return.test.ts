import { describe, expect, it } from "vitest";

import { parseProjectSignInReturn } from "./sign-in-return";

describe("parseProjectSignInReturn", () => {
  const id = "550e8400-e29b-41d4-a716-446655440000";

  it("accepts only a normalized internal project-detail path", () => {
    expect(parseProjectSignInReturn(`/projects/${id}`)).toBe(
      `/projects/${id}`,
    );
    expect(parseProjectSignInReturn([`/projects/${id}`, "/projects/ignored"])).toBe(
      `/projects/${id}`,
    );
  });

  it.each([
    undefined,
    "",
    "https://evil.example/projects/550e8400-e29b-41d4-a716-446655440000",
    "//evil.example",
    "/dashboard",
    "/projects/not-a-uuid",
    "/projects/550e8400-e29b-41d4-a716-446655440000?next=https://evil.example",
  ])("rejects unsafe return value %s", (value) => {
    expect(parseProjectSignInReturn(value)).toBeNull();
  });
});
