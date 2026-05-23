# MediChain

MediChain is a prototype system that demonstrates how a knowledge graph-grounded, multi-agent chatbot can support transparent and explainable differential diagnosis reasoning. It is designed to improve clinical efficiency while providing a user-friendly interface for non-technical users.

## What The App Does

- collects a patient presentation through a conversational interface
- matches the presentation to known clinical presentations, categories, and features in the knowledge graph
- retrieves graph-grounded candidate diagnoses and supporting source references
- ranks the differential using explicit matched evidence from the graph
- runs a safety review before presenting results for clinical review
- surfaces a transparent workflow so users can inspect how the differential was derived
- composes a patient-facing response that communicates the grounded result in accessible language

## Architecture Summary

The project is split into three main application layers plus a shared client-helper layer:

- `app/`: Next.js application shell, pages, styles, and API route handlers
- `components/`: client-side UI for chat, workflow state, and differential display
- `server/`: server-side orchestration, AI workflows, graph access, and persistence
- `lib/`: domain-organized client helpers for chat state, conversation API calls, formatting, and shared utilities

Within `server/ai/`, the diagnosis pipeline is organized as:

- `agents/`: focused matchers, the interview agent, and the response composer
- `tools/`: reusable graph and support utilities
- `workflows/`: orchestration steps for interview, differential generation, and safety review

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Prisma + PostgreSQL
- Neo4j
- Vercel AI SDK
- Google Generative AI
- Sonner
- Vitest
- Playwright

## Prerequisites

Before you start, make sure you have:

- Node.js 20+
- pnpm 10+
- Docker + Docker Compose v2
- a reachable Neo4j instance
- the Neo4j URI, username, password, and database name
- at least one AI provider key:
  - Google Gemini
  - OpenAI
  - Anthropic

If pnpm is not installed locally:

```bash
corepack enable
corepack prepare pnpm@10.33.0 --activate
```

At least one provider key is required for the app's AI features to work. Any extra keys you add will make more models available in the selector.

## Quick Start

The fastest way to run the app is with Docker Compose:

1. Clone the repository and enter the project directory:

```bash
git clone <repository-url>
cd capstone-project-26t1-3900-w09a-date
```

2. Create your local environment file:

```bash
cp .env.example .env.local
```

3. Fill in `.env.local` with:

- `DATABASE_URL`
- `NEO4J_URI`
- `NEO4J_USERNAME`
- `NEO4J_PASSWORD`
- `NEO4J_DATABASE`
- at least one provider key:
  - `GOOGLE_GENERATIVE_AI_API_KEY`
  - `OPENAI_API_KEY`
  - `ANTHROPIC_API_KEY`

The default `DATABASE_URL` in `.env.example` already matches the local PostgreSQL container started by `docker compose`.

4. Install dependencies so the Neo4j seed script can run:

```bash
pnpm install
```

5. Seed the knowledge graph once your Neo4j instance is reachable:

```bash
pnpm seed:graph
```

6. Start the app:

```bash
docker compose up --build
```

7. Open `http://localhost:3000`.

The `migrate` service applies Prisma migrations and then exits. That is expected.

## Local Development

Use this path only if you want the Next.js development server with `pnpm dev`.

1. Complete steps 1-5 from [Quick Start](#quick-start).
2. Start PostgreSQL and apply Prisma migrations:

```bash
docker compose up -d db
docker compose run --rm migrate
```

3. Start the development server:

```bash
pnpm dev
```

4. Open `http://localhost:3000`.

## Setup Reference

### Environment Variables

Required:

- `DATABASE_URL`: PostgreSQL connection string for conversation and message persistence
- `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD`, `NEO4J_DATABASE`: Neo4j connection settings for the diagnosis knowledge graph
- one provider key:
  - `GOOGLE_GENERATIVE_AI_API_KEY`: enables Gemini models
  - `OPENAI_API_KEY`: enables OpenAI models
  - `ANTHROPIC_API_KEY`: enables Claude models

Optional:

- any additional provider keys you want available in the model selector

### Knowledge Graph Notes

The diagnosis pipeline depends on a seeded Neo4j graph. Run `pnpm seed:graph` before starting the app for the first time.

`pnpm seed:graph` loads Neo4j credentials from the current shell or `.env.local`, then executes [`docs/knowledge-graph/seeding.cypher`](docs/knowledge-graph/seeding.cypher) through [`scripts/seed-neo4j.mjs`](scripts/seed-neo4j.mjs).

The seed is destructive: it drops graph constraints, deletes existing nodes, and recreates the project dataset.

If you want to inspect or extend the graph, review [`docs/knowledge-graph/schema.md`](docs/knowledge-graph/schema.md). If you make changes directly in Neo4j and want them to become part of the baseline dataset, keep the seed file and schema documentation in sync.

## Useful Commands

```bash
pnpm dev
pnpm build
pnpm start
pnpm lint
pnpm test
pnpm test:watch
pnpm test:coverage
pnpm exec playwright test -c tests/playwright.config.ts
pnpm exec playwright test -c tests/playwright.config.ts --headed
```

Docker helpers:

```bash
docker compose up -d --build
docker compose down
docker compose down -v
```

`docker compose down -v` is destructive and removes local database volume data.

## Project Structure

```text
app/                    Next.js pages, routes, and global styles
components/             UI building blocks and feature components
docs/                   Supporting project documentation
lib/                    Domain-organized client helpers, formatters, and shared utilities
prisma/                 Database schema and migrations
server/
  ai/                   AI orchestration, agents, tools, and workflows
  db/                   Prisma-based persistence layer
tests/                  Integration tests, E2E tests, and shared test setup
public/                 Static assets
```

## Recommended Read Order

- [`app/README.md`](app/README.md)
- [`app/api/README.md`](app/api/README.md)
- [`components/README.md`](components/README.md)
- [`lib/README.md`](lib/README.md)
- [`server/README.md`](server/README.md)
- [`server/ai/README.md`](server/ai/README.md)
- [`prisma/README.md`](prisma/README.md)
- [`docs/knowledge-graph/README.md`](docs/knowledge-graph/README.md)
- [`tests/README.md`](tests/README.md)

## Notes

- Differentials are intended to be graph-grounded rather than free-form model output.
- Safety review can route the conversation back for clarification when evidence is weak.
- API routes should stay thin and delegate work into `server/`.
- The chat UI uses toast notifications for conversation persistence failures, unavailable model selections, and classified LLM stream failures such as provider unavailability or rate limits.
- The frontend loads its model-selector options from a backend-driven model catalog rather than hardcoding the model list locally.
- The UI now exposes separate selectors for the chat model and the diagnosis model. This lets users choose a stronger model for the outer chat orchestration task, while using a lighter and cheaper model for the inner diagnosis semantic-matching pipeline when appropriate.
- The chat model changes the outer interview behavior, such as when follow-up questions are asked or when the diagnosis tool is invoked, while the diagnosis model changes the inner presentation/category/feature matching pipeline.
- If a provider API key is not set, that provider's models remain visible but unavailable in the selector, and requests using them fail with an explicit model-unavailable error.

## License

This project is licensed under the Apache License 2.0. See [`LICENSE`](LICENSE) for details.
