/**
 * @fileoverview Verifies that the main consultation workspace loads with the expected core UI regions.
 * @contributors John Kollannur
 */

import { expect, test } from "@playwright/test";

import {
  conversation,
  mockConversationList,
  mockModels,
} from "./helpers";

test("loads the main consultation workspace", async ({ page }) => {
  await mockModels(page);
  await mockConversationList(page, [
    conversation("conv-1", "Chest pain review", 2),
    conversation("conv-2", "Abdominal pain review", 3),
  ]);

  await page.goto("/");

  await expect(page.getByText("Differential Diagnosis Support")).toBeVisible();
  await expect(page.getByText("Consultations")).toBeVisible();
  await expect(page.getByText("Workflow Status")).toBeVisible();
  await expect(page.getByText("Differential List")).toBeVisible();
  await expect(
    page.getByPlaceholder(/Describe the presenting complaint to start a consultation/i),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /models/i })).toBeVisible();
});
