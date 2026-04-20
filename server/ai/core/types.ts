/**
 * @fileoverview Defines shared request and message types for the server-side AI pipeline.
 * @contributors Aryan Wadhawan, Johnson Zhang
 */

import type { UIMessage } from "ai";
import type { ModelProvider } from "./models";

export interface ChatRequest {
  id?: string;
  messages: UIMessage[];
  modelProvider?: ModelProvider;
}
