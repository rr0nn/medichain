# Tools

This folder contains reusable server-side helpers that support agents and workflows. Tools should encapsulate external boundaries and reusable data access rather than high-level orchestration.

## Structure

- `knowledge-graph/`: typed Neo4j access and graph-specific types for diagnosis retrieval

## Responsibilities

- expose stable interfaces for external systems such as Neo4j
- hold reusable graph query logic
- centralize reusable retrieval logic used by more than one AI module

## Conventions

- Keep tools focused on retrieval, transformation, or narrow helper behavior.
- Avoid placing workflow branching or agent prompt logic here.
- Once a tool has more than one source file, give it its own folder.
- Prefer typed return values so workflows remain explicit and testable.

## Related Documentation

- [`../README.md`](../README.md)
- [`../../../docs/knowledge-graph/README.md`](../../../docs/knowledge-graph/README.md)
