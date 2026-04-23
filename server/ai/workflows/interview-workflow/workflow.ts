/**
 * @fileoverview Runs the interview workflow that powers the chat experience.
 * @contributors Johnson Zhang, Jason Yang, Aryan Wadhawan
 */

import type { UIMessageStreamWriter } from "ai";
import type { ChatRequest } from "@/server/ai/core/types";
import { runInterviewAgent } from "@/server/ai/agents/interview-agent/agent";

/**
 * Runs the top-level interview workflow used by the chat route.
 *
 * This is a thin workflow wrapper around the interview agent so the route layer
 * can depend on a workflow entry point rather than an agent implementation.
 */
export async function runInterviewerWorkflow(
  input: ChatRequest,
  writer: UIMessageStreamWriter
) {
  // Keep the route layer depending on a workflow boundary even though the
  // current interview workflow is a thin wrapper around the interview agent.
  return runInterviewAgent(input, writer);
}
