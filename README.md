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

The project is split into three main layers:

- `app/`: Next.js application shell, pages, styles, and API route handlers
- `components/`: client-side UI for chat, workflow state, and differential display
- `server/`: server-side orchestration, AI workflows, graph access, and persistence

Within `server/ai/`, the diagnosis pipeline is organized as:

- `agents/`: focused matchers and the interview agent
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

## Prerequisites

Before running the project, make sure you have:

- Node.js 20+
- pnpm 10+
- Docker + Docker Compose v2
- access to a PostgreSQL database
- access to a Neo4j database seeded with the project graph
- a Google Generative AI API key
- optionally, an Anthropic API key if you want to use Claude models
- optionally, an OpenAI API key if you want to use OpenAI models

If pnpm is not installed locally:

```bash
corepack enable
corepack prepare pnpm@10.33.0 --activate
```

## Environment Setup

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Required variables:

- `DATABASE_URL`
- `GOOGLE_GENERATIVE_AI_API_KEY`
- `NEO4J_URI`
- `NEO4J_USERNAME`
- `NEO4J_PASSWORD`
- `NEO4J_DATABASE`

Optional variables:

- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`

Variable roles:

- `DATABASE_URL`: PostgreSQL connection string for conversation and message persistence
- `GOOGLE_GENERATIVE_AI_API_KEY`: API key used by the default Gemini-backed server-side AI agents and workflows
- `ANTHROPIC_API_KEY`: optional API key required to use Claude models from the model selector
- `OPENAI_API_KEY`: optional API key required to use OpenAI models from the model selector
- `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD`, `NEO4J_DATABASE`: Neo4j connection settings for the diagnosis knowledge graph

Optional Aura metadata:

- `AURA_INSTANCEID`
- `AURA_INSTANCENAME`

## Getting Started

### Docker-Based Setup

1. Clone the repository and enter it.
2. Create `.env.local` from `.env.example`.
3. Start PostgreSQL:

```bash
docker compose up -d db
```

4. Apply Prisma migrations:

```bash
docker compose run --rm migrate
```

5. Start the app container:

```bash
docker compose up -d web
```

6. Open `http://localhost:3000`.

### Local Development

1. Create `.env.local`.
2. Start PostgreSQL and apply migrations:

```bash
docker compose up -d db
docker compose run --rm migrate
```

3. Install dependencies:

```bash
pnpm install
```

4. Start the development server:

```bash
pnpm dev
```

## Useful Commands

```bash
pnpm dev
pnpm build
pnpm start
pnpm lint
pnpm test
pnpm test:watch
pnpm test:coverage
```

Docker helpers:

```bash
docker compose up -d --build
docker compose down
docker compose down -v
```

`docker compose down -v` is destructive and removes local database volume data.

## Knowledge Graph Setup

The diagnosis pipeline depends on a seeded Neo4j graph.

1. Start or connect to a Neo4j instance.
2. Configure the Neo4j variables in `.env.local`.
3. Seed the graph using [`docs/knowledge-graph/seeding.cypher`](docs/knowledge-graph/seeding.cypher).
4. Review the schema in [`docs/knowledge-graph/schema.md`](docs/knowledge-graph/schema.md).

## Project Structure

```text
app/                    Next.js pages, routes, and global styles
components/             UI building blocks and feature components
docs/                   Supporting project documentation
lib/                    Small shared frontend utilities
prisma/                 Database schema and migrations
server/
  ai/                   AI orchestration, agents, tools, and workflows
  db/                   Prisma-based persistence layer
tests/                  Integration tests and shared test setup
public/                 Static assets
```

## Recommended Read Order

- [`app/README.md`](app/README.md)
- [`app/api/README.md`](app/api/README.md)
- [`components/README.md`](components/README.md)
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
- If `ANTHROPIC_API_KEY` is not set, Claude models remain visible but unavailable in the selector and requests using them will fail with an explicit model-unavailable error.
- If `OPENAI_API_KEY` is not set, OpenAI models remain visible but unavailable in the selector and requests using them will fail with an explicit model-unavailable error.
