import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { setProjectLikedActionMock, setProjectSavedActionMock } = vi.hoisted(
  () => ({
    setProjectLikedActionMock: vi.fn(),
    setProjectSavedActionMock: vi.fn(),
  }),
);

vi.mock("./project-engagement-actions", () => ({
  setProjectLikedAction: setProjectLikedActionMock,
  setProjectSavedAction: setProjectSavedActionMock,
}));

import { ProjectEngagementControls } from "./project-engagement-controls";

const projectId = "550e8400-e29b-41d4-a716-446655440000";
const eligibleProps = {
  initialLikeCount: 4,
  initialLiked: false,
  initialSaved: false,
  isOwner: false,
  isSignedIn: true,
  projectId,
};

type LikeResult =
  | { likeCount: number; liked: boolean; status: "success" }
  | { message: string; status: "error" };

type SaveResult =
  | { saved: boolean; status: "success" }
  | { message: string; status: "error" };

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((finish, fail) => {
    resolve = finish;
    reject = fail;
  });
  return { promise, resolve, reject };
}

describe("ProjectEngagementControls", () => {
  beforeEach(() => {
    setProjectLikedActionMock.mockReset();
    setProjectSavedActionMock.mockReset();
    setProjectLikedActionMock.mockResolvedValue({
      likeCount: 5,
      liked: true,
      status: "success",
    });
    setProjectSavedActionMock.mockResolvedValue({
      saved: true,
      status: "success",
    });
  });

  it("renders the initial eligible-user engagement state", () => {
    render(<ProjectEngagementControls {...eligibleProps} />);

    expect(screen.getByRole("button", { name: "Like project" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByRole("button", { name: "Save project" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByText("4 likes")).toBeInTheDocument();
  });

  it("optimistically likes while only Like is pending, then confirms success", async () => {
    const likeResult = deferred<LikeResult>();
    setProjectLikedActionMock.mockReturnValue(likeResult.promise);
    const user = userEvent.setup();
    render(<ProjectEngagementControls {...eligibleProps} />);

    await user.click(screen.getByRole("button", { name: "Like project" }));

    const likeButton = screen.getByRole("button", { name: "Like project" });
    expect(likeButton).toHaveTextContent(/^Liked$/);
    expect(likeButton).toHaveAttribute("aria-pressed", "true");
    expect(likeButton).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save project" })).toBeEnabled();
    expect(screen.getByText("5 likes")).toBeInTheDocument();

    await act(async () => {
      likeResult.resolve({ likeCount: 5, liked: true, status: "success" });
    });

    await waitFor(() => expect(likeButton).toBeEnabled());
    expect(likeButton).toHaveTextContent(/^Liked$/);
    expect(screen.getByText("5 likes")).toBeInTheDocument();
  });

  it("re-enables each action independently when overlapping requests settle", async () => {
    const likeResult = deferred<LikeResult>();
    const saveResult = deferred<SaveResult>();
    setProjectLikedActionMock.mockReturnValue(likeResult.promise);
    setProjectSavedActionMock.mockReturnValue(saveResult.promise);
    const user = userEvent.setup();
    render(<ProjectEngagementControls {...eligibleProps} />);

    const likeButton = screen.getByRole("button", { name: "Like project" });
    const saveButton = screen.getByRole("button", { name: "Save project" });
    await user.click(likeButton);
    await user.click(saveButton);

    expect(likeButton).toBeDisabled();
    expect(saveButton).toBeDisabled();

    await act(async () => {
      likeResult.resolve({ likeCount: 5, liked: true, status: "success" });
    });

    expect.soft(likeButton).toBeEnabled();
    expect.soft(saveButton).toBeDisabled();

    await act(async () => {
      saveResult.resolve({ saved: true, status: "success" });
    });

    expect(likeButton).toBeEnabled();
    expect(saveButton).toBeEnabled();
  });

  it("uses the authoritative like state and count returned by the action", async () => {
    setProjectLikedActionMock.mockResolvedValue({
      likeCount: 7,
      liked: false,
      status: "success",
    });
    const user = userEvent.setup();
    render(<ProjectEngagementControls {...eligibleProps} />);

    await user.click(screen.getByRole("button", { name: "Like project" }));

    await waitFor(() => expect(screen.getByText("7 likes")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Like project" })).toHaveTextContent(
      /^Like$/,
    );
    expect(screen.getByRole("button", { name: "Like project" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it.each([
    {
      action: "Like",
      pendingAction: "Save",
      countAfterRejection: "4 likes",
      message: "We couldn't update this project's like. Please try again.",
    },
    {
      action: "Save",
      pendingAction: "Like",
      countAfterRejection: "5 likes",
      message: "We couldn't update this project's saved state. Please try again.",
    },
  ])(
    "rolls back a rejected $action while $pendingAction remains pending",
    async ({ action, pendingAction, countAfterRejection, message }) => {
      const likeResult = deferred<LikeResult>();
      const saveResult = deferred<SaveResult>();
      const privateDetails = "provider-private-detail: transport credentials";
      setProjectLikedActionMock.mockReturnValue(likeResult.promise);
      setProjectSavedActionMock.mockReturnValue(saveResult.promise);
      const user = userEvent.setup();
      render(<ProjectEngagementControls {...eligibleProps} />);

      const rejectedButton = screen.getByRole("button", {
        name: `${action} project`,
      });
      const pendingButton = screen.getByRole("button", {
        name: `${pendingAction} project`,
      });
      await user.click(rejectedButton);
      await user.click(pendingButton);

      expect(rejectedButton).toHaveAttribute("aria-pressed", "true");
      expect(rejectedButton).toBeDisabled();
      expect(pendingButton).toHaveAttribute("aria-pressed", "true");
      expect(pendingButton).toBeDisabled();
      expect(screen.getByText("5 likes")).toBeInTheDocument();

      await act(async () => {
        const rejectedResult = action === "Like" ? likeResult : saveResult;
        rejectedResult.reject(new Error(privateDetails));
      });

      try {
        expect(rejectedButton).toHaveAttribute("aria-pressed", "false");
        expect(rejectedButton).toHaveTextContent(action);
        expect(rejectedButton).toBeEnabled();
        expect(pendingButton).toHaveAttribute("aria-pressed", "true");
        expect(pendingButton).toBeDisabled();
        expect(screen.getByText(countAfterRejection)).toBeInTheDocument();
        expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
        expect(screen.getByRole("status")).toHaveTextContent(message);
        expect(document.body).not.toHaveTextContent(privateDetails);
      } finally {
        await act(async () => {
          if (action === "Like") {
            saveResult.resolve({ saved: true, status: "success" });
          } else {
            likeResult.resolve({ likeCount: 5, liked: true, status: "success" });
          }
        });
      }

      expect(pendingButton).toHaveAttribute("aria-pressed", "true");
      expect(pendingButton).toBeEnabled();
    },
  );

  it("rolls a failed Like back exactly and exposes only the safe status message", async () => {
    const providerPrivateDetails = "provider detail: user-private-data";
    setProjectLikedActionMock.mockResolvedValue({
      message: "Safe failure.",
      status: "error",
    });
    const user = userEvent.setup();
    render(<ProjectEngagementControls {...eligibleProps} />);

    await user.click(screen.getByRole("button", { name: "Like project" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Like project" })).toHaveAttribute(
        "aria-pressed",
        "false",
      ),
    );
    expect(screen.getByRole("button", { name: "Like project" })).toHaveTextContent(
      /^Like$/,
    );
    expect(screen.getByText("4 likes")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
    expect(screen.getByRole("status")).toHaveTextContent("Safe failure.");
    expect(screen.queryByText(providerPrivateDetails)).not.toBeInTheDocument();
  });

  it("never lets an optimistic unlike count drop below zero", async () => {
    const likeResult = deferred<LikeResult>();
    setProjectLikedActionMock.mockReturnValue(likeResult.promise);
    const user = userEvent.setup();
    render(
      <ProjectEngagementControls
        {...eligibleProps}
        initialLikeCount={0}
        initialLiked
      />,
    );

    await user.click(screen.getByRole("button", { name: "Like project" }));

    expect(screen.getByText("0 likes")).toBeInTheDocument();

    await act(async () => {
      likeResult.resolve({ likeCount: 0, liked: false, status: "success" });
    });
  });

  it("optimistically saves and unsaves while only Save is pending", async () => {
    const saveResult = deferred<SaveResult>();
    setProjectSavedActionMock.mockReturnValueOnce(saveResult.promise);
    const user = userEvent.setup();
    render(<ProjectEngagementControls {...eligibleProps} />);

    await user.click(screen.getByRole("button", { name: "Save project" }));

    const saveButton = screen.getByRole("button", { name: "Save project" });
    expect(saveButton).toHaveTextContent(/^Saved$/);
    expect(saveButton).toHaveAttribute("aria-pressed", "true");
    expect(saveButton).toBeDisabled();
    expect(screen.getByRole("button", { name: "Like project" })).toBeEnabled();

    await act(async () => {
      saveResult.resolve({ saved: true, status: "success" });
    });
    await waitFor(() => expect(saveButton).toBeEnabled());

    setProjectSavedActionMock.mockResolvedValueOnce({
      saved: false,
      status: "success",
    });
    await user.click(saveButton);

    expect(saveButton).toHaveTextContent(/^Save$/);
    await waitFor(() => expect(saveButton).toHaveAttribute("aria-pressed", "false"));
  });

  it("rolls a failed Save back to its exact previous state", async () => {
    setProjectSavedActionMock.mockResolvedValue({
      message: "Safe save failure.",
      status: "error",
    });
    const user = userEvent.setup();
    render(
      <ProjectEngagementControls {...eligibleProps} initialSaved />,
    );

    await user.click(screen.getByRole("button", { name: "Save project" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Save project" })).toHaveAttribute(
        "aria-pressed",
        "true",
      ),
    );
    expect(screen.getByRole("button", { name: "Save project" })).toHaveTextContent(
      /^Saved$/,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Safe save failure.");
  });

  it("offers signed-out users the strict encoded project return link", () => {
    render(
      <ProjectEngagementControls
        {...eligibleProps}
        isSignedIn={false}
      />,
    );

    expect(
      screen.getByRole("link", { name: "Sign in to like or save" }),
    ).toHaveAttribute(
      "href",
      "/sign-in?returnTo=%2Fprojects%2F550e8400-e29b-41d4-a716-446655440000",
    );
    expect(screen.queryByRole("button", { name: "Like project" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save project" })).not.toBeInTheDocument();
  });

  it("shows owners non-actionable text instead of engagement buttons", () => {
    render(<ProjectEngagementControls {...eligibleProps} isOwner />);

    expect(screen.getByText("This is your project")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Like project" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save project" })).not.toBeInTheDocument();
  });
});
