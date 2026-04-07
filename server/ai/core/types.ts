import type { UIMessage } from "ai";

export interface ChatRequest {
  id?: string;
  messages: UIMessage[];
}
