import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  mockGenerateText: vi.fn(),
  mockGetDefaultDiagnosisModel: vi.fn(),
  mockOutputObject: vi.fn(),
}));

vi.mock("ai", () => ({
  generateText: mocks.mockGenerateText,
  Output: {
    object: mocks.mockOutputObject,
  },
}));

vi.mock("@/server/ai/core/models", () => ({
  getDefaultDiagnosisModel: mocks.mockGetDefaultDiagnosisModel,
}));

import { matchFeatures } from "./agent";

describe("matchFeatures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls generateText with the selected presentation and candidate features", async () => {
    const fakeModel = { id: "diagnosis-model" };
    const fakeOutputSchema = { kind: "object-schema" };
    const fakeResponse = {
      output: {
        matches: [
          {
            key: "feature-rlq-tenderness",
            score: 0.91,
            matchedText: ["right lower quadrant tenderness"],
          },
        ],
      },
    };

    const clinicalPresentation = {
      key: "cp-abdominal-pain",
      name: "Abdominal pain",
    };

    const features = [
      {
        clinicalPresentationKey: "cp-abdominal-pain",
        featureKey: "feature-rlq-tenderness",
        featureName: "Right lower quadrant tenderness",
        featureNormalizedName: "right lower quadrant tenderness",
        featureType: "site",
      },
      {
        clinicalPresentationKey: "cp-abdominal-pain",
        featureKey: "feature-guarding",
        featureName: "Guarding",
        featureNormalizedName: "guarding",
        featureType: "associated_factor",
      },
    ];

    mocks.mockGetDefaultDiagnosisModel.mockReturnValue(fakeModel);
    mocks.mockOutputObject.mockReturnValue(fakeOutputSchema);
    mocks.mockGenerateText.mockResolvedValue(fakeResponse);

    const result = await matchFeatures(
      "Abdominal pain with right lower quadrant tenderness",
      clinicalPresentation,
      features as never
    );

    expect(mocks.mockGenerateText).toHaveBeenCalledTimes(1);

    const call = mocks.mockGenerateText.mock.calls[0][0];

    expect(call.model).toBe(fakeModel);
    expect(call.output).toBe(fakeOutputSchema);
    expect(call.prompt).toContain(
      "Abdominal pain with right lower quadrant tenderness"
    );
    expect(call.prompt).toContain('"key":"cp-abdominal-pain"');
    expect(call.prompt).toContain('"name":"Abdominal pain"');
    expect(call.prompt).toContain('"key":"feature-rlq-tenderness"');
    expect(call.prompt).toContain(
      '"normalized_name":"right lower quadrant tenderness"'
    );
    expect(call.prompt).toContain('"feature_type":"site"');
    expect(call.prompt).toContain("history, past_history, pain");

    expect(result).toEqual(fakeResponse.output);
  });
});
