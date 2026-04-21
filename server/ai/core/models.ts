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

// We reject unavailable selections explicitly so the UI can show a clear error.
// This is easier to explain to a client than silently swapping to a different model.
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

// Single source of truth for every model the product knows about.
// To add a new provider/model, register it here and expose the required env var.
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

// Each selector has its own label and preferred default model.
// The frontend reads this metadata from the backend rather than hardcoding it.
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

// A model is considered available only when its required API key exists.
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

// This chooses the model that should appear as the default option in the UI.
// If the preferred default is unavailable, we fall back only for the initial UI state,
// not for an explicit user selection.
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

// This is the strict selection path used when the app is about to run a request.
// If the user asked for a model that is missing, unsupported, or unavailable,
// we throw a typed error instead of silently switching providers.
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

// The frontend calls this route-backed catalog to build both dropdowns.
// Each option includes availability so the UI can disable models that cannot run.
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

// Converts a selected model id into a live AI SDK model instance for execution.
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

// Chat model = outer interview orchestration.
export function getChatModel(chatModelId?: string | null) {
  return resolveModelSelection("chat", chatModelId).model;
}

// Diagnosis model = inner matching workflow used after the tool is invoked.
export function getDiagnosisModel(diagnosisModelId?: string | null) {
  return resolveModelSelection("diagnosis", diagnosisModelId).model;
}
