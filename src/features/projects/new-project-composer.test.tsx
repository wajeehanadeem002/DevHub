import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { createProjectActionMock } = vi.hoisted(() => ({
  createProjectActionMock: vi.fn(),
}));

vi.mock("./project-actions", () => ({ createProjectAction: createProjectActionMock }));

import { NewProjectComposer } from "./new-project-composer";

const categories = [
  "Web Application", "Mobile Application", "Developer Tool", "Open Source", "Data & AI", "Other",
].map((name, index) => ({ id: index + 1, name, slug: `category-${index + 1}` }));

const technologies = [
  "React", "Next.js", "TypeScript", "Node.js", "Python", "PostgreSQL", "Supabase", "Tailwind CSS", "Docker", "AWS",
].map((name, index) => ({ id: index + 1, name, slug: `technology-${index + 1}` }));

const idleState = { fieldErrors: {}, message: "", status: "idle" } as const;

async function fillValidDetails(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Project title"), "TaskFlow");
  await user.type(screen.getByLabelText("Project summary"), "Plan and ship focused work.");
  await user.type(
    screen.getByLabelText("Project description"),
    "A focused task manager for thoughtful teams.",
  );
  await user.click(screen.getByRole("radio", { name: "Developer Tool" }));
  await user.type(screen.getByLabelText("Live demo URL"), "https://taskflow.dev");
  await user.type(
    screen.getByLabelText("Repository URL"),
    "https://github.com/alex/taskflow",
  );
}

