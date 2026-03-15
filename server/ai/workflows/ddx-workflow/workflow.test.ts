// This test covers:
//  - 0.6 presentation threshold
//  - 0.55 category threshold
//  - top-3 presentation slicing
//  - early returns
//  - final grouping and ranking of diagnoses

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    mockMatchClinicalPresentations: vi.fn(),
    mockMatchCategories: vi.fn(),
    mockGetClinicalPresentations: vi.fn(),
    mockGetCategoriesForClinicalPresentations: vi.fn(),
    mockGetDiagnosesForPairs: vi.fn()
}));

vi.mock("@/server/ai/agents/clinical-presentation-matcher-agent/agent", () => ({
    matchClinicalPresentations: mocks.mockMatchClinicalPresentations,
}));

vi.mock("@/server/ai/agents/category-matcher-agent/agent", () => ({
    matchCategories: mocks.mockMatchCategories,
}));

vi.mock("@/server/ai/tools/knowledge-graph/knowledge-graph", () => ({
    getClinicalPresentations: mocks.mockGetClinicalPresentations,
    getCategoriesForClinicalPresentations: mocks.mockGetCategoriesForClinicalPresentations,
    getDiagnosesForPairs: mocks.mockGetDiagnosesForPairs,
}));

import { runDifferentialDiagnosisWorkflow  } from "./workflow";

