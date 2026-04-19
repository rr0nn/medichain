import { renderHook, act, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useConversationSession } from "./use-conversation-session";

const pushMock = vi.fn();
const replaceMock = vi.fn();
const sendMessageMock = vi.fn();
const setMessagesMock = vi.fn();
const createConversationMock = vi.fn();
const getConversationMessagesMock = vi.fn();

let currentSearchParams = new URLSearchParams();
let chatState: {
  messages: Array<{ id: string; role: "user" | "assistant"; parts: Array<{ type: "text"; text: string }> }>;
  status: string;
};

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    replace: replaceMock,
  }),
  useSearchParams: () => currentSearchParams,
}));

vi.mock("@ai-sdk/react", () => ({
  useChat: () => ({
    messages: chatState.messages,
    sendMessage: sendMessageMock,
    setMessages: setMessagesMock,
    status: chatState.status,
  }),
}));

vi.mock("@/lib/conversations", () => ({
  createConversation: (...args: unknown[]) => createConversationMock(...args),
  getConversationMessages: (...args: unknown[]) => getConversationMessagesMock(...args),
}));

describe("useConversationSession", () => {
  beforeEach(() => {
    currentSearchParams = new URLSearchParams();
    chatState = {
      messages: [],
      status: "ready",
    };
    pushMock.mockReset();
    replaceMock.mockReset();
    sendMessageMock.mockReset();
    setMessagesMock.mockReset();
    createConversationMock.mockReset();
    getConversationMessagesMock.mockReset();
  });

  it("loads messages for the active conversation id from the URL", async () => {
    currentSearchParams = new URLSearchParams("conversationId=conv-1");
    getConversationMessagesMock.mockResolvedValue([
      { id: "m1", role: "assistant", parts: [{ type: "text", text: "hello" }] },
    ]);

    renderHook(() => useConversationSession("gemini"));

    await waitFor(() => {
      expect(getConversationMessagesMock).toHaveBeenCalledWith("conv-1");
      expect(setMessagesMock).toHaveBeenCalledWith([
        { id: "m1", role: "assistant", parts: [{ type: "text", text: "hello" }] },
      ]);
    });
  });

  it("creates a conversation, updates the URL, then sends the pending first message", async () => {
    createConversationMock.mockResolvedValue({ id: "conv-new" });
    getConversationMessagesMock.mockResolvedValue([
      { id: "m1", role: "user", parts: [{ type: "text", text: "Initial patient summary" }] },
    ]);

    replaceMock.mockImplementation((href: string) => {
      const query = href.split("?")[1] ?? "";
      currentSearchParams = new URLSearchParams(query);
    });

    const { result, rerender } = renderHook(() => useConversationSession("gemini"));

    act(() => {
      result.current.setInput("Initial patient summary");
    });

    await act(async () => {
      await result.current.actions.submitMessage();
    });

    expect(createConversationMock).toHaveBeenCalledWith({
      title: "Initial patient summary",
    });
    expect(replaceMock).toHaveBeenCalledWith("/?conversationId=conv-new");
    expect(result.current.conversationListVersion).toBe(1);

    rerender();

    await waitFor(() => {
      expect(sendMessageMock).toHaveBeenCalledWith({
        text: "Initial patient summary",
      });
    });

    await waitFor(() => {
      expect(getConversationMessagesMock).toHaveBeenCalledWith("conv-new");
      expect(setMessagesMock).toHaveBeenCalledWith([
        { id: "m1", role: "user", parts: [{ type: "text", text: "Initial patient summary" }] },
      ]);
    });
  });

  it("sends messages directly for an existing conversation", async () => {
    currentSearchParams = new URLSearchParams("conversationId=conv-2");
    getConversationMessagesMock.mockResolvedValue([]);

    const { result } = renderHook(() => useConversationSession("gemini"));

    act(() => {
      result.current.setInput("Follow-up details");
    });

    await act(async () => {
      await result.current.actions.submitMessage();
    });

    expect(sendMessageMock).toHaveBeenCalledWith({
      text: "Follow-up details",
    });
    expect(createConversationMock).not.toHaveBeenCalled();
  });

  it("restores the draft input if conversation creation fails", async () => {
    createConversationMock.mockRejectedValue(new Error("create failed"));
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { result } = renderHook(() => useConversationSession("gemini"));

    act(() => {
      result.current.setInput("Draft message");
    });

    await act(async () => {
      await result.current.actions.submitMessage();
    });

    expect(result.current.input).toBe("Draft message");
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it("clears the transcript when a selected conversation loads no messages", async () => {
    currentSearchParams = new URLSearchParams("conversationId=conv-empty");
    getConversationMessagesMock.mockResolvedValue([]);

    renderHook(() => useConversationSession("gemini"));

    await waitFor(() => {
      expect(getConversationMessagesMock).toHaveBeenCalledWith("conv-empty");
      expect(setMessagesMock).toHaveBeenCalledWith([]);
    });
  });

  it("updates the URL for selection and reset actions", () => {
    currentSearchParams = new URLSearchParams("conversationId=old&foo=bar");

    const { result } = renderHook(() => useConversationSession("gemini"));

    act(() => {
      result.current.actions.selectConversation("conv-3");
    });

    expect(pushMock).toHaveBeenCalledWith("/?conversationId=conv-3&foo=bar");

    act(() => {
      result.current.setInput("draft");
      result.current.actions.startNewConversation();
    });

    expect(pushMock).toHaveBeenCalledWith("/?foo=bar");
    expect(result.current.input).toBe("");
  });
});
