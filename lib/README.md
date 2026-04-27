# Lib

This folder contains shared client-side helpers that do not belong in React components or hooks.

## Structure

- `chat/`: chat-specific constants, transport helpers, model catalog shaping, and transcript utilities
- `conversations/`: client conversation API helpers, shared types, and conversation-specific error classes
- `ddx/`: differential diagnosis formatting helpers used by the consultation UI
- `utils/`: generic shared utilities such as class-name merging and date formatting

## Conventions

- Organize `lib/` by domain or responsibility rather than by file type.
- Keep browser-safe client helpers here.
- Move server-only orchestration and persistence logic into `server/`.
- Keep formatting helpers here when they are shared across multiple UI features.
- Prefer feature folders once a helper area grows beyond a single file.

## Related Documentation

- [`../README.md`](../README.md)
- [`../components/README.md`](../components/README.md)
- [`../server/README.md`](../server/README.md)
