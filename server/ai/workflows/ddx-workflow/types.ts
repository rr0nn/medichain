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

export type DifferentialDiagnosisEvidenceRef = {
  clinicalPresentationKey: string;
  categoryKey: string;
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
  differentials: DifferentialDiagnosis[];
};
