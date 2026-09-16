import { describe, expect, it } from "vitest";

import { enforceRouteAccess, isProtectedRoute } from "./route-access";

describe("protected route boundary", () => {
  it.each(["/onboarding", "/onboarding/profile", "/dashboard", "/dashboard/projects"])(
    "protects %s",
    (pathname) => {
      expect(isProtectedRoute(pathname)).toBe(true);
    },
  );

  it.each(["/", "/sign-in", "/sign-up", "/projects/project-id", "/developers"])(
    "keeps %s public",
    (pathname) => {
      expect(isProtectedRoute(pathname)).toBe(false);
    },
  );

  it("rejects a protected request when Clerk cannot authenticate it", async () => {
    const unauthorized = new Error("unauthenticated");
    const auth = {
      protect: async () => {
        throw unauthorized;
      },
    };

    await expect(enforceRouteAccess(auth, "/onboarding")).rejects.toBe(
      unauthorized,
    );
  });

  it("does not invoke authentication protection for a public route", async () => {
    let protectCalls = 0;
    const auth = {
      protect: async () => {
        protectCalls += 1;
      },
    };

    await enforceRouteAccess(auth, "/");

    expect(protectCalls).toBe(0);
  });
});
