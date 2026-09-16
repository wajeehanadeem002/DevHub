import { beforeEach, describe, expect, it, vi } from "vitest";

const { authMock, createClientMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
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

vi.mock("server-only", () => ({}));
vi.mock("@clerk/nextjs/server", () => ({ auth: authMock }));
vi.mock("@supabase/supabase-js", () => ({ createClient: createClientMock }));

import {
  createServerSupabaseClient,
  createServerSupabasePublicClient,
} from "./server";

describe("createServerSupabaseClient", () => {
  beforeEach(() => {
    authMock.mockReset();
    createClientMock.mockClear();
  });

  it("resolves the current Clerk session token for each Supabase request", async () => {
    const getToken = vi.fn().mockResolvedValue("server-clerk-token");
    authMock.mockResolvedValue({ getToken });

    await createServerSupabaseClient({
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    });

    const options = createClientMock.mock.calls[0]?.[2];
    expect(await options?.accessToken?.()).toBe("server-clerk-token");
  });

  it("creates a public server client without reading Clerk auth", () => {
    const client = createServerSupabasePublicClient({
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    });

    expect(client).toEqual({ client: "supabase" });
    expect(authMock).not.toHaveBeenCalled();
    expect(createClientMock).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "sb_publishable_example",
    );
  });
});
