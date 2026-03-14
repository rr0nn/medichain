export type ClinicalPresentationMatch = {
  key: string;
  score: number;
  matchedText: string[];
};

export type CategoryMatch = {
  clinicalPresentationKey: string;
  categoryKey: string;
  score: number;
  matchedText: string[];
};

export type DifferentialDiagnosisPath = {
  clinicalPresentationKey: string;
  categoryKey: string;
};

export type DifferentialDiagnosis = {
  diagnosisKey: string;
  diagnosisName: string;
  score: number;
  paths: DifferentialDiagnosisPath[];
};

export type DifferentialDiagnosisWorkflowResult = {
  matchedClinicalPresentations: ClinicalPresentationMatch[];
  matchedCategories: CategoryMatch[];
  differentials: DifferentialDiagnosis[];
};
