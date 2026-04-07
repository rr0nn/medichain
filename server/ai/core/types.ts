import type { UIMessage } from "ai";
import type { ModelProvider } from "./models";

export interface ChatRequest {
  messages: UIMessage[];
  modelProvider?: ModelProvider;
}
