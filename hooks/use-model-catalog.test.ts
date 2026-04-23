/**
 * @fileoverview Tests model catalog loading, persistence, and fallback selection behavior.
 * @contributors Johnson Zhang
 */

import { renderHook, act, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  MODEL_SELECTION_STORAGE_KEY,
  type ModelCatalog,
} from "@/lib/chat/model-catalog";
import { useModelCatalog } from "./use-model-catalog";

const getModelCatalogMock = vi.fn();
const toastErrorMock = vi.fn();
let storageState: Record<string, string> = {};

vi.mock("@/lib/chat/models", () => ({
  getModelCatalog: (...args: unknown[]) => getModelCatalogMock(...args),
}));

vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}));

const catalog: ModelCatalog = {
  selectors: [
    {
      defaultModelId: "gemini-2.5-flash",
      key: "chat",
      label: "Chat Model",
      models: [
        {
          available: true,
          group: "Google",
          id: "gemini-2.5-flash",
          label: "Gemini 2.5 Flash",
          provider: "google",
        },
        {
          available: true,
          group: "OpenAI",
          id: "gpt-5-mini",
          label: "GPT-5 mini",
          provider: "openai",
        },
      ],
      title: "Select chat model",
    },
    {
      defaultModelId: "gemini-2.5-flash",
      key: "diagnosis",
      label: "Diagnosis Model",
      models: [
        {
          available: true,
          group: "Google",
          id: "gemini-2.5-flash",
          label: "Gemini 2.5 Flash",
          provider: "google",
        },
        {
          available: false,
          group: "Anthropic",
          id: "claude-sonnet-4-5",
          label: "Claude Sonnet 4.5",
          provider: "anthropic",
        },
      ],
      title: "Select diagnosis model",
    },
  ],
};

describe("useModelCatalog", () => {
  beforeEach(() => {
    getModelCatalogMock.mockReset();
    toastErrorMock.mockReset();
    storageState = {};
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => storageState[key] ?? null,
        setItem: (key: string, value: string) => {
          storageState[key] = value;
        },
        removeItem: (key: string) => {
          delete storageState[key];
        },
      },
    });
    getModelCatalogMock.mockResolvedValue(catalog);
  });

  it("loads stored model selections and normalizes unavailable ids", async () => {
    window.localStorage.setItem(
      MODEL_SELECTION_STORAGE_KEY,
      JSON.stringify({
        chat: "gpt-5-mini",
        diagnosis: "claude-sonnet-4-5",
      }),
    );

    const { result } = renderHook(() => useModelCatalog());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.selectedModelIds).toEqual({
        chat: "gpt-5-mini",
        diagnosis: "gemini-2.5-flash",
      });
    });
  });

  it("persists model selections after they change", async () => {
    const { result } = renderHook(() => useModelCatalog());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setSelectedModel("chat", "gpt-5-mini");
    });

    expect(
      JSON.parse(
        window.localStorage.getItem(MODEL_SELECTION_STORAGE_KEY) ?? "null",
      ),
    ).toEqual({
      chat: "gpt-5-mini",
      diagnosis: "gemini-2.5-flash",
    });
  });
});
