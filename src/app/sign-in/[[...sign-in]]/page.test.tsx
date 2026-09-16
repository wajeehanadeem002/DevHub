import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { signInPropsMock } = vi.hoisted(() => ({
  signInPropsMock: vi.fn(),
}));

vi.mock("@clerk/nextjs", () => ({
  SignIn: (props: unknown) => {
    signInPropsMock(props);
    return null;
  },
}));

import SignInPage from "./page";

describe("SignInPage", () => {
  beforeEach(() => {
    signInPropsMock.mockClear();
  });

  it("returns to a safe project detail path after sign-in", async () => {
    render(
      await SignInPage({
        searchParams: Promise.resolve({
          returnTo: "/projects/550e8400-e29b-41d4-a716-446655440000",
        }),
      }),
    );

    expect(signInPropsMock).toHaveBeenLastCalledWith({
      fallbackRedirectUrl: "/projects/550e8400-e29b-41d4-a716-446655440000",
      forceRedirectUrl: "/projects/550e8400-e29b-41d4-a716-446655440000",
    });
  });

  it("uses onboarding when the return target is unsafe", async () => {
    render(
      await SignInPage({
        searchParams: Promise.resolve({ returnTo: "https://evil.example" }),
      }),
    );

    expect(signInPropsMock).toHaveBeenLastCalledWith({
      fallbackRedirectUrl: "/onboarding",
    });
  });
});
