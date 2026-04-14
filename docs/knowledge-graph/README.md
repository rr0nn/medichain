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

## Conventions

- Update `schema.md` when graph entities or relationships change.
- Keep `seeding.cypher` aligned with the schema documentation.
- Document major graph modeling changes here before they spread into workflow code assumptions.

## Related Documentation

- [`../../README.md`](../../README.md)
- [`../../server/ai/tools/README.md`](../../server/ai/tools/README.md)
- [`../../server/ai/workflows/README.md`](../../server/ai/workflows/README.md)
