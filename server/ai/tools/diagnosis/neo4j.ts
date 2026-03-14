// Neo4j connection module:
// initializes the shared Neo4j driver and database name from environment
// configuration, and exposes a cleanup helper for orderly shutdown.
import neo4j from "neo4j-driver";

const uri = process.env.NEO4J_URI!;
const username = process.env.NEO4J_USERNAME!;
const password = process.env.NEO4J_PASSWORD!;
const database = process.env.NEO4J_DATABASE!;

if (!uri || !username || !password || !database) {
  throw new Error("Missing Neo4j environment variables.");
}

export const neo4jDriver = neo4j.driver(
  uri,
  neo4j.auth.basic(username, password)
);

export const neo4jDatabase = database;

export async function closeNeo4jDriver() {
  await neo4jDriver.close();
}
