/**
 * @fileoverview Tests model catalog metadata and strict model selection behavior.
 * @contributors Johnson Zhang
 */

import { afterEach, describe, expect, it } from "vitest";

import {
  getModelCatalog,
  ModelSelectionError,
  resolveModelSelection,
} from "./models";

const ORIGINAL_ENV = {
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
};

describe("model registry", () => {
  afterEach(() => {
    process.env.ANTHROPIC_API_KEY = ORIGINAL_ENV.ANTHROPIC_API_KEY;
    process.env.GOOGLE_GENERATIVE_AI_API_KEY =
      ORIGINAL_ENV.GOOGLE_GENERATIVE_AI_API_KEY;
    process.env.OPENAI_API_KEY = ORIGINAL_ENV.OPENAI_API_KEY;
  });

  it("returns selector metadata from the backend model catalog", () => {
    const catalog = getModelCatalog();

    expect(catalog.selectors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "chat",
          label: "Chat Model",
        }),
        expect.objectContaining({
          key: "diagnosis",
          label: "Diagnosis Model",
        }),
      ]),
    );
  });

  it("resolves a requested available model id", () => {
    process.env.OPENAI_API_KEY = "test-key";

    const selection = resolveModelSelection("chat", "gpt-5-mini");

    expect(selection.modelId).toBe("gpt-5-mini");
    expect(selection.modelLabel).toBe("GPT-5 mini");
  });

  it("marks unavailable models in the backend model catalog", () => {
    process.env.ANTHROPIC_API_KEY = "";

    const catalog = getModelCatalog();

    expect(
      catalog.selectors
        .flatMap((selector) => selector.models)
        .find((model) => model.id === "claude-sonnet-4-5"),
    ).toEqual(
      expect.objectContaining({
        available: false,
        id: "claude-sonnet-4-5",
      }),
    );
  });

  it("uses the first available model as the selector default when the configured default is unavailable", () => {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = "";
    process.env.ANTHROPIC_API_KEY = "";
    process.env.OPENAI_API_KEY = "test-key";

    const catalog = getModelCatalog();

    expect(
      catalog.selectors.find((selector) => selector.key === "chat")
        ?.defaultModelId,
    ).toBe("gpt-5-mini");
  });

  it("throws a model-selection error when the requested model is unavailable", () => {
    process.env.ANTHROPIC_API_KEY = "";

    expect(() =>
      resolveModelSelection("diagnosis", "claude-sonnet-4-5"),
    ).toThrowError(ModelSelectionError);
  });

  it("throws a model-selection error when a stale model id is requested", () => {
    expect(() =>
      resolveModelSelection("chat", "missing-model-id"),
    ).toThrowError(ModelSelectionError);
  });

  it("throws a model-selection error when no selectable default is available", () => {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = "";
    process.env.ANTHROPIC_API_KEY = "";
    process.env.OPENAI_API_KEY = "";

    expect(() => resolveModelSelection("chat")).toThrowError(
      ModelSelectionError,
    );
  });
});
