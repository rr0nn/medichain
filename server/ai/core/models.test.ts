import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  mockGoogle: vi.fn(),
  mockAnthropic: vi.fn(),
}));

vi.mock("@ai-sdk/google", () => ({
  google: mocks.mockGoogle,
}));

vi.mock("@ai-sdk/anthropic", () => ({
  anthropic: mocks.mockAnthropic,
}));

import { getChatModel, getDiagnosisModel } from "./models";

describe("getChatModel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockGoogle.mockReturnValue({ id: "gemini-model" });
    mocks.mockAnthropic.mockReturnValue({ id: "claude-model" });
  });

  it("returns the Gemini model by default", () => {
    getChatModel();

    expect(mocks.mockGoogle).toHaveBeenCalledWith("gemini-2.5-flash");
    expect(mocks.mockAnthropic).not.toHaveBeenCalled();
  });

  it("returns the Gemini model when provider is 'gemini'", () => {
    const model = getChatModel("gemini");

    expect(mocks.mockGoogle).toHaveBeenCalledWith("gemini-2.5-flash");
    expect(model).toEqual({ id: "gemini-model" });
  });

  it("returns the Claude model when provider is 'claude'", () => {
    const model = getChatModel("claude");

    expect(mocks.mockAnthropic).toHaveBeenCalledWith("claude-sonnet-4-20250514");
    expect(model).toEqual({ id: "claude-model" });
    expect(mocks.mockGoogle).not.toHaveBeenCalled();
  });
});

describe("getDiagnosisModel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockGoogle.mockReturnValue({ id: "gemini-model" });
    mocks.mockAnthropic.mockReturnValue({ id: "claude-model" });
  });

  it("returns the Gemini model by default", () => {
    getDiagnosisModel();

    expect(mocks.mockGoogle).toHaveBeenCalledWith("gemini-2.5-flash");
    expect(mocks.mockAnthropic).not.toHaveBeenCalled();
  });

  it("returns the Claude model when provider is 'claude'", () => {
    const model = getDiagnosisModel("claude");

    expect(mocks.mockAnthropic).toHaveBeenCalledWith("claude-sonnet-4-20250514");
    expect(model).toEqual({ id: "claude-model" });
  });
});
