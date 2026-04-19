import { getToolName, isToolUIPart } from "ai";
import type { UIMessage } from "ai";

import type {
  CategoryMatch,
  ClinicalPresentationMatch,
  DifferentialDiagnosis,
  FeatureMatch,
} from "@/server/ai/workflows/ddx-workflow/types";
import type {
  CriticAssessment,
  GroundingAssessment,
} from "@/server/ai/workflows/safety-workflow/types";

type DdxResult = {
  differentials: DifferentialDiagnosis[];
  matchedClinicalPresentations: ClinicalPresentationMatch[];
  matchedCategories: CategoryMatch[];
  matchedFeatures: FeatureMatch[];
  criticAssessment?: CriticAssessment;
  groundingAssessment?: GroundingAssessment;
};

const EMPTY_RESULT: DdxResult = {
  differentials: [],
  matchedClinicalPresentations: [],
  matchedCategories: [],
  matchedFeatures: [],
  criticAssessment: undefined,
  groundingAssessment: undefined,
};

export function useDdxResult(messages: UIMessage[]): DdxResult {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.role !== "assistant") {
      continue;
    }

    for (const part of message.parts) {
      if (
        isToolUIPart(part) &&
        getToolName(part) === "runDifferentialDiagnosis" &&
        part.state === "output-available"
      ) {
        const output = part.output as
          | {
              differentials?: DifferentialDiagnosis[];
              matchedClinicalPresentations?: ClinicalPresentationMatch[];
              matchedCategories?: CategoryMatch[];
              matchedFeatures?: FeatureMatch[];
              criticAssessment?: CriticAssessment;
              groundingAssessment?: GroundingAssessment;
            }
          | undefined;

        return {
          differentials: output?.differentials ?? [],
          matchedClinicalPresentations:
            output?.matchedClinicalPresentations ?? [],
          matchedCategories: output?.matchedCategories ?? [],
          matchedFeatures: output?.matchedFeatures ?? [],
          criticAssessment: output?.criticAssessment,
          groundingAssessment: output?.groundingAssessment,
        };
      }
    }
  }

  return EMPTY_RESULT;
}
