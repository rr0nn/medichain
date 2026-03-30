export type ClinicalPresentationMatch = {
  key: string;
  name: string;
  score: number;
  matchedText: string[];
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
