import { google } from "@ai-sdk/google";

export function getDefaultChatModel() {
  return google("gemini-2.5-flash");
}
