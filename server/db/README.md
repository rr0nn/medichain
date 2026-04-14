# Server DB

This folder contains the PostgreSQL persistence layer built on Prisma.

## Responsibilities

- initialize and reuse the shared Prisma client
- provide conversation and message persistence helpers
- keep storage details out of route handlers and UI code

## Key Files

- `client.ts`: creates the Prisma client and reuses it across hot reloads in development
- `conversations.ts`: CRUD and message persistence helpers for consultation sessions

## Conventions

- Keep database access functions small and explicit.
- Return typed, route-friendly shapes where possible.
- Put cross-table orchestration here only when it is persistence-related.
- Business logic that is not database-specific should stay outside this folder.

## Related Documentation

- [`../../README.md`](../../README.md)
- [`../README.md`](../README.md)
- [`../../prisma/README.md`](../../prisma/README.md)
