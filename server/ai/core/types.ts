/**
 * @fileoverview Defines shared request and message types for the server-side AI pipeline.
 * @contributors Aryan Wadhawan, Johnson Zhang
 */

import type { UIMessage } from "ai";

/**
 * Represents the server-side chat request payload passed into AI agents and workflows.
 */
export interface ChatRequest {
  chatModelId?: string | null;
  diagnosisModelId?: string | null;
  id?: string;
  messages: UIMessage[];
}
