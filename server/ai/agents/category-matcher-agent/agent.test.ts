// Tests the behaviour of mapping category records into { key, name, normalized_name }
// before sending them to generateText.

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

import { matchCategories } from "./agent";

describe("matchCategories", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("calls generateText with the selected presentation and candidate categories", async () => {
        const fakeModel = { id: "diagnosis-model" };
        const fakeOutputSchema = { kind: "object-schema" };
        const fakeResponse = {
            output: {
                matches: [
                    { key: "cat-infectious", score: 0.88, matchedText: ["fever"] },
                ],
            },
        };

        const clinicalPresentation = {
            key: "cp-fever",
            name: "Fever",
        };

        const categories = [
            {
                clinicalPresentationKey: "cp-fever",
                categoryKey: "cat-infectious",
                categoryName: "Infectious",
                categoryNormalizedName: "infectious",
            },
            {
                clinicalPresentationKey: "cp-fever",
                categoryKey: "cat-inflammatory",
                categoryName: "Inflamamtory",
                categoryNormalizedName: "inflammatory",
            },
        ];

        mocks.mockGetDefaultDiagnosisModel.mockReturnValue(fakeModel);
        mocks.mockOutputObject.mockReturnValue(fakeOutputSchema);
        mocks.mockGenerateText.mockResolvedValue(fakeResponse);

        const result = await matchCategories(
            "High fever for 2 days",
            clinicalPresentation,
            categories as never
        );

        expect(mocks.mockGenerateText).toHaveBeenCalledTimes(1);

        const call = mocks.mockGenerateText.mock.calls[0][0];

        expect(call.model).toBe(fakeModel);
        expect(call.output).toBe(fakeOutputSchema);
        expect(call.prompt).toContain("High fever for 2 days");
        expect(call.prompt).toContain('"key":"cp-fever"');
        expect(call.prompt).toContain('"name":"Fever"');
        expect(call.prompt).toContain('"key":"cat-infectious"');
        expect(call.prompt).toContain('"normalized_name":"infectious"');

        expect(result).toEqual(fakeResponse.output);
    });
});