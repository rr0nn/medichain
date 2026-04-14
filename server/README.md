# Server

This folder contains all server-side application code that should stay out of the Next.js route layer.

## Structure

- `ai/`: model configuration, agents, graph tools, and multi-step workflows
- `db/`: Prisma client setup and conversation persistence helpers

## Responsibilities

- hold business logic used by API routes
- coordinate diagnosis and safety workflows
- talk to PostgreSQL and Neo4j
- keep external service boundaries away from UI code

## Conventions

- Route handlers in `app/api` should delegate into this folder.
- Persistence code belongs in `db/`.
- AI orchestration and graph logic belong in `ai/`.
- Avoid importing UI-layer components or browser-only APIs here.

## Related Documentation

- [`../README.md`](../README.md)
- [`ai/README.md`](ai/README.md)
- [`db/README.md`](db/README.md)
