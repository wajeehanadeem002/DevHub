import { describe, expect, it, vi } from "vitest";

const { createClientMock } = vi.hoisted(() => ({
  createClientMock: vi
    .fn<
      (
        url: string,
        key: string,
        options?: { accessToken?: () => Promise<string | null> },
      ) => { client: string }
    >()
    .mockReturnValue({ client: "supabase" }),
}));

vi.mock("@supabase/supabase-js", () => ({ createClient: createClientMock }));

import { createBrowserSupabaseClient } from "./client";

describe("createBrowserSupabaseClient", () => {
  it("passes the active Clerk token through Supabase native accessToken support", async () => {
    const getToken = vi.fn().mockResolvedValue("clerk-session-token");

    createBrowserSupabaseClient(
      getToken,
      {
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      },
    );

    const options = createClientMock.mock.calls[0]?.[2];
    expect(await options?.accessToken?.()).toBe("clerk-session-token");
  });
});
