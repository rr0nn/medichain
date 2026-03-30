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

export type FeatureRecord = {
  clinicalPresentationKey: string;
  featureKey: string;
  featureName: string;
  featureNormalizedName: string;
};

export type DiagnosisRecord = {
  evidenceType: "category" | "feature";
  clinicalPresentationKey: string;
  categoryKey?: string;
  featureKey?: string;
  diagnosisKey: string;
  diagnosisName: string;
};
