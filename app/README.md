# App

This folder contains the Next.js application entry points: the main page, global styles, and API route handlers.

## Responsibilities

- define the root app shell and page metadata
- host the primary chat UI page
- expose HTTP endpoints for conversation CRUD and chat streaming
- apply global visual theming and shared CSS

## Key Files

- `layout.tsx`: root layout shared by all routes
- `page.tsx`: main chat and differential diagnosis page
- `globals.css`: global styles, Tailwind layer setup, and shared theme tokens
- `api/`: internal application API routes for conversations, messages, and chat streaming

## Notification Behavior

- `layout.tsx` mounts the shared Sonner toaster so client hooks can raise toast notifications anywhere in the app shell.
- Conversation and chat hooks are responsible for deciding when persistence and streaming failures should be surfaced to the user.
- API routes and server modules should shape streaming error payloads, not call UI notification code directly.

## Design Rules

- Keep API route handlers thin.
- Move orchestration and persistence logic into `server/`.
- Keep page-level state here only when it is genuinely route-scoped, and prefer feature hooks for client orchestration.
- Shared UI belongs in `components/`, not in route files.
- Treat `page.tsx` as a composition layer that wires hooks and feature components together, rather than a home for fetch-heavy UI logic.

## When To Edit This Folder

Edit `app/` when you need to:

- add or change a route
- change page composition
- adjust app-wide metadata or styling
- wire request/response boundaries to server-side modules

## Related Documentation

- [`../README.md`](../README.md)
- [`api/README.md`](api/README.md)
- [`../components/README.md`](../components/README.md)
- [`../server/README.md`](../server/README.md)
