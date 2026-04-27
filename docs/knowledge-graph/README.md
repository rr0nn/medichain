# Knowledge Graph Docs

This folder documents the Neo4j knowledge graph used by the diagnosis workflow.

## Files

- `schema.md`: graph entities, relationships, and conceptual model
- `seeding.cypher`: Cypher script used to seed the graph with the project dataset

## How It Fits In

The diagnosis pipeline uses this graph to:

- match clinical presentations
- traverse from presentations to categories and features
- retrieve diagnosis candidates
- attach supporting source references to grounded output

## Seeding

Run `pnpm seed:graph` from the repo root to execute [`seeding.cypher`](./seeding.cypher) against the Neo4j database configured by `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD`, and `NEO4J_DATABASE`.

The current seed script is a full reset: it drops constraints, deletes all graph data, and then recreates the documented dataset.

## Conventions

- Update `schema.md` when graph entities or relationships change.
- Keep `seeding.cypher` aligned with the schema documentation.
- Document major graph modeling changes here before they spread into workflow code assumptions.

## Related Documentation

- [`../../README.md`](../../README.md)
- [`../../server/ai/tools/README.md`](../../server/ai/tools/README.md)
- [`../../server/ai/workflows/README.md`](../../server/ai/workflows/README.md)
