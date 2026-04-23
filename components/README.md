# Components

This folder contains reusable React UI for the chat experience, workflow visualization, and grounded differential diagnosis panel.

## Structure

- `ui/`: shared UI primitives installed from shadcn/ui, such as buttons, tooltips, and separators
- `ai-elements/`: shared chat primitives installed from Vercel AI Elements, used to render messages and conversation containers
- `chat/`: app-specific chat layout sections such as the chat header, message list, and composer
- `consultation/`: screen-level consultation containers that compose chat, sidebar, and DDX panels
- `ddx/`: differential diagnosis feature components, including the panel, evidence graph, evidence summary, safety review, and workflow canvas
- `layout/`: application shell components such as the background layer and conversation sidebar
- `theme/`: theme switching components and the theme provider

## Key Components

- `chat/chat-header.tsx`, `chat/model-settings-dialog.tsx`, `chat/chat-message-list.tsx`, and `chat/chat-composer.tsx`: structure the left-side consultation experience
- `consultation/consultation-screen.tsx`: composes the full consultation screen from sidebar, chat, and DDX feature sections
- `ui/toaster.tsx`: shared app toaster wrapper that keeps Sonner aligned with the current theme and global placement
- `ddx/ddx-panel.tsx`: renders workflow state, evidence summary, safety review, and ranked differentials
- `ddx/evidence-subgraph.tsx`: visualizes diagnosis evidence paths as a subgraph of the knowledge graph
- `ddx/workflow-canvas.tsx`: displays stage-by-stage workflow progress
- `layout/conversation-sidebar.tsx`: conversation list and session switching UI
- `theme/theme-selector.tsx` and `theme/theme-provider.tsx`: theme switching support
- `ai-elements/model-provider-logo.tsx`: reduced AI Elements-derived helper for rendering provider logos in model-related UI
- `ai-elements/`: shared chat layout and message presentation

## Related Hooks

- `../hooks/use-conversation-session.ts`: owns URL-synced chat session lifecycle, message loading, first-message conversation creation flow, and chat-related toast handling
- `../hooks/use-conversation-list.ts`: owns sidebar list loading, deletion, collapse state, refresh behavior, and sidebar toast handling

## Conventions

- `ui/` is the default location for external primitive installs from shadcn/ui.
- `ai-elements/` is the default location for external chat UI primitives from Vercel AI Elements.
- Organize app-specific components by feature or app concern before adding new top-level files.
- Treat both folders as shared primitive layers and edit them carefully when syncing or adapting upstream code.
- Keep domain-heavy data shaping out of components when it can live in `server/` or `lib/`.
- Keep route sync, fetch orchestration, and conversation lifecycle logic in hooks or client helpers rather than in render components.
- Keep `chat/` focused on the active consultation pane, and keep `conversation-*` naming for history/session list concerns.
- Keep full-screen consultation composition in `consultation/`, and reserve `layout/` for reusable app shell pieces.
- Keep toast triggering in client hooks and feature orchestration layers rather than spreading `toast.*` calls across presentation components.
- Put component unit tests in feature-local `__tests__/` folders to keep source files visible without separating tests from their owning feature.

## Testing

Current component coverage includes:

- `chat/__tests__/chat-composer.test.tsx`
- `chat/__tests__/chat-message-list.test.tsx`
- `layout/__tests__/conversation-sidebar.test.tsx`
- `ddx/__tests__/ddx-panel.test.tsx`
- integration tests under [`../tests/integration`](../tests/integration)

## Related Documentation

- [`../README.md`](../README.md)
- [`../app/README.md`](../app/README.md)
- [`../tests/README.md`](../tests/README.md)
