# Agents

This folder contains focused AI modules with a narrow responsibility. Each agent should solve one matching or response-generation task rather than owning the full diagnosis flow.

## Current Agents

- `interview-agent/`: owns the user-facing chat behavior and tool calling
- `clinical-presentation-matcher-agent/`: maps free-text descriptions to known clinical presentations
- `category-matcher-agent/`: scores which categories fit a matched presentation
- `feature-matcher-agent/`: scores which specific features are present in the case description
- `response-composer-agent/`: turns grounded workflow output into concise patient-facing explanations

## File Pattern

Typical contents for an agent folder:

- `agent.ts`: public entry point
- `*.test.ts`: focused tests for matching behavior or orchestration
- helper files such as `prompt.ts`, `schema.ts`, or response composition modules when the agent grows

## Conventions

- Keep each agent narrowly scoped.
- Avoid embedding graph queries directly in agents when the logic belongs in `tools/`.
- Prefer returning typed, structured outputs rather than free-form strings when downstream workflows consume the result.
- Co-locate tests with the agent they validate.

## Adding A New Agent

When creating a new agent:

1. create a dedicated folder
2. expose a single clear entry point from `agent.ts`
3. keep prompts, schemas, and helpers local to that folder
4. document where the agent is invoked from

## Related Documentation

- [`../README.md`](../README.md)
- [`../workflows/README.md`](../workflows/README.md)
