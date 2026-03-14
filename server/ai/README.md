# Server AI

This folder contains backend-only AI orchestration code.

## Layout

- `core/`: shared model setup, base types, and cross-cutting server helpers.
- `agents/`: individual agent implementations.
- `tools/`: AI SDK tool definitions and their helpers.
- `workflows/`: orchestration entrypoints used by routes, jobs, or actions.
- `prompts/`: prompt templates and prompt builders.
- `schemas/`: shared Zod schemas for tools and structured outputs.
