import { verifyDiagnosisEvidencePaths } from "@/server/ai/tools/knowledge-graph/knowledge-graph";
import type { DifferentialDiagnosis } from "@/server/ai/workflows/ddx-workflow/types";

import type { GroundingAssessment } from "./types";

type GroundingReviewResult = {
  differentials: DifferentialDiagnosis[];
  assessment: GroundingAssessment;
};

function getEvidenceAuditKey(input: {
  diagnosisKey: string;
  evidenceType: "category" | "feature";
  clinicalPresentationKey: string;
  categoryKey?: string;
  featureKey?: string;
}) {
  return [
    input.diagnosisKey,
    input.evidenceType,
    input.clinicalPresentationKey,
    input.categoryKey ?? "",
    input.featureKey ?? "",
  ].join("::");
}

/**
 * Re-verifies each diagnosis evidence path directly against Neo4j and removes
 * any differential entries that cannot be traced back to a live graph path.
 */
export async function reviewDifferentialGrounding(input: {
  differentials: DifferentialDiagnosis[];
}): Promise<GroundingReviewResult> {
  const auditedPaths = await verifyDiagnosisEvidencePaths(
    input.differentials.flatMap((differential) =>
      differential.evidence.map((evidence) => ({
        evidenceType: evidence.evidenceType,
        clinicalPresentationKey: evidence.clinicalPresentationKey,
        categoryKey: evidence.categoryKey,
        featureKey: evidence.featureKey,
        diagnosisKey: differential.diagnosisKey,
      })),
    ),
  );

  const verifiedPathKeys = new Set(
    auditedPaths.map((path) => getEvidenceAuditKey(path)),
  );

  const groundedDifferentials = input.differentials
    .map((differential) => {
      const groundedEvidence = differential.evidence.filter((evidence) => {
        return verifiedPathKeys.has(
          getEvidenceAuditKey({
            diagnosisKey: differential.diagnosisKey,
            evidenceType: evidence.evidenceType,
            clinicalPresentationKey: evidence.clinicalPresentationKey,
            categoryKey: evidence.categoryKey,
            featureKey: evidence.featureKey,
          }),
        );
      });

      return {
        ...differential,
        evidence: groundedEvidence,
      };
    })
    .filter((differential) => differential.evidence.length > 0);

  const topDifferential = groundedDifferentials[0];
  const reasons: string[] = [];
  const ungroundedDifferentialCount =
    input.differentials.length - groundedDifferentials.length;

  if (groundedDifferentials.length === 0) {
    reasons.push(
      "No returned differentials remained grounded after direct knowledge graph path verification.",
    );
  }

  if (ungroundedDifferentialCount > 0) {
    reasons.push(
      `${ungroundedDifferentialCount} differential diagnosis${ungroundedDifferentialCount === 1 ? "" : "es"} failed direct knowledge graph path verification and ${ungroundedDifferentialCount === input.differentials.length ? "were" : "was"} removed.`,
    );
  }

  return {
    differentials: groundedDifferentials,
    assessment: {
      isGrounded: groundedDifferentials.length > 0,
      reasons,
      groundedDifferentialCount: groundedDifferentials.length,
      ungroundedDifferentialCount,
      topDiagnosisHasGroundedEvidence:
        topDifferential !== undefined && topDifferential.evidence.length > 0,
      topDiagnosisHasFeatureEvidence:
        topDifferential?.evidence.some(
          (evidence) => evidence.evidenceType === "feature",
        ) ?? false,
    },
  };
}