describe("NewProjectComposer", () => {
  beforeEach(() => {
    createProjectActionMock.mockReset();
    createProjectActionMock.mockResolvedValue({
      fieldErrors: {}, message: "Created.", status: "success",
    });
  });

  it("validates Details before revealing Technologies", async () => {
    const user = userEvent.setup();
    render(<NewProjectComposer categories={categories} technologies={technologies} />);

    const title = screen.getByLabelText("Project title");
    await user.click(screen.getByRole("button", { name: "Continue to technologies" }));

    expect(title).toBeInvalid();
    expect(title).toHaveFocus();
    expect(screen.getByRole("heading", { name: "Project details" })).toBeVisible();
    expect(screen.queryByRole("group", { name: "Technologies" })).not.toBeInTheDocument();
  });

  it("keeps invalid Details visible when Technologies is selected in the stepper", async () => {
    const user = userEvent.setup();
    render(<NewProjectComposer categories={categories} technologies={technologies} />);

    const title = screen.getByLabelText("Project title");
    await user.click(screen.getByRole("button", { name: /technologies.*upcoming/i }));

    expect(title).toBeInvalid();
    expect(title).toHaveFocus();
    expect(screen.getByRole("heading", { name: "Project details" })).toBeVisible();
    expect(screen.getByRole("button", { name: /details.*current/i })).toHaveAttribute(
      "aria-current", "step",
    );
    expect(screen.queryByRole("group", { name: "Technologies" })).not.toBeInTheDocument();
  });

  it("opens Technologies from the stepper when Details are valid", async () => {
    const user = userEvent.setup();
    render(<NewProjectComposer categories={categories} technologies={technologies} />);
    await fillValidDetails(user);

    await user.click(screen.getByRole("button", { name: /technologies.*upcoming/i }));

    expect(screen.getByText("Technologies", { selector: "legend" })).toHaveFocus();
    expect(screen.getByRole("group", { name: "Technologies" })).toBeVisible();
    expect(screen.getByRole("button", { name: /technologies.*current/i })).toHaveAttribute(
      "aria-current", "step",
    );
  });

  it("preserves values and manages focus when moving between local steps", async () => {
    const user = userEvent.setup();
    render(<NewProjectComposer categories={categories} technologies={technologies} />);

    expect(screen.getByRole("button", { name: /details.*current/i })).toHaveAttribute(
      "aria-current", "step",
    );
    expect(screen.getAllByRole("radio")).toHaveLength(6);
    await fillValidDetails(user);
    await user.click(screen.getByRole("button", { name: "Continue to technologies" }));

    expect(screen.getByText("Technologies", { selector: "legend" })).toHaveFocus();
    expect(screen.getAllByRole("checkbox")).toHaveLength(10);
    await user.click(screen.getByRole("button", { name: "Back to details" }));
    expect(screen.getByRole("heading", { name: "Project details" })).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Continue to technologies" }));
    await user.click(screen.getByRole("button", { name: /details.*completed/i }));
    expect(screen.getByRole("heading", { name: "Project details" })).toHaveFocus();
    expect(screen.getByLabelText("Project title")).toHaveValue("TaskFlow");
    expect(screen.getByRole("radio", { name: "Developer Tool" })).toBeChecked();
  });

  it("prevents a ninth technology selection while retaining selected choices", async () => {
    const user = userEvent.setup();
    render(<NewProjectComposer categories={categories} technologies={technologies} />);

    await fillValidDetails(user);
    await user.click(screen.getByRole("button", { name: "Continue to technologies" }));
    const choices = within(screen.getByRole("group", { name: "Technologies" })).getAllByRole("checkbox");
    for (const choice of choices.slice(0, 8)) await user.click(choice);

    for (const choice of choices.slice(0, 8)) expect(choice).toBeChecked();
    expect(choices[8]!).toBeDisabled();
    expect(choices[9]!).toBeDisabled();
    expect(screen.getByText("8 of 8 technologies selected")).toBeInTheDocument();
  });

  it("submits every project field through one action form and exposes associated/live errors", () => {
    render(
      <NewProjectComposer
        categories={categories}
        initialState={{
          fieldErrors: {
            categoryId: ["Choose a project category."], title: ["Enter a project title."],
          },
          message: "Check the highlighted project fields and try again.",
          status: "error",
        }}
        technologies={technologies}
      />,
    );

    const form = screen.getByRole("form", { name: "Create project" });
    for (const name of [
      "title", "summary", "description", "categoryId", "demoUrl", "repositoryUrl", "technologyIds",
    ]) {
      expect(form.querySelector(`[name="${name}"]`)).toBeInTheDocument();
    }
    expect(screen.getByLabelText("Project title")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Project title")).toHaveAccessibleDescription(/Enter a project title\./);
    expect(screen.getByRole("group", { name: "Category" })).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("group", { name: "Category" })).toHaveAccessibleDescription(
      /Choose a project category\./,
    );
    expect(screen.getByRole("alert")).toHaveAttribute("aria-live", "polite");
  });

  it("submits exact valid data, prevents duplicates, and announces pending creation", async () => {
    const user = userEvent.setup();
    let finishAction!: (state: {
      fieldErrors: Record<string, never>; message: string; status: "success";
    }) => void;
    createProjectActionMock.mockImplementation(
      () => new Promise((resolve) => { finishAction = resolve; }),
    );
    render(<NewProjectComposer categories={categories} technologies={technologies} />);
    await fillValidDetails(user);
    await user.click(screen.getByRole("button", { name: "Continue to technologies" }));
    await user.click(screen.getByRole("checkbox", { name: "React" }));
    await user.click(screen.getByRole("checkbox", { name: "Next.js" }));
    await user.click(screen.getByRole("button", { name: "Create draft and add images" }));

    await waitFor(() => expect(createProjectActionMock).toHaveBeenCalledTimes(1));
    const [previousState, formData] = createProjectActionMock.mock.calls[0]!;
    expect(previousState).toEqual(idleState);
    expect(Array.from((formData as FormData).entries())).toEqual([
      ["title", "TaskFlow"],
      ["summary", "Plan and ship focused work."],
      ["description", "A focused task manager for thoughtful teams."],
      ["categoryId", "3"],
      ["demoUrl", "https://taskflow.dev"],
      ["repositoryUrl", "https://github.com/alex/taskflow"],
      ["technologyIds", "1"],
      ["technologyIds", "2"],
    ]);
    expect(screen.getByRole("button", { name: "Creating draft…" })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("Creating project draft");

    await act(async () => {
      finishAction({ fieldErrors: {}, message: "Created.", status: "success" });
    });
  });

  it("returns to Details and focuses its heading for a Details error returned after submit", async () => {
    const user = userEvent.setup();
    createProjectActionMock.mockResolvedValue({
      fieldErrors: { demoUrl: ["Enter a valid HTTP or HTTPS URL."] },
      message: "Check the highlighted project fields and try again.",
      status: "error",
    });
    render(<NewProjectComposer categories={categories} technologies={technologies} />);
    await fillValidDetails(user);
    await user.click(screen.getByRole("button", { name: "Continue to technologies" }));
    await user.click(screen.getByRole("checkbox", { name: "React" }));
    const detailsHeading = screen.getByText("Project details", { selector: "h2" });
    const demoUrl = screen.getByLabelText("Live demo URL");
    let errorDescriptionWhenFocused: string | null = null;
    detailsHeading.addEventListener("focus", () => {
      const errorId = demoUrl
        .getAttribute("aria-describedby")
        ?.split(" ")
        .find((id) => id === "demoUrl-error");
      errorDescriptionWhenFocused = errorId
        ? document.getElementById(errorId)?.textContent ?? null
        : null;
    });
    await user.click(screen.getByRole("button", { name: "Create draft and add images" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Project details" })).toHaveFocus();
    });
    expect(errorDescriptionWhenFocused).toBe("Enter a valid HTTP or HTTPS URL.");
    expect(demoUrl).toHaveAccessibleDescription(
      /Enter a valid HTTP or HTTPS URL\./,
    );
    expect(screen.queryByRole("group", { name: "Technologies" })).not.toBeInTheDocument();
  });
});
