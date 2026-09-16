import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { expect, it, vi } from "vitest";

const { clerkProviderMock } = vi.hoisted(() => ({
  clerkProviderMock: vi.fn(
    ({ children }: { afterSignOutUrl?: string; children: React.ReactNode }) =>
      children,
  ),
}));

vi.mock("@clerk/nextjs", () => ({ ClerkProvider: clerkProviderMock }));
vi.mock("next/font/google", () => ({
  Geist: () => ({ variable: "font-sans" }),
  Geist_Mono: () => ({ variable: "font-mono" }),
}));
vi.mock("@/components/layout/site-header", () => ({ SiteHeader: () => null }));
vi.mock("@/components/layout/site-footer", () => ({ SiteFooter: () => null }));

import RootLayout from "./layout";

it("returns signed-out users to the public landing page", () => {
  const layout = RootLayout({
    children: <main>DevHub</main>,
    params: Promise.resolve({}),
  }) as ReactElement<{
    children: ReactElement<{ children: ReactNode }>;
  }>;
  const body = layout.props.children;
  const provider = Children.toArray(body.props.children).find(
    (child) => isValidElement(child) && child.type === clerkProviderMock,
  ) as ReactElement<{ afterSignOutUrl?: string }> | undefined;

  expect(provider?.props.afterSignOutUrl).toBe("/");
});
