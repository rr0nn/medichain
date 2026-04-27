/**
 * @fileoverview Centralizes the server-side model catalog, selection resolution, and language-model factories.
 * @contributors Johnson Zhang, Aryan Wadhawan
 */

import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";

import type {
  ModelCatalog,
  ModelOption,
  ModelProviderId,
  ModelSelectorConfig,
  ModelSelectorKey,
} from "@/lib/chat/model-catalog";

type EnvVarName =
  | "ANTHROPIC_API_KEY"
  | "GOOGLE_GENERATIVE_AI_API_KEY"
  | "OPENAI_API_KEY";

type RegisteredModel = {
  createLanguageModel: () =>
    | ReturnType<typeof anthropic>
    | ReturnType<typeof google>
    | ReturnType<typeof openai>;
  envVar?: EnvVarName;
  group: string;
  id: string;
  label: string;
  provider: ModelProviderId;
  selectors: readonly ModelSelectorKey[];
};

type SelectorDefinition = Omit<ModelSelectorConfig, "models">;

type ResolvedModelSelection = {
  model:
    | ReturnType<typeof anthropic>
    | ReturnType<typeof google>
    | ReturnType<typeof openai>;
  modelId: string;
  modelLabel: string;
};

/**
 * Represents a rejected model selection for either the chat or diagnosis selector.
 *
 * The app surfaces this error to the client instead of silently falling back to a
 * different model when a requested selection is missing, unsupported, or unavailable.
 */
export class ModelSelectionError extends Error {
  code: "CHAT_MODEL_UNAVAILABLE" | "DIAGNOSIS_MODEL_UNAVAILABLE";
  selectorKey: ModelSelectorKey;

  constructor(selectorKey: ModelSelectorKey) {
    const selector = SELECTOR_DEFINITIONS[selectorKey];

    super(`The selected ${selector.label.toLowerCase()} is unavailable`);
    this.name = "ModelSelectionError";
    this.code =
      selectorKey === "chat"
        ? "CHAT_MODEL_UNAVAILABLE"
        : "DIAGNOSIS_MODEL_UNAVAILABLE";
    this.selectorKey = selectorKey;
  }
}

// Keep all supported models in one registry so catalog generation and request-time
// selection always read from the same source of truth.
const REGISTERED_MODELS: readonly RegisteredModel[] = [
  {
    createLanguageModel: () => google("gemini-2.5-flash"),
    envVar: "GOOGLE_GENERATIVE_AI_API_KEY",
    group: "Google",
    id: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    provider: "google",
    selectors: ["chat", "diagnosis"],
  },
  {
    createLanguageModel: () => anthropic("claude-sonnet-4-5"),
    envVar: "ANTHROPIC_API_KEY",
    group: "Anthropic",
    id: "claude-sonnet-4-5",
    label: "Claude Sonnet 4.5",
    provider: "anthropic",
    selectors: ["chat", "diagnosis"],
  },
  {
    createLanguageModel: () => openai("gpt-5-mini"),
    envVar: "OPENAI_API_KEY",
    group: "OpenAI",
    id: "gpt-5-mini",
    label: "GPT-5 mini",
    provider: "openai",
    selectors: ["chat", "diagnosis"],
  },
] as const;

// The backend owns selector metadata so the frontend can render both dropdowns
// without hardcoding labels, titles, or default model ids.
const SELECTOR_DEFINITIONS: Record<ModelSelectorKey, SelectorDefinition> = {
  chat: {
    defaultModelId: "gemini-2.5-flash",
    key: "chat",
    label: "Chat Model",
    title: "Select chat model",
  },
  diagnosis: {
    defaultModelId: "gemini-2.5-flash",
    key: "diagnosis",
    label: "Diagnosis Model",
    title: "Select diagnosis model",
  },
};

function isModelAvailable(model: RegisteredModel): boolean {
  return model.envVar ? Boolean(process.env[model.envVar]) : true;
}

function supportsSelector(
  model: RegisteredModel,
  selectorKey: ModelSelectorKey,
): boolean {
  return model.selectors.includes(selectorKey);
}

