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
- Tests should sit next to the workflow or agent they validate when practical.

## Related Documentation

- [`../README.md`](../README.md)
- [`agents/README.md`](agents/README.md)
- [`tools/README.md`](tools/README.md)
- [`workflows/README.md`](workflows/README.md)
- [`../../docs/knowledge-graph/README.md`](../../docs/knowledge-graph/README.md)
