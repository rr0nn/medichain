/**
 * @fileoverview Covers the model settings dialog, including unavailable options and persisted selections.
 * @contributors John Kollannur
 */

import { expect, test } from "@playwright/test";

import {
  mockConversationList,
  mockModels,
} from "./helpers";

test("opens model settings and shows available and unavailable models", async ({ page }) => {
  await mockModels(page);
  await mockConversationList(page, []);

  await page.goto("/");

  await page.getByRole("button", { name: /models/i }).click();
  const dialog = page.getByRole("dialog");

  await expect(dialog.getByText("Model Settings")).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: /Gemini 1.5 Flash/i }).first(),
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: /Gemini 1.5 Pro/i }).first(),
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: /Claude 3.5 Sonnet/i }),
  ).toBeVisible();
  await expect(dialog.getByText("Unavailable", { exact: true })).toBeVisible();
  await expect(dialog.getByRole("heading", { name: "Chat Model" })).toBeVisible();
  await expect(dialog.getByRole("heading", { name: "Diagnosis Model" })).toBeVisible();
});

test("persists selected models across reloads", async ({ page }) => {
  await mockModels(page);
  await mockConversationList(page, []);

  await page.goto("/");

  await page.getByRole("button", { name: /models/i }).click();

  await page.getByRole("button", { name: /Gemini 1.5 Pro/i }).first().click();
  await page.getByRole("button", { name: /Gemini 1.5 Pro/i }).nth(1).click();

  await page.keyboard.press("Escape");

  await expect(page.getByRole("button", { name: /models/i })).toContainText(
    "Gemini 1.5 Pro / Gemini 1.5 Pro",
  );

  await page.reload();

  await expect(page.getByRole("button", { name: /models/i })).toContainText(
    "Gemini 1.5 Pro / Gemini 1.5 Pro",
  );
});