function getRegisteredModel(modelId: string): RegisteredModel | undefined {
  return REGISTERED_MODELS.find((model) => model.id === modelId);
}

function getDefaultModelDefinition(
  selectorKey: ModelSelectorKey,
): RegisteredModel {
  const selector = SELECTOR_DEFINITIONS[selectorKey];
  const model = getRegisteredModel(selector.defaultModelId);

  if (!model) {
    throw new Error(
      `Default model "${selector.defaultModelId}" is not registered for selector "${selectorKey}"`,
    );
  }

  return model;
}

// Catalog defaults may fall back to another available model so the initial UI
// remains usable even when the preferred default cannot run locally.
function getCatalogDefaultModelDefinition(
  selectorKey: ModelSelectorKey,
): RegisteredModel {
  const defaultModel = getDefaultModelDefinition(selectorKey);

  if (
    supportsSelector(defaultModel, selectorKey) &&
    isModelAvailable(defaultModel)
  ) {
    return defaultModel;
  }

  return (
    REGISTERED_MODELS.find(
      (model) => supportsSelector(model, selectorKey) && isModelAvailable(model),
    ) ?? defaultModel
  );
}

function toModelOption(model: RegisteredModel): ModelOption {
  return {
    available: isModelAvailable(model),
    group: model.group,
    id: model.id,
    label: model.label,
    provider: model.provider,
  };
}

// Request-time selection stays strict: explicit user selections never fall back
// to another provider because the UI should surface unavailable choices clearly.
function getSelectableModelDefinition(
  selectorKey: ModelSelectorKey,
  requestedModelId?: string | null,
): RegisteredModel {
  if (requestedModelId) {
    const requestedModel = getRegisteredModel(requestedModelId);

    if (
      !requestedModel ||
      !supportsSelector(requestedModel, selectorKey) ||
      !isModelAvailable(requestedModel)
    ) {
      throw new ModelSelectionError(selectorKey);
    }

    return requestedModel;
  }

  const model = getCatalogDefaultModelDefinition(selectorKey);

  if (!isModelAvailable(model)) {
    throw new ModelSelectionError(selectorKey);
  }

  return model;
}

/**
 * Builds the backend-driven model catalog used by the chat and diagnosis selectors.
 *
 * Returns selector metadata, the effective catalog default for each selector, and
 * availability flags so the client can disable models that cannot run locally.
 */
export function getModelCatalog(): ModelCatalog {
  return {
    selectors: (Object.keys(SELECTOR_DEFINITIONS) as ModelSelectorKey[]).map(
      (selectorKey) => {
        const selector = SELECTOR_DEFINITIONS[selectorKey];

        return {
          ...selector,
          defaultModelId: getCatalogDefaultModelDefinition(selectorKey).id,
          models: REGISTERED_MODELS
            .filter((model) => supportsSelector(model, selectorKey))
            .map(toModelOption),
        };
      },
    ),
  };
}

/**
 * Resolves a selector choice into the model instance used for execution.
 *
 * Throws `ModelSelectionError` when the requested model is missing, unsupported,
 * or unavailable for the given selector.
 */
export function resolveModelSelection(
  selectorKey: ModelSelectorKey,
  requestedModelId?: string | null,
): ResolvedModelSelection {
  const resolvedModel = getSelectableModelDefinition(
    selectorKey,
    requestedModelId,
  );

  return {
    model: resolvedModel.createLanguageModel(),
    modelId: resolvedModel.id,
    modelLabel: resolvedModel.label,
  };
}

/**
 * Returns the model used for the outer chat and interview orchestration flow.
 *
 * Throws `ModelSelectionError` when the requested chat model cannot run.
 */
export function getChatModel(chatModelId?: string | null) {
  return resolveModelSelection("chat", chatModelId).model;
}

/**
 * Returns the model used for the inner diagnosis matching pipeline.
 *
 * Throws `ModelSelectionError` when the requested diagnosis model cannot run.
 */
export function getDiagnosisModel(diagnosisModelId?: string | null) {
  return resolveModelSelection("diagnosis", diagnosisModelId).model;
}
