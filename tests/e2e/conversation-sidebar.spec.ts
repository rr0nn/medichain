/**
 * @fileoverview Exercises consultation sidebar behavior, including conversation switching and collapse state.
 * @contributors John Kollannur
 */

import { expect, test } from "@playwright/test";

import {
  conversation,
  mockConversationList,
  mockConversationMessages,
  mockModels,
  textMessage,
} from "./helpers";

test("switches between saved consultations", async ({ page }) => {
  await mockModels(page);
  await mockConversationList(page, [
    conversation("conv-1", "Chest pain review", 2),
    conversation("conv-2", "Abdominal pain review", 1),
  ]);

  await mockConversationMessages(page, "conv-1", [
    textMessage("m1", "user", "Chest pain for two hours"),
    textMessage("m2", "assistant", "Are there associated symptoms?"),
  ]);

  await mockConversationMessages(page, "conv-2", [
    textMessage("m3", "user", "Right lower quadrant abdominal pain"),
  ]);

  await page.goto("/?conversationId=conv-1");

  await expect(page.getByText("Chest pain for two hours")).toBeVisible();
  await expect(page).toHaveURL(/conversationId=conv-1/);

  await page.getByText("Abdominal pain review").click();

  await expect(page).toHaveURL(/conversationId=conv-2/);
  await expect(page.getByText("Right lower quadrant abdominal pain")).toBeVisible();
});

test("collapses and expands the sidebar", async ({ page }) => {
  await mockModels(page);
  await mockConversationList(page, [
    conversation("conv-1", "Chest pain review", 2),
  ]);

  await page.goto("/");

  await page.getByTitle("Collapse sidebar").click();
  await expect(page.getByTitle("Expand sidebar")).toBeVisible();

  await page.getByTitle("Expand sidebar").click();
  await expect(
    page.locator("aside").getByText("Consultations", { exact: true }),
  ).toBeVisible();
});
