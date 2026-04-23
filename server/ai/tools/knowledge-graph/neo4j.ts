/**
 * @fileoverview Creates and reuses the shared Neo4j driver and database configuration.
 * @contributors John Kollannur, Johnson Zhang
 */

import neo4j from "neo4j-driver";
import type { Driver } from "neo4j-driver";

const database = process.env.NEO4J_DATABASE ?? "neo4j";

let driver: Driver | null = null;

function getConfiguredDriver(): Driver {
  if (driver) {
    return driver;
  }

  const uri = process.env.NEO4J_URI;
  const username = process.env.NEO4J_USERNAME;
  const password = process.env.NEO4J_PASSWORD;

  if (!uri || !username || !password) {
    throw new Error(
      "Missing Neo4j environment variables: NEO4J_URI, NEO4J_USERNAME, and NEO4J_PASSWORD must be set."
    );
  }

  driver = neo4j.driver(uri, neo4j.auth.basic(username, password));
  return driver;
}

export const neo4jDriver = new Proxy({} as Driver, {
  get(_target, prop, receiver) {
    const configuredDriver = getConfiguredDriver();
    const value = Reflect.get(configuredDriver, prop, receiver);

    if (typeof value === "function") {
      return value.bind(configuredDriver);
    }

    return value;
  },
});

export const neo4jDatabase = database;

/**
 * Closes the shared Neo4j driver and resets the cached driver instance.
 */
export async function closeNeo4jDriver() {
  if (!driver) {
    return;
  }

  await driver.close();
  driver = null;
}
