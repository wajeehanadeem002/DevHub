import { expect, test } from "@playwright/test";

test("shows the DevHub foundation landing page", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("DevHub");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Build. Showcase. Connect.",
    }),
  ).toBeVisible();
});
