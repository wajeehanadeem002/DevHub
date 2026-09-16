import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { signInMock, signUpMock } = vi.hoisted(() => ({
  signInMock: vi.fn<
    (props: { fallbackRedirectUrl?: string }) => null
  >(() => null),
  signUpMock: vi.fn<
    (props: { fallbackRedirectUrl?: string }) => null
  >(() => null),
}));

vi.mock("@clerk/nextjs", () => ({
  SignIn: signInMock,
  SignUp: signUpMock,
}));

import SignInPage from "./sign-in/[[...sign-in]]/page";
import SignUpPage from "./sign-up/[[...sign-up]]/page";

describe("authentication routes", () => {
  beforeEach(() => {
    signInMock.mockClear();
    signUpMock.mockClear();
  });

  it("sends a completed sign-in to onboarding", async () => {
    render(await SignInPage({ searchParams: Promise.resolve({}) }));

    expect(signInMock.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({ fallbackRedirectUrl: "/onboarding" }),
    );
  });

  it("sends a completed sign-up to onboarding", () => {
    render(<SignUpPage />);

    expect(signUpMock.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({ fallbackRedirectUrl: "/onboarding" }),
    );
  });
});