describe("runDifferentialDiagnosisWorkflow", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns empty results when no clinical presentations meet threshold", async () => {
        mocks.mockGetClinicalPresentations.mockResolvedValue([
            { key: "cp-fever", name: "Fever" },
        ]);

        mocks.mockMatchClinicalPresentations.mockResolvedValue({
            matches: [
                { key: "cp-fever", score: 0.59, matchedText: ["fever"] },
            ],
        });

        const result = await runDifferentialDiagnosisWorkflow("fever");

        expect(result).toEqual({
            matchedClinicalPresentations: [],
            matchedCategories: [],
            differentials: [],
        });

        expect(mocks.mockGetCategoriesForClinicalPresentations).not.toHaveBeenCalled();
        expect(mocks.mockGetDiagnosesForPairs).not.toHaveBeenCalled();
    });

    it("returns matched presentations but no differentials when no categories meet threshold", async () => {
        mocks.mockGetClinicalPresentations.mockResolvedValue([
            { key: "cp-fever", name: "Fever" },
        ]);

        mocks.mockMatchClinicalPresentations.mockResolvedValue({
            matches: [
                { key: "cp-fever", score: 0.9, matchedText: ["fever"] },
            ],
        });

        mocks.mockGetCategoriesForClinicalPresentations.mockResolvedValue([
            {
                clinicalPresentationKey: "cp-fever",
                categoryKey: "cat-infectious",
                categoryName: "Infectious",
                categoryNormalizedName: "infectious",
            },
        ]);

        mocks.mockMatchCategories.mockResolvedValue({
            matches: [
                { key: "cat-infectious", score: 0.54, matchedText: ["fever"] },
            ],
        });

        const result = await runDifferentialDiagnosisWorkflow("fever");

        expect(result).toEqual({
            matchedClinicalPresentations: [
                { key: "cp-fever", score: 0.9, matchedText: ["fever"] },
            ],
            matchedCategories: [],
            differentials: [],
        });

        expect(mocks.mockGetDiagnosesForPairs).not.toHaveBeenCalled();
    });

    it("returns grouped and ranked differentials for successful matches", async () => {
        mocks.mockGetClinicalPresentations.mockResolvedValue([
            { key: "cp-fever", name: "Fever" },
            { key: "cp-cough", name: "Cough" },
        ]);

        mocks.mockMatchClinicalPresentations.mockResolvedValue({
            matches: [
                { key: "cp-fever", score: 0.9, matchedText: ["fever"] },
                { key: "cp-cough", score: 0.7, matchedText: ["cough"] },
                { key: "cp-other", score: 0.4, matchedText: ["other"] },
            ],
        });

        mocks.mockGetCategoriesForClinicalPresentations.mockResolvedValue([
            {
                clinicalPresentationKey: "cp-fever",
                categoryKey: "cat-infectious",
                categoryName: "Infectious",
                categoryNormalizedName: "infectious",
            },
            {
                clinicalPresentationKey: "cp-cough",
                categoryKey: "cat-inflammatory",
                categoryName: "Inflammatory",
                categoryNormalizedName: "inflammatory",
            },
        ]);

        mocks.mockMatchCategories
            .mockResolvedValueOnce({
                matches: [
                    { key: "cat-infectious", score: 0.8, matchedText: ["high fever"] },
                ],
            })
            .mockResolvedValueOnce({
                matches: [
                    { key: "cat-inflammatory", score: 0.6, matchedText: ["dry cough"] },
                ],
            });
        
        mocks.mockGetDiagnosesForPairs.mockResolvedValue([
            {
                diagnosisKey: "dx-flu",
                diagnosisName: "Influenza",
                clinicalPresentationKey: "cp-fever",
                categoryKey: "cat-infectious",
            },
            {
                diagnosisKey: "dx-flu",
                diagnosisName: "Influenza",
                clinicalPresentationKey: "cp-fever",
                categoryKey: "cat-infectious",
            },
            {
                diagnosisKey: "dx-viral",
                diagnosisName: "Viral syndrome",
                clinicalPresentationKey: "cp-cough",
                categoryKey: "cat-inflammatory",
            },
        ]);

        const result = await runDifferentialDiagnosisWorkflow(
            "fever and cough for two days"
        );

        expect(mocks.mockGetCategoriesForClinicalPresentations).toHaveBeenCalledWith([
            "cp-fever",
            "cp-cough",
        ]);

        expect(mocks.mockGetDiagnosesForPairs).toHaveBeenCalledWith([
            {
                clinicalPresentationKey: "cp-fever",
                categoryKey: "cat-infectious",
            },
            {
                clinicalPresentationKey: "cp-cough",
                categoryKey: "cat-inflammatory",
            },
        ]);

        expect(result.matchedCategories).toEqual([
            {
                clinicalPresentationKey: "cp-fever",
                categoryKey: "cat-infectious",
                score: 0.8,
                matchedText: ["high fever"],
            },
            {
                clinicalPresentationKey: "cp-cough",
                categoryKey: "cat-inflammatory",
                score: 0.6,
                matchedText: ["dry cough"],
            },
        ]);

        expect(result.differentials).toEqual([
            {
                diagnosisKey: "dx-flu",
                diagnosisName: "Influenza",
                score: expect.any(Number),
                paths: [
                    {
                        clinicalPresentationKey: "cp-fever",
                        categoryKey: "cat-infectious",
                    },
                ],
            },
            {
                diagnosisKey: "dx-viral",
                diagnosisName: "Viral syndrome",
                score: expect.any(Number),
                paths: [
                    {
                        clinicalPresentationKey: "cp-cough",
                        categoryKey: "cat-inflammatory",
                    },
                ],
            },
        ]);

        expect(result.differentials[0].score).toBeCloseTo(0.85);
        expect(result.differentials[1].score).toBeCloseTo(0.65);
    });

    it("keeps only the top 3 clinical presentations with score >= 0.6", async () => {
        mocks.mockGetClinicalPresentations.mockResolvedValue([
            { key: "cp1", name: "CP1" },
            { key: "cp2", name: "CP2" },
            { key: "cp3", name: "CP3" },
            { key: "cp4", name: "CP4" },
        ]);

        mocks.mockMatchClinicalPresentations.mockResolvedValue({
            matches: [
                { key: "cp1", score: 0.95, matchedText: [] },
                { key: "cp2", score: 0.85, matchedText: [] },
                { key: "cp3", score: 0.75, matchedText: [] },
                { key: "cp4", score: 0.65, matchedText: [] },
            ],
        });

        mocks.mockGetCategoriesForClinicalPresentations.mockResolvedValue([]);
        mocks.mockMatchCategories.mockResolvedValue({ matches: [] });

        const result = await runDifferentialDiagnosisWorkflow("test");

        expect(result.matchedClinicalPresentations).toEqual([
            { key: "cp1", score: 0.95, matchedText: [] },
            { key: "cp2", score: 0.85, matchedText: [] },
            { key: "cp3", score: 0.75, matchedText: [] },
        ]);

        expect(mocks.mockGetCategoriesForClinicalPresentations).toHaveBeenCalledWith([
            "cp1",
            "cp2",
            "cp3",
        ]);
    });
});