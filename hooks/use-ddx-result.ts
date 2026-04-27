/**
 * @fileoverview Extracts the latest differential diagnosis result from the transcript.
 * @contributors Johnson Zhang, Aleisha Ly, Alyssa Ooi, Aryan Wadhawan
 */

import type { UIMessage } from "ai";

import { getLatestToolOutput } from "@/lib/chat/transcript";
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

/**
 * Extracts the latest available differential diagnosis tool output from the transcript.
 *
 * Returns a stable empty result when no completed differential output is present.
 */
export function useDdxResult(messages: UIMessage[]): DdxResult {
  const output = getLatestToolOutput<{
    differentials?: DifferentialDiagnosis[];
    matchedClinicalPresentations?: ClinicalPresentationMatch[];
    matchedCategories?: CategoryMatch[];
    matchedFeatures?: FeatureMatch[];
    criticAssessment?: CriticAssessment;
    groundingAssessment?: GroundingAssessment;
  }>(messages, "runDifferentialDiagnosis");

  if (output) {
    return {
      differentials: output.differentials ?? [],
      matchedClinicalPresentations:
        output.matchedClinicalPresentations ?? [],
      matchedCategories: output.matchedCategories ?? [],
      matchedFeatures: output.matchedFeatures ?? [],
      criticAssessment: output.criticAssessment,
      groundingAssessment: output.groundingAssessment,
    };
  }

  return EMPTY_RESULT;
}
