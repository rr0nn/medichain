# MediChain

MediChain is a knowledge graph-grounded clinical decision support prototype for differential diagnosis. It combines a Neo4j-backed medical knowledge graph with AI workflows that match patient presentations, retrieve graph-supported evidence, rank differential diagnoses, and present grounded results in a patient-facing interface.

## Overview

The system is organized into three main layers:

- `interview-workflow`: handles conversational interaction and collects patient presentation details
- `ddx-workflow`: generates graph-grounded differential diagnoses from matched clinical presentations, categories, and features
- `safety-workflow`: audits grounding, reviews confidence, and determines whether the result is ready for review or needs more information

The frontend displays:

- matched clinical presentations
- matched category and feature evidence
- grounded differential diagnoses
- source references from the knowledge graph

## Tech Stack

- Next.js
- React
- TypeScript
- Neo4j
- Vercel AI SDK
- Google Generative AI

## Prerequisites

Before running the project, make sure you have:

- Docker + Docker Compose (v2)
- Node.js 20+ (for local lint/test/dev workflows)
- pnpm 10+
- access to a Neo4j database
- a Google Generative AI API key

If you need pnpm locally:

```bash
corepack enable
corepack prepare pnpm@10.33.0 --activate
```

## Environment Variables

Copy `.env.example` to `.env.local` and fill in your own values.

```bash
cp .env.example .env.local
```

Required variables:

- `GOOGLE_GENERATIVE_AI_API_KEY`
- `NEO4J_URI`
- `NEO4J_USERNAME`
- `NEO4J_PASSWORD`
- `NEO4J_DATABASE`

Optional Aura metadata:

- `AURA_INSTANCEID`
- `AURA_INSTANCENAME`

## Setup

### Team Onboarding (Docker, recommended)

1. Clone and enter the repository

```bash
git clone <repo-url>
cd capstone-project-26t1-3900-w09a-date
```

2. Configure environment variables

```bash
cp .env.example .env.local
```

3. Fill `.env.local` with valid values for:

- `GOOGLE_GENERATIVE_AI_API_KEY`
- `NEO4J_URI`
- `NEO4J_USERNAME`
- `NEO4J_PASSWORD`
- `NEO4J_DATABASE`

4. Build and start PostgreSQL

```bash
docker compose build web
docker compose up -d db
```

5. Apply database migrations

```bash
docker compose run --rm migrate
```

6. Start the app

```bash
docker compose up -d web
```

7. Open the app at `http://localhost:3000`

8. Verify containers are healthy

```bash
docker compose ps
docker compose logs --tail=100 web
```

### Local Development (without app container)

1. Configure environment variables

```bash
cp .env.example .env.local
```

2. Start PostgreSQL in Docker

```bash
docker compose up -d db
docker compose run --rm migrate
```

3. Install dependencies

```bash
pnpm install
```

4. Run the development server

```bash
pnpm dev
```

5. Open the app at `http://localhost:3000`

### Useful Docker Commands

```bash
docker compose up -d --build
docker compose down
docker compose down -v    # destructive: removes DB volume/data
```

## Available Scripts

```bash
pnpm dev
pnpm build
pnpm start
pnpm test
pnpm test:watch
pnpm test:coverage
pnpm lint
```

## Neo4j Setup

MediChain requires a seeded Neo4j knowledge graph before the differential diagnosis workflow can return grounded results.

1. Start or connect to a Neo4j instance.
2. Configure the Neo4j environment variables in `.env.local`.
3. Seed the database using the script in [`docs/knowledge-graph/seeding.cypher`](docs/knowledge-graph/seeding.cypher).
4. Review the graph model in [`docs/knowledge-graph/schema.md`](docs/knowledge-graph/schema.md) if you need to inspect or extend the dataset.

## Project Structure

```text
app/
  frontend pages and API routes

components/
  frontend UI components, including the workflow canvas and differential panel

server/ai/
  backend AI orchestration
  agents/
  tools/
  workflows/

docs/
  project documentation
  knowledge-graph/
    schema.md
    seeding.cypher
```

## Knowledge Graph

The differential diagnosis pipeline is grounded in a Neo4j knowledge graph built around:

- `ClinicalPresentation`
- `Category`
- `Feature`
- `Diagnosis`
- `Source`

See [`docs/knowledge-graph/schema.md`](docs/knowledge-graph/schema.md) for the current schema.

## Notes

- Differential diagnoses are graph-grounded, not free-form model outputs.
- Safety review may route the case back for more information if grounding or confidence is insufficient.
- Source references shown in the UI are derived from the knowledge graph.

## Related Documentation

- [`docs/knowledge-graph/schema.md`](docs/knowledge-graph/schema.md)
- [`server/ai/README.md`](server/ai/README.md)
