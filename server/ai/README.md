# Server AI

This folder contains the backend-only AI pipeline for MediChain. It is responsible for turning a patient-facing conversation into structured, graph-grounded differential diagnosis output.

## Subfolders

- `core/`: shared model configuration and cross-cutting server-side types
- `agents/`: focused AI modules for interview handling and matcher tasks
- `tools/`: reusable graph access and helper utilities used by workflows and agents
- `workflows/`: multi-step orchestration that combines graph retrieval, agents, and review logic

## Current Flow

At a high level, the server-side diagnosis path is:

1. the interview agent receives the conversation and decides whether to call the diagnosis tool
2. the differential workflow matches clinical presentations, categories, and features
3. graph tools retrieve candidate diagnoses and source references from Neo4j
4. the safety workflow reviews confidence and grounding before the response is surfaced
5. the interview layer composes the final patient-facing response from the reviewed result

## Entry Points

- `agents/interview-agent/agent.ts`: main conversational agent used by the chat route
- `workflows/ddx-workflow/workflow.ts`: differential diagnosis pipeline
- `workflows/safety-workflow/workflow.ts`: safety and grounding review
- `tools/knowledge-graph/knowledge-graph.ts`: typed Neo4j read layer

## Conventions

- Keep API route handlers thin and call into this folder.
- Prefer one folder per agent, tool, and workflow once a module becomes non-trivial.
- Put reusable retrieval and integration logic under `tools/`.
- Keep raw external-service access near the boundary it belongs to.
- Classify provider and model-stream failures into stable payloads here so the client can show consistent toast messaging without parsing raw SDK errors.
- Tests should sit next to the workflow or agent they validate when practical.

## Error Signaling

- Chat-stream failures should be serialized into stable client-facing error payloads before they leave the server boundary.
- Unavailable chat-model and diagnosis-model selections should be classified into explicit model-unavailable payloads rather than silently rerouted to another provider.
- Tool-level Neo4j workflow failures are currently handled inside the conversation flow rather than surfaced as separate stream-error toasts.

## Model Selection Split

- The backend owns a central model registry that defines model ids, labels, provider groups, selector support, and availability rules.
- The frontend loads its selector options from the backend model catalog rather than hardcoding the model list locally.
- The UI exposes separate selectors for the interview chat model and the diagnosis model.
- This split is intentional: the chat selector is meant for the outer orchestration task, where users may prefer a stronger model, while the diagnosis selector can use a lighter and cheaper model for semantic matching across graph candidates.
- The selected chat model can affect outer interview orchestration, such as whether the agent asks for clarification or decides to call the diagnosis tool.
- Once the diagnosis tool is invoked, the selected diagnosis model is threaded through the internal presentation/category/feature matcher agents.
- The catalog default prefers the configured default model when it is available, and otherwise uses the first available option for that selector so the initial UI state stays usable.
- If a user explicitly selects a model that is unavailable because its provider API key is missing, the request is rejected with a typed model-unavailable error instead of silently falling back.

## Related Documentation

- [`../README.md`](../README.md)
- [`agents/README.md`](agents/README.md)
- [`tools/README.md`](tools/README.md)
- [`workflows/README.md`](workflows/README.md)
- [`../../docs/knowledge-graph/README.md`](../../docs/knowledge-graph/README.md)
