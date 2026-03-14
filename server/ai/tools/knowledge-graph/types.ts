export type ClinicalPresentationRecord = {
  key: string;
  name: string;
  normalized_name: string;
};

export type CategoryRecord = {
  clinicalPresentationKey: string;
  categoryKey: string;
  categoryName: string;
  categoryNormalizedName: string;
};

export type DiagnosisRecord = {
  clinicalPresentationKey: string;
  categoryKey: string;
  diagnosisKey: string;
  diagnosisName: string;
};