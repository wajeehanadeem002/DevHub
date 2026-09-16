import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  authMock,
  createServerSupabaseClientMock,
  likeInsertMock,
  projectSelectMock,
  requireProfileMock,
  saveInsertMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  createServerSupabaseClientMock: vi.fn(),
  likeInsertMock: vi.fn(),
  projectSelectMock: vi.fn(),
  requireProfileMock: vi.fn(),
  saveInsertMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@clerk/nextjs/server", () => ({ auth: authMock }));
vi.mock("@/lib/auth/require-profile", () => ({
  requireProfile: requireProfileMock,
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: createServerSupabaseClientMock,
}));

import {
  getProjectEngagement,
  setCurrentProjectLiked,
  setCurrentProjectSaved,
} from "./project-engagement";

const projectId = "550e8400-e29b-41d4-a716-446655440000";
const ownerId = "user_owner";
const viewerId = "user_viewer";
const providerError = { code: "08006", message: "sensitive provider detail" };

type ProviderResult = { data: unknown; error: unknown };
type QueryCall = { args: unknown[]; method: string; table: string };

function installStateProvider(results: Record<string, ProviderResult>) {
  const queryCalls: QueryCall[] = [];

  createServerSupabaseClientMock.mockResolvedValue({
    from(table: string) {
      const result = results[table];
      if (!result) {
        throw new Error(`Unexpected table: ${table}`);
      }

      const query = {
        eq(...args: unknown[]) {
          queryCalls.push({ args, method: "eq", table });
          return query;
        },
        maybeSingle() {
          queryCalls.push({ args: [], method: "maybeSingle", table });
          return Promise.resolve(result);
        },
        select(...args: unknown[]) {
          queryCalls.push({ args, method: "select", table });
          return query;
        },
      };

      return query;
    },
  });

  return queryCalls;
}

