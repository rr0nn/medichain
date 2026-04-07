import type { UIMessageStreamWriter } from "ai";
import type { ChatRequest } from "@/server/ai/core/types";
import { runInterviewAgent } from "@/server/ai/agents/interview-agent/agent";

export async function runInterviewerWorkflow(
  input: ChatRequest,
  writer: UIMessageStreamWriter
) {
  return runInterviewAgent(input, writer);
}
