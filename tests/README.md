# Tests

This directory contains shared test setup plus the repository's integration and end-to-end test suites.

## Structure

- `setup.ts`: shared Vitest setup used across the unit and integration suite
- `integration/`: Vitest integration tests covering route, workflow, and UI behavior across module boundaries
- `e2e/`: Playwright end-to-end tests covering browser-visible user flows
- `playwright.config.ts`: shared Playwright configuration for the E2E suite

Most unit tests remain colocated with the source files or feature folder they validate. This directory holds shared setup, broader integration coverage, and browser-level E2E coverage.

## Testing Strategy

This project uses a layered testing approach.

### Unit Tests

Unit tests are colocated with the source files they exercise and focus on:
- pure logic
- data shaping and parsing
- component behavior in isolation
- hook state transitions
- agent and workflow helper behavior

### Integration Tests

Integration tests live in `tests/integration/` and focus on behavior across module boundaries while mocking unstable external dependencies at the system edge.

Current integration coverage includes:
- conversation chat route behavior
- differential diagnosis workflow orchestration
- differential diagnosis panel rendering

### End-to-End Tests

Playwright tests live in `tests/e2e/` and focus on browser-visible workflows:
- loading the main consultation workspace
- opening and configuring model settings
- switching between saved consultations
- collapsing and expanding the consultation sidebar
- starting a new consultation
- recovering from conversation creation failures
- handling missing consultation history
- showing browser-visible error toasts for failed API requests

## Why The E2E Suite Uses Mocked API Boundaries

The automated browser E2E suite intentionally mocks backend HTTP boundaries such as:
- `/api/models`
- `/api/conversations`
- `/api/conversations/:id/messages`

This keeps the Playwright suite deterministic and robust.

The full diagnosis pipeline depends on live AI provider responses, streaming transport behavior, Neo4j graph state, network stability, and environment secrets. Those dependencies matter for the real system, but they are not ideal for the main automated E2E suite because failures may happen for reasons outside the application code.

## Happy And Sad Path Coverage

The overall test suite includes both successful and failure scenarios.

Frontend/browser examples:
- successful workspace render
- successful model dialog interaction
- successful conversation switching
- failed conversation list fetch
- failed consultation creation
- missing consultation history
- unavailable model visibility in the settings dialog

Backend/integration examples:
- route orchestration behavior
- workflow coordination
- UI rendering with workflow-shaped data
- error classification and provider failure handling

## Running Tests

### Unit And Integration Tests

```bash
pnpm test
pnpm test:watch
pnpm test:coverage
```

### End-to-End Tests

Because the Playwright config lives in `tests/`, run:

```bash
pnpm exec playwright test -c tests/playwright.config.ts
```

### End-to-End Tests In Headed Mode

```bash
pnpm exec playwright test -c tests/playwright.config.ts --headed
```

## E2E Environment Setup

1. Install dependencies:

```bash
pnpm install
pnpm exec playwright install
```

2. Configure `.env.local`.

3. Start PostgreSQL and run migrations if your local app setup depends on them:

```bash
docker compose up -d db
docker compose run --rm migrate
```

4. Start the app manually if you are not relying on Playwright to launch it automatically:

```bash
pnpm dev
```

## Conventions

- Put focused unit tests next to the source file they validate when possible.
- For `components/`, prefer feature-local `__tests__/` folders rather than mixing `*.test.tsx` files directly into the main component file list.
- For `hooks/`, prefer a local `__tests__/` folder when the main hook directory becomes noisy.
- Put cross-module tests in `tests/integration/` when they exercise larger system flows.
- Put browser-level tests in `tests/e2e/` and name them `*.spec.ts`.
- Prefer explicit mocks at unstable external boundaries and keep internal orchestration under test real.

## Related Documentation

- [`../README.md`](../README.md)
- [`../components/README.md`](../components/README.md)
- [`../server/README.md`](../server/README.md)
