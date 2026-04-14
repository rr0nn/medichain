# Prisma

This folder contains the relational database schema and migration history for the application conversation store.

## Contents

- `schema.prisma`: Prisma data model for conversations and messages
- `migrations/`: SQL migration history generated from schema changes

## Current Data Model

The current schema stores:

- `Conversation`: consultation metadata such as title and timestamps
- `Message`: persisted chat message role, JSON parts payload, and creation time

## Conventions

- Update `schema.prisma` first, then generate a migration.
- Treat migration files as historical records; do not rewrite applied migrations casually.
- Keep Prisma focused on application persistence, not the Neo4j knowledge graph.

## Common Commands

```bash
docker compose run --rm migrate
pnpm prisma:generate
```

## Related Documentation

- [`../README.md`](../README.md)
- [`../server/db/README.md`](../server/db/README.md)
