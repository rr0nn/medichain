/**
 * @fileoverview Centralizes the server-side AI model helpers used by agents and workflows.
 * @contributors Johnson Zhang
 */

import { google } from "@ai-sdk/google";

export function getDefaultChatModel() {
  return google("gemini-2.5-flash");
}

export function getDefaultDiagnosisModel() {
  return google("gemini-2.5-flash");
}
