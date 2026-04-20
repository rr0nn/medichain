/**
 * @fileoverview Shared helpers for model-provider fallback notices.
 * @contributors Johnson Zhang
 */

import type { ModelProvider } from "@/server/ai/core/models";

export type ProviderFallbackNotice = {
  requestedProvider: ModelProvider;
  resolvedProvider: ModelProvider;
  message: string;
};

export function getProviderFallbackNotice(
  requestedProvider: ModelProvider,
  resolvedProvider: ModelProvider,
): ProviderFallbackNotice {
  return {
    requestedProvider,
    resolvedProvider,
    message: `${requestedProvider} is unavailable, using default ${resolvedProvider} instead`,
  };
}
