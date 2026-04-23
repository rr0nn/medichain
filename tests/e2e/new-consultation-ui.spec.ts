/**
 * @fileoverview Covers returning to the fresh consultation state from the header and sidebar controls.
 * @contributor John Kollannur
 */

import { expect, test } from "@playwright/test";

import {
  conversation,
  mockConversationList,
  mockConversationMessages,
  mockModels,
  textMessage,
} from "./helpers";

test("resets to a new consultation state from the header brand button", async ({ page }) => {
  await mockModels(page);
  await mockConversationList(page, [
    conversation("conv-1", "Chest pain review", 2),
  ]);
  await mockConversationMessages(page, "conv-1", [
    textMessage("m1", "user", "Chest pain for two hours"),
    textMessage("m2", "assistant", "Are there associated symptoms?"),
  ]);

  await page.goto("/?conversationId=conv-1");

  await expect(page.getByText("Chest pain for two hours")).toBeVisible();

  await page.getByRole("button", { name: /kg-grounded/i }).click();

  await expect(page).not.toHaveURL(/conversationId=/);
  await expect(
    page.getByPlaceholder(/Describe the presenting complaint to start a consultation/i),
  ).toBeVisible();
});

test("shows the new consultation action in the sidebar", async ({ page }) => {
  await mockModels(page);
  await mockConversationList(page, []);

  await page.goto("/");

  await expect(page.locator("aside").getByTitle("New consultation")).toBeVisible();
});
