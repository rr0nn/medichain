/**
 * @fileoverview Loads the backend-driven model catalog and manages active selector state.
 * @contributors Johnson Zhang
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import {
  getDefaultSelectedModelIds,
  MODEL_SELECTION_STORAGE_KEY,
  normalizeSelectedModelIds,
  parseStoredSelectedModelIds,
  type ModelCatalog,
  type ModelSelectorKey,
  type SelectedModelIds,
} from "@/lib/chat/model-catalog";
import { getModelCatalog } from "@/lib/chat/models";

type UseModelCatalogResult = {
  catalog: ModelCatalog | null;
  loading: boolean;
  selectedModelIds: SelectedModelIds;
  setSelectedModel: (selectorKey: ModelSelectorKey, modelId: string) => void;
};

export function useModelCatalog(): UseModelCatalogResult {
  const [catalog, setCatalog] = useState<ModelCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedModelIds, setSelectedModelIds] = useState<SelectedModelIds>({
    chat: "",
    diagnosis: "",
  });

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const nextCatalog = await getModelCatalog();

        if (cancelled) {
          return;
        }

        setCatalog(nextCatalog);
        const storedSelections = parseStoredSelectedModelIds(
          window.localStorage.getItem(MODEL_SELECTION_STORAGE_KEY),
        );
        setSelectedModelIds((currentSelections) =>
          normalizeSelectedModelIds(
            nextCatalog,
            storedSelections ??
              (currentSelections.chat && currentSelections.diagnosis
                ? currentSelections
                : getDefaultSelectedModelIds(nextCatalog)),
          ),
        );
      } catch (error) {
        console.error("[models] Failed to load model catalog:", error);

        if (!cancelled) {
          toast.error("Failed to load model options");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!catalog || !selectedModelIds.chat || !selectedModelIds.diagnosis) {
      return;
    }

    window.localStorage.setItem(
      MODEL_SELECTION_STORAGE_KEY,
      JSON.stringify(selectedModelIds),
    );
  }, [catalog, selectedModelIds]);

  const setSelectedModel = useCallback(
    (selectorKey: ModelSelectorKey, modelId: string) => {
      setSelectedModelIds((currentSelections) => ({
        ...currentSelections,
        [selectorKey]: modelId,
      }));
    },
    [],
  );

  return {
    catalog,
    loading,
    selectedModelIds,
    setSelectedModel,
  };
}
