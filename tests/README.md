# Tests

This folder contains shared test setup and integration tests that exercise behavior across module boundaries.

## Structure

- `setup.ts`: shared Vitest setup used across the test suite
- `integration/`: integration tests covering route, workflow, and UI behavior

Most unit tests are colocated with the source files they validate. This folder is mainly for shared test setup and broader integration coverage.

## Current Integration Coverage

- conversation chat route behavior
- differential diagnosis workflow orchestration
- differential diagnosis panel rendering

## Conventions

- Put focused unit tests next to the source file they validate when possible.
- Put cross-module tests here when they exercise larger user or system flows.
- Prefer explicit mocks at the external boundary and keep the internal orchestration under test real.

## Running Tests

```bash
pnpm test
pnpm test:watch
pnpm test:coverage
```

## Related Documentation

- [`../README.md`](../README.md)
- [`../components/README.md`](../components/README.md)
- [`../server/README.md`](../server/README.md)
