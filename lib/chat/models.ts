/**
 * @fileoverview Client helpers for loading the backend-driven model catalog.
 * @contributors Johnson Zhang
 */

import type { ModelCatalog } from "./model-catalog";

async function readJson<T>(response: Response, fallbackMessage: string): Promise<T> {
  if (!response.ok) {
    throw new Error(fallbackMessage);
  }

  return response.json() as Promise<T>;
}

export async function getModelCatalog(): Promise<ModelCatalog> {
  const response = await fetch("/api/models", { cache: "no-store" });
  return readJson<ModelCatalog>(response, "Failed to load model options");
}
