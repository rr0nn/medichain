# Components

This folder contains reusable React UI for the chat experience, workflow visualization, and grounded differential diagnosis panel.

## Structure

- `ui/`: shared UI primitives installed from shadcn/ui, such as buttons, tooltips, and separators
- `ai-elements/`: shared chat primitives installed from Vercel AI Elements, used to render messages and conversation containers
- root-level feature components: higher-level MediChain UI such as the differential panel, workflow canvas, theme selector, and conversation sidebar

## Key Components

- `ddx-panel.tsx`: renders workflow state, safety review, grounding audit, and ranked differentials
- `ddx-kg.tsx`: visualizes diagnosis evidence paths from the knowledge graph
- `workflow-canvas.tsx`: displays stage-by-stage workflow progress
- `conversation-sidebar.tsx`: conversation list and session switching UI
- `theme-selector.tsx` and `theme-provider.tsx`: theme switching support
- `ai-elements/`: shared chat layout and message presentation

## Conventions

- `ui/` is the default location for external primitive installs from shadcn/ui.
- `ai-elements/` is the default location for external chat UI primitives from Vercel AI Elements.
- Treat both folders as shared primitive layers and edit them carefully when syncing or adapting upstream code.
- Keep domain-heavy data shaping out of components when it can live in `server/` or `lib/`.
- Co-locate component tests next to the component when the test is tightly coupled to its rendered behavior.

## Testing

Current component coverage includes:

- `ddx-panel.test.tsx`
- integration tests under [`../tests/integration`](../tests/integration)

## Related Documentation

- [`../README.md`](../README.md)
- [`../app/README.md`](../app/README.md)
- [`../tests/README.md`](../tests/README.md)
