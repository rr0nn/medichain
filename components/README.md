# Components

This folder contains reusable React UI for the chat experience, workflow visualization, and grounded differential diagnosis panel.

## Structure

- `ui/`: shared UI primitives installed from shadcn/ui, such as buttons, tooltips, and separators
- `ai-elements/`: shared chat primitives installed from Vercel AI Elements, used to render messages and conversation containers
- `ddx/`: differential diagnosis feature components, including the panel, evidence graph, evidence summary, safety review, and workflow canvas
- `layout/`: application shell components such as the background layer and conversation sidebar
- `theme/`: theme switching components and the theme provider

## Key Components

- `ddx/ddx-panel.tsx`: renders workflow state, evidence summary, safety review, and ranked differentials
- `ddx/evidence-subgraph.tsx`: visualizes diagnosis evidence paths as a subgraph of the knowledge graph
- `ddx/workflow-canvas.tsx`: displays stage-by-stage workflow progress
- `layout/conversation-sidebar.tsx`: conversation list and session switching UI
- `theme/theme-selector.tsx` and `theme/theme-provider.tsx`: theme switching support
- `ai-elements/model-selector.tsx`: adapted AI Elements model selector used in the chat header
- `ai-elements/`: shared chat layout and message presentation

## Conventions

- `ui/` is the default location for external primitive installs from shadcn/ui.
- `ai-elements/` is the default location for external chat UI primitives from Vercel AI Elements.
- Organize app-specific components by feature or app concern before adding new top-level files.
- Treat both folders as shared primitive layers and edit them carefully when syncing or adapting upstream code.
- Keep domain-heavy data shaping out of components when it can live in `server/` or `lib/`.
- Co-locate component tests next to the component when the test is tightly coupled to its rendered behavior.

## Testing

Current component coverage includes:

- `ddx/ddx-panel.test.tsx`
- integration tests under [`../tests/integration`](../tests/integration)

## Related Documentation

- [`../README.md`](../README.md)
- [`../app/README.md`](../app/README.md)
- [`../tests/README.md`](../tests/README.md)
