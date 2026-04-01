export type ClinicalPresentationMatch = {
  key: string;
  name: string;
  score: number;
  matchedText: string[];
};

export type WorkflowStepName =
  | "match_presentations"
  | "match_categories"
  | "match_features"
  | "fetch_diagnoses"
  | "group_diagnoses"
  | "critic_review"
  | "build_follow_up_questions";

export type WorkflowStepEvent = {
  type: "step";
  step: WorkflowStepName;
  status: "running" | "complete";
};

export type CategoryMatch = {
  clinicalPresentationKey: string;
  categoryKey: string;
  categoryName: string;
  score: number;
  matchedText: string[];
};

export type FeatureMatch = {
  clinicalPresentationKey: string;
  featureKey: string;
  featureName: string;
  featureType?: string;
  score: number;
  matchedText: string[];
};

export type DifferentialDiagnosisEvidenceRef = {
  evidenceType: "category" | "feature";
  clinicalPresentationKey: string;
  categoryKey?: string;
  featureKey?: string;
};

export type DifferentialDiagnosis = {
  diagnosisKey: string;
  diagnosisName: string;
  score: number;
  evidence: DifferentialDiagnosisEvidenceRef[];
};

export type DifferentialDiagnosisWorkflowResult = {
  matchedClinicalPresentations: ClinicalPresentationMatch[];
  matchedCategories: CategoryMatch[];
  matchedFeatures: FeatureMatch[];
  differentials: DifferentialDiagnosis[];
};
