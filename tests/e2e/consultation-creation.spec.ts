/**
 * @fileoverview Covers consultation creation flows, including creation failure and failed first-message submission.
 * @contributors John Kollannur
 */

import { expect, test } from "@playwright/test";

import {
  conversation,
  mockModels,
} from "./helpers";

test("shows an error toast and preserves input when conversation creation fails", async ({ page }) => {
  await mockModels(page);

  await page.route("**/api/conversations", async (route) => {
    const request = route.request();

    if (request.method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
      return;
    }

    if (request.method() === "POST") {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Failed to create conversation" }),
      });
      return;
    }

    await route.fallback();
  });

  await page.goto("/");

  const textarea = page.getByPlaceholder(
    /Describe the presenting complaint to start a consultation/i,
  );

  await textarea.fill("Patient has severe central chest pain");
  await page.getByRole("button", { name: "Send message" }).click();

  await expect(page.getByText("Failed to create conversation")).toBeVisible();
  await expect(textarea).toHaveValue("Patient has severe central chest pain");
  await expect(page).not.toHaveURL(/conversationId=/);
});

test("creates a consultation, updates the URL, refreshes the sidebar, and resets the composer into existing-conversation mode", async ({ page }) => {
  await mockModels(page);

  let listState = "empty";

  await page.route("**/api/conversations", async (route) => {
    const request = route.request();

    if (request.method() === "GET") {
      const conversations =
        listState === "created"
          ? [conversation("conv-new", "Patient has severe central chest pain", 0)]
          : [];

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(conversations),
      });
      return;
    }

    if (request.method() === "POST") {
      listState = "created";

      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ id: "conv-new" }),
      });
      return;
    }

    await route.fallback();
  });

  await page.route("**/api/conversations/conv-new/messages", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });

  await page.route("**/api/conversations/conv-new/chat", async (route) => {
    await route.abort("failed");
  });

  await page.goto("/");

  const textarea = page.getByPlaceholder(
    /Describe the presenting complaint to start a consultation/i,
  );

  await textarea.fill("Patient has severe central chest pain");
  await page.getByRole("button", { name: "Send message" }).click();

  await expect(page).toHaveURL(/conversationId=conv-new/);
  await expect(
    page.getByPlaceholder(
      /Describe the patient presentation, timing, severity, and relevant findings/i,
    ),
  ).toHaveValue("");
  await expect(
    page.locator("aside").getByText("Patient has severe central chest pain"),
  ).toBeVisible();
});
