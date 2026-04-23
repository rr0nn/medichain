/**
 * @fileoverview Verifies browser-visible error handling for failed conversation list and missing consultation history requests.
 * @contributors John Kollannur
 */

import { expect, test } from "@playwright/test";

import { mockModels } from "./helpers";

test("shows a toast when the conversation list fails to load", async ({ page }) => {
  await mockModels(page);

  await page.route("**/api/conversations", async (route) => {
    if (route.request().method() !== "GET") {
      await route.fallback();
      return;
    }

    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: "Failed to load conversations" }),
    });
  });

  await page.goto("/");

  await expect(page.getByText("Failed to load conversations")).toBeVisible();
});

test("redirects back to the empty consultation state when a consultation id is missing", async ({ page }) => {
  await mockModels(page);

  await page.route("**/api/conversations", async (route) => {
    if (route.request().method() !== "GET") {
      await route.fallback();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });

  await page.route("**/api/conversations/missing/messages", async (route) => {
    await route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ error: "Not found" }),
    });
  });

  await page.goto("/?conversationId=missing");

  await expect(page.getByText("Consultation not found")).toBeVisible();
  await expect(page).not.toHaveURL(/conversationId=missing/);
  await expect(
    page.getByPlaceholder(/Describe the presenting complaint to start a consultation/i),
  ).toBeVisible();
});
