# Server AI

This folder contains backend-only AI orchestration code.

## Layout

- `core/`: shared model setup, base types, and cross-cutting server helpers.
- `agents/`: one folder per agent, such as `chat-agent/` or `kg-retrieval-agent/`.
- `tools/`: shared tools and domain-specific tools that agents can reuse.
- `workflows/`: one folder per orchestration flow used by routes, jobs, or actions.
- `prompts/`: shared prompt templates and prompt builders.
- `schemas/`: shared Zod schemas for tools and structured outputs.

## Conventions

- Keep route handlers thin and call a workflow in this folder.
- Prefer one folder per agent, tool, and workflow once the module is non-trivial.
- Put reusable tools under `tools/shared/`.
- Put domain-specific reusable tools under folders like `tools/diagnosis/` or `tools/patient/`.
