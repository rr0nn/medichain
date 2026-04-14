/**
 * @fileoverview Tests how the clinical presentation matcher scores known presentations.
 * @contributors John Kollannur
 */

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

import { matchClinicalPresentations } from "./agent";

describe("matchClinicalPresentations", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("calls generateText with the default diagnosis model and candidate prompt", async () => {
        const fakeModel = { id: "diagnosis-model" };
        const fakeOutputSchema = { kind: "object-schema" };
        const fakeResponse = {
            output: {
                matches: [
                    { key: "cp-fever", score: 0.9, matchedText: ["fever"] },
                    { key: "cp-cough", score: 0.7, matchedText: ["cough"] },
                ],
            },
        };

        const candidates = [
            { key: "cp-fever", name: "Fever" },
            { key: "cp-cough", name: "Cough" },
        ];

        mocks.mockGetDefaultDiagnosisModel.mockReturnValue(fakeModel);
        mocks.mockOutputObject.mockReturnValue(fakeOutputSchema);
        mocks.mockGenerateText.mockResolvedValue(fakeResponse);

        const result = await matchClinicalPresentations(
            "Patient has fever and cough",
            candidates as never
        );

        expect(mocks.mockGetDefaultDiagnosisModel).toHaveBeenCalledTimes(1);
        expect(mocks.mockOutputObject).toHaveBeenCalledTimes(1);
        expect(mocks.mockGenerateText).toHaveBeenCalledTimes(1);

        const call = mocks.mockGenerateText.mock.calls[0][0];

        expect(call.model).toBe(fakeModel);
        expect(call.output).toBe(fakeOutputSchema);
        expect(call.prompt).toContain("Patient has fever and cough");
        expect(call.prompt).toContain("Candidate clinical presentations");
        expect(call.prompt).toContain('"key":"cp-fever"');
        expect(call.prompt).toContain('"key":"cp-cough"');

        expect(result).toEqual(fakeResponse.output);
    });
});
