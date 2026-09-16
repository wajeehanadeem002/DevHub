import { describe, expect, it } from "vitest";

import {
  parseClerkEnv,
  parsePublicEnv,
  parseServerEnv,
  parseSupabasePublicEnv,
} from "./schema";

describe("environment validation", () => {
  it("uses a local URL when the public app URL is omitted", () => {
    expect(parsePublicEnv({})).toEqual({
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    });
  });

  it("rejects an invalid public app URL", () => {
    expect(() =>
      parsePublicEnv({ NEXT_PUBLIC_APP_URL: "not-a-url" }),
    ).toThrow();
  });

  it("accepts the supported Node environments", () => {
    expect(parseServerEnv({ NODE_ENV: "test" })).toEqual({
      NODE_ENV: "test",
    });
  });

  it("accepts correctly shaped Clerk credentials", () => {
    expect(
      parseClerkEnv({
        CLERK_SECRET_KEY: "sk_test_example",
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_example",
      }),
    ).toEqual({
      CLERK_SECRET_KEY: "sk_test_example",
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_example",
    });
  });

  it("rejects missing or malformed Clerk credentials", () => {
    expect(() =>
      parseClerkEnv({
        CLERK_SECRET_KEY: "public-value",
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_example",
      }),
    ).toThrow();
  });

  it("accepts a hosted Supabase URL and publishable key", () => {
    expect(
      parseSupabasePublicEnv({
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      }),
    ).toEqual({
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    });
  });

  it("rejects incomplete Supabase configuration", () => {
    expect(() =>
      parseSupabasePublicEnv({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      }),
    ).toThrow();
  });
});
