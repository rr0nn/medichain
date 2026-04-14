# Workflows

This folder contains the multi-step orchestration logic that combines agents, graph tools, scoring, and review decisions into end-to-end behavior.

## Current Workflows

- `ddx-workflow/`: differential diagnosis generation, evidence retrieval, and ranking
- `safety-workflow/`: confidence and grounding review before results are surfaced
- `interview-workflow/`: interview-oriented workflow support used by the chat layer

## Responsibilities

- define the order in which matching, retrieval, and review steps run
- shape typed outputs consumed by routes and UI
- emit workflow progress where the frontend needs step-level state

## Conventions

- Keep each workflow in its own folder.
- Put public orchestration in `workflow.ts`.
- Keep workflow-specific types, helpers, and tests alongside the workflow.
- Avoid leaking low-level database or graph query details into route handlers.

## Testing

Workflow tests live next to the workflow they validate and should focus on orchestration behavior, result shaping, and edge cases.

## Related Documentation

- [`../README.md`](../README.md)
- [`../agents/README.md`](../agents/README.md)
- [`../tools/README.md`](../tools/README.md)
