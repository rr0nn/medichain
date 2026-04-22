#!/usr/bin/env node

/**
 * @fileoverview Seeds the Neo4j knowledge graph from a Cypher file.
 * @contributors Johnson Zhang
 */

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { config as loadDotenv } from "dotenv";
import neo4j from "neo4j-driver";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const defaultSeedFile = path.join(rootDir, "docs/knowledge-graph/seeding.cypher");

/**
 * Loads local env files for the seed command.
 *
 * @returns {Promise<void>}
 */
async function loadEnvFiles() {
  // Keep shell env first, then prefer `.env.local` over `.env`.
  for (const envFile of [".env.local", ".env"]) {
    loadDotenv({
      path: path.join(rootDir, envFile),
      override: false,
    });
  }
}

/**
 * Splits a Cypher script into executable statements.
 *
 * @param {string} source The raw Cypher file contents.
 * @returns {string[]} Executable Cypher statements in original order.
 */
function splitCypherStatements(source) {
  const statements = [];
  let buffer = "";
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inBacktick = false;
  let inLineComment = false;
  let inBlockComment = false;

  // Only split on semicolons that are outside strings and comments.
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    const previous = source[index - 1];

    if (inLineComment) {
      if (char === "\n") {
        inLineComment = false;
        buffer += "\n";
      }

      continue;
    }

    if (inBlockComment) {
      if (char === "*" && next === "/") {
        index += 1;
        inBlockComment = false;
        buffer += " ";
      }

      continue;
    }

    if (!inSingleQuote && !inDoubleQuote && !inBacktick) {
      if (char === "/" && next === "/") {
        index += 1;
        inLineComment = true;
        continue;
      }

      if (char === "/" && next === "*") {
        index += 1;
        inBlockComment = true;
        continue;
      }
    }

    if (!inDoubleQuote && !inBacktick && char === "'" && previous !== "\\") {
      inSingleQuote = !inSingleQuote;
      buffer += char;
      continue;
    }

    if (!inSingleQuote && !inBacktick && char === '"' && previous !== "\\") {
      inDoubleQuote = !inDoubleQuote;
      buffer += char;
      continue;
    }

    if (!inSingleQuote && !inDoubleQuote && char === "`" && previous !== "\\") {
      inBacktick = !inBacktick;
      buffer += char;
      continue;
    }

    if (!inSingleQuote && !inDoubleQuote && !inBacktick && char === ";") {
      const statement = buffer.trim();

      if (statement) {
        statements.push(statement);
      }

      buffer = "";
      continue;
    }

    buffer += char;
  }

  const trailingStatement = buffer.trim();

  if (trailingStatement) {
    statements.push(trailingStatement);
  }

  return statements;
}

/**
 * Builds a short label for progress logs.
 *
 * @param {string} statement A single Cypher statement.
 * @returns {string} The first non-empty line, truncated for logging.
 */
function summarizeStatement(statement) {
  return statement
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .find(Boolean)
    ?.slice(0, 80) ?? "statement";
}

/**
 * Runs the seed command.
 *
 * @returns {Promise<void>}
 */
async function main() {
  await loadEnvFiles();

  const seedFileArg = process.argv[2];
  const seedFilePath = seedFileArg
    ? path.resolve(process.cwd(), seedFileArg)
    : defaultSeedFile;

  const uri = process.env.NEO4J_URI;
  const username = process.env.NEO4J_USERNAME;
  const password = process.env.NEO4J_PASSWORD;
  const database = process.env.NEO4J_DATABASE ?? "neo4j";

  if (!uri || !username || !password) {
    throw new Error(
      "Missing Neo4j environment variables. Set NEO4J_URI, NEO4J_USERNAME, and NEO4J_PASSWORD in your shell or .env.local."
    );
  }

  const source = await fs.readFile(seedFilePath, "utf8");
  const statements = splitCypherStatements(source);

  if (statements.length === 0) {
    throw new Error(`No Cypher statements found in ${seedFilePath}.`);
  }

  const driver = neo4j.driver(uri, neo4j.auth.basic(username, password));

  try {
    await driver.verifyConnectivity();

    // Reuse one session for the full seed run.
    const session = driver.session({ database });

    try {
      console.log(`Seeding Neo4j database "${database}" from ${seedFilePath}`);
      console.log(
        "This seed file resets the graph before recreating the project dataset."
      );

      for (const [index, statement] of statements.entries()) {
        console.log(
          `[${index + 1}/${statements.length}] ${summarizeStatement(statement)}`
        );
        await session.run(statement);
      }

      console.log("Neo4j seed completed successfully.");
    } finally {
      await session.close();
    }
  } finally {
    await driver.close();
  }
}

/**
 * Logs a concise CLI error.
 */
main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Neo4j seed failed: ${message}`);
  process.exitCode = 1;
});
