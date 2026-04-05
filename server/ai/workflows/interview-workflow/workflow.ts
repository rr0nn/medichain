import type { UIMessageStreamWriter } from "ai";
import type { ChatRequest } from "@/server/ai/core/types";
import { runInterviewAgent } from "@/server/ai/agents/interview-agent/agent";

export async function runInterviewerWorkflow(
  input: ChatRequest,
  writer: UIMessageStreamWriter,
  onAssistantFinish?: (text: string) => Promise<void>
) {
  return runInterviewAgent(input, writer, onAssistantFinish);
}