function installMutationProvider({
  likeResult = { error: null },
  projectResult = { data: { like_count: 17 }, error: null },
  saveResult = { error: null },
}: {
  likeResult?: { error: unknown };
  projectResult?: ProviderResult;
  saveResult?: { error: unknown };
} = {}) {
  const deleteEqCalls: Record<string, unknown[][]> = {
    project_likes: [],
    project_saves: [],
  };
  const projectEqCalls: unknown[][] = [];

  likeInsertMock.mockResolvedValue(likeResult);
  saveInsertMock.mockResolvedValue(saveResult);
  createServerSupabaseClientMock.mockResolvedValue({
    from(table: string) {
      if (table === "project_likes" || table === "project_saves") {
        const engagementTable = table as "project_likes" | "project_saves";
        const deleteQuery = {
          eq(...args: unknown[]) {
            deleteEqCalls[engagementTable]!.push(args);
            return deleteQuery;
          },
          then<TResult1 = { error: null }, TResult2 = never>(
            onfulfilled?:
              | ((value: { error: null }) => TResult1 | PromiseLike<TResult1>)
              | null,
            onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
          ) {
            return Promise.resolve({ error: null }).then(onfulfilled, onrejected);
          },
        };

        return {
          delete() {
            return deleteQuery;
          },
          insert: table === "project_likes" ? likeInsertMock : saveInsertMock,
        };
      }

      if (table === "projects") {
        const projectQuery = {
          eq(...args: unknown[]) {
            projectEqCalls.push(args);
            return projectQuery;
          },
          maybeSingle() {
            return Promise.resolve(projectResult);
          },
        };

        return {
          select(...args: unknown[]) {
            projectSelectMock(...args);
            return projectQuery;
          },
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  });

  return { deleteEqCalls, projectEqCalls };
}

describe("project engagement state", () => {
  beforeEach(() => {
    authMock.mockReset();
    createServerSupabaseClientMock.mockReset();
    likeInsertMock.mockReset();
    projectSelectMock.mockReset();
    requireProfileMock.mockReset();
    saveInsertMock.mockReset();
    authMock.mockResolvedValue({ userId: null });
  });

  it("returns the anonymous state without constructing a provider client", async () => {
    await expect(getProjectEngagement(projectId, ownerId)).resolves.toEqual({
      isOwner: false,
      isSignedIn: false,
      liked: false,
      saved: false,
    });

    expect(createServerSupabaseClientMock).not.toHaveBeenCalled();
  });

  it("returns the owner state without constructing a provider client", async () => {
    authMock.mockResolvedValue({ userId: ownerId });

    await expect(getProjectEngagement(projectId, ownerId)).resolves.toEqual({
      isOwner: true,
      isSignedIn: true,
      liked: false,
      saved: false,
    });

    expect(createServerSupabaseClientMock).not.toHaveBeenCalled();
  });

  it("reads only the signed-in viewer's like and save rows", async () => {
    authMock.mockResolvedValue({ userId: viewerId });
    const queryCalls = installStateProvider({
      project_likes: { data: { project_id: projectId }, error: null },
      project_saves: { data: { project_id: projectId }, error: null },
    });

    await expect(getProjectEngagement(projectId, ownerId)).resolves.toEqual({
      isOwner: false,
      isSignedIn: true,
      liked: true,
      saved: true,
    });

    expect(queryCalls).toEqual(
      expect.arrayContaining([
        { args: ["project_id", projectId], method: "eq", table: "project_likes" },
        { args: ["user_id", viewerId], method: "eq", table: "project_likes" },
        { args: ["project_id", projectId], method: "eq", table: "project_saves" },
        { args: ["user_id", viewerId], method: "eq", table: "project_saves" },
      ]),
    );
  });

  it("rejects an invalid project ID before authentication or provider work", async () => {
    await expect(
      getProjectEngagement("not-a-project-id", ownerId),
    ).rejects.toThrow("Invalid project ID.");

    expect(authMock).not.toHaveBeenCalled();
    expect(createServerSupabaseClientMock).not.toHaveBeenCalled();
  });

  it("masks provider details behind the stable state-read error", async () => {
    authMock.mockResolvedValue({ userId: viewerId });
    installStateProvider({
      project_likes: { data: null, error: providerError },
      project_saves: { data: null, error: null },
    });

    const error = await getProjectEngagement(projectId, ownerId).catch(
      (reason: unknown) => reason,
    );

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe("Unable to load project interactions.");
    expect((error as Error).message).not.toContain(providerError.message);
  });
});

describe("project engagement mutations", () => {
  beforeEach(() => {
    authMock.mockReset();
    createServerSupabaseClientMock.mockReset();
    likeInsertMock.mockReset();
    projectSelectMock.mockReset();
    requireProfileMock.mockReset();
    saveInsertMock.mockReset();
    requireProfileMock.mockResolvedValue({
      profile: { user_id: viewerId },
      userId: viewerId,
    });
  });

  it("inserts a like and returns the count re-read from the published project", async () => {
    const { projectEqCalls } = installMutationProvider();

    await expect(setCurrentProjectLiked(projectId, true)).resolves.toEqual({
      likeCount: 17,
      liked: true,
    });

    expect(likeInsertMock).toHaveBeenCalledWith({ project_id: projectId });
    expect(projectSelectMock).toHaveBeenCalledWith("like_count");
    expect(projectEqCalls).toEqual([
      ["id", projectId],
      ["status", "published"],
    ]);
  });

  it("deletes only the current viewer's like", async () => {
    const { deleteEqCalls } = installMutationProvider();

    await expect(setCurrentProjectLiked(projectId, false)).resolves.toEqual({
      likeCount: 17,
      liked: false,
    });

    expect(deleteEqCalls.project_likes).toEqual([
      ["project_id", projectId],
      ["user_id", viewerId],
    ]);
  });

  it("inserts a save without including a user ID in the payload", async () => {
    installMutationProvider();

    await expect(setCurrentProjectSaved(projectId, true)).resolves.toEqual({
      saved: true,
    });

    expect(saveInsertMock).toHaveBeenCalledWith({ project_id: projectId });
  });

  it("deletes only the current viewer's save", async () => {
    const { deleteEqCalls } = installMutationProvider();

    await expect(setCurrentProjectSaved(projectId, false)).resolves.toEqual({
      saved: false,
    });

    expect(deleteEqCalls.project_saves).toEqual([
      ["project_id", projectId],
      ["user_id", viewerId],
    ]);
  });

  it("treats a duplicate like insert as a successful idempotent activation", async () => {
    installMutationProvider({ likeResult: { error: { code: "23505" } } });

    await expect(setCurrentProjectLiked(projectId, true)).resolves.toEqual({
      likeCount: 17,
      liked: true,
    });
  });

  it("masks non-idempotent mutation provider errors", async () => {
    installMutationProvider({ likeResult: { error: providerError } });

    const error = await setCurrentProjectLiked(projectId, true).catch(
      (reason: unknown) => reason,
    );

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe(
      "Unable to update this project interaction.",
    );
    expect((error as Error).message).not.toContain(providerError.message);
  });

  it("rejects a malformed project ID before profile or provider work", async () => {
    await expect(
      setCurrentProjectSaved("not-a-project-id", true),
    ).rejects.toThrow("Invalid project ID.");

    expect(requireProfileMock).not.toHaveBeenCalled();
    expect(createServerSupabaseClientMock).not.toHaveBeenCalled();
  });
});
