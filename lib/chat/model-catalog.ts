/**
 * @fileoverview Shared types for the backend-driven model catalog and selector state.
 * @contributors Johnson Zhang
 */

export type ModelSelectorKey = "chat" | "diagnosis";

export type ModelProviderId = "anthropic" | "google" | "openai";

export type ModelOption = {
  available: boolean;
  group: string;
  id: string;
  label: string;
  provider: ModelProviderId;
};

export type ModelSelectorConfig = {
  defaultModelId: string;
  key: ModelSelectorKey;
  label: string;
  models: ModelOption[];
  title: string;
};

export type ModelCatalog = {
  selectors: ModelSelectorConfig[];
};

export type SelectedModelIds = Record<ModelSelectorKey, string>;

export const MODEL_SELECTION_STORAGE_KEY = "medichain:selected-model-ids";

export function getDefaultSelectedModelIds(
  catalog: ModelCatalog,
): SelectedModelIds {
  const chatSelector = catalog.selectors.find((selector) => selector.key === "chat");
  const diagnosisSelector = catalog.selectors.find(
    (selector) => selector.key === "diagnosis",
  );

  return {
    chat: chatSelector?.defaultModelId ?? "",
    diagnosis: diagnosisSelector?.defaultModelId ?? "",
  };
}

export function normalizeSelectedModelIds(
  catalog: ModelCatalog,
  selectedModelIds: SelectedModelIds,
): SelectedModelIds {
  const defaults = getDefaultSelectedModelIds(catalog);

  return {
    chat: getNormalizedSelectedModelId(
      catalog,
      "chat",
      selectedModelIds.chat,
      defaults.chat,
    ),
    diagnosis: getNormalizedSelectedModelId(
      catalog,
      "diagnosis",
      selectedModelIds.diagnosis,
      defaults.diagnosis,
    ),
  };
}

export function parseStoredSelectedModelIds(
  value: string | null,
): SelectedModelIds | null {
  if (!value) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(value);

    if (
      typeof parsedValue !== "object" ||
      parsedValue === null ||
      typeof parsedValue.chat !== "string" ||
      typeof parsedValue.diagnosis !== "string"
    ) {
      return null;
    }

    return {
      chat: parsedValue.chat,
      diagnosis: parsedValue.diagnosis,
    };
  } catch {
    return null;
  }
}

function getNormalizedSelectedModelId(
  catalog: ModelCatalog,
  selectorKey: ModelSelectorKey,
  selectedModelId: string,
  defaultModelId: string,
): string {
  const selector = catalog.selectors.find((item) => item.key === selectorKey);

  if (!selector) {
    return defaultModelId;
  }

  const isSelectedModelAvailable = selector.models.some(
    (model) => model.id === selectedModelId && model.available,
  );

  return isSelectedModelAvailable ? selectedModelId : defaultModelId;
}
