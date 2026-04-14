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
- `globals.css`: global styles and Tailwind layer setup
- `theme.css`: theme tokens and shared visual variables
- `api/`: internal application API routes for conversations, messages, and chat streaming

## Design Rules

- Keep API route handlers thin.
- Move orchestration and persistence logic into `server/`.
- Keep page-level state here only when it is genuinely route-scoped.
- Shared UI belongs in `components/`, not in route files.

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
