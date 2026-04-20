import { renderHook, act, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createChatErrorPayload,
  serializeChatErrorPayload,
} from "@/lib/chat/error-payload";
import type { SelectedModelIds } from "@/lib/chat/model-catalog";
import { useConversationSession } from "./use-conversation-session";

const pushMock = vi.fn();
const replaceMock = vi.fn();
const sendMessageMock = vi.fn();
const setMessagesMock = vi.fn();
const createConversationMock = vi.fn();
const getConversationMessagesMock = vi.fn();
const toastErrorMock = vi.fn();
const useChatMock = vi.fn();

let currentSearchParams = new URLSearchParams();
let chatState: {
  messages: Array<{
    id: string;
    role: "user" | "assistant";
    parts: Array<{ type: "text"; text: string }>;
  }>;
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
  useChat: (...args: unknown[]) => useChatMock(...args),
}));

vi.mock("@/lib/conversations", () => ({
  createConversation: (...args: unknown[]) => createConversationMock(...args),
  getConversationMessages: (...args: unknown[]) =>
    getConversationMessagesMock(...args),
}));

vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
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
    toastErrorMock.mockReset();
    useChatMock.mockReset();
    useChatMock.mockImplementation(() => ({
      messages: chatState.messages,
      sendMessage: sendMessageMock,
      setMessages: setMessagesMock,
      status: chatState.status,
    }));
  });

  function renderSession(
    selectedModelIds: SelectedModelIds = {
      chat: "gemini-2.5-flash",
      diagnosis: "gemini-2.5-flash",
    },
  ) {
    return renderHook(() => useConversationSession(selectedModelIds));
  }

  it("loads messages for the active conversation id from the URL", async () => {
    currentSearchParams = new URLSearchParams("conversationId=conv-1");
    getConversationMessagesMock.mockResolvedValue([
      { id: "m1", role: "assistant", parts: [{ type: "text", text: "hello" }] },
    ]);

    renderSession();

    await waitFor(() => {
      expect(getConversationMessagesMock).toHaveBeenCalledWith("conv-1");
      expect(setMessagesMock).toHaveBeenCalledWith([
        {
          id: "m1",
          role: "assistant",
          parts: [{ type: "text", text: "hello" }],
        },
      ]);
    });
  });

  it("creates a conversation, updates the URL, then sends the pending first message", async () => {
    createConversationMock.mockResolvedValue({ id: "conv-new" });
    getConversationMessagesMock.mockResolvedValue([
      {
        id: "m1",
        role: "user",
        parts: [{ type: "text", text: "Initial patient summary" }],
      },
    ]);

    replaceMock.mockImplementation((href: string) => {
      const query = href.split("?")[1] ?? "";
      currentSearchParams = new URLSearchParams(query);
    });

    const { result, rerender } = renderSession();

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
        {
          id: "m1",
          role: "user",
          parts: [{ type: "text", text: "Initial patient summary" }],
        },
      ]);
    });
  });

  it("sends messages directly for an existing conversation", async () => {
    currentSearchParams = new URLSearchParams("conversationId=conv-2");
    getConversationMessagesMock.mockResolvedValue([]);

    const { result } = renderSession();

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
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const { result } = renderSession();

    act(() => {
      result.current.setInput("Draft message");
    });

    await act(async () => {
      await result.current.actions.submitMessage();
    });

    expect(result.current.input).toBe("Draft message");
    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(toastErrorMock).toHaveBeenCalledWith(
      "Failed to create conversation",
    );

    consoleErrorSpy.mockRestore();
  });

  it("shows a toast and clears stale messages if loading a conversation fails", async () => {
    currentSearchParams = new URLSearchParams("conversationId=conv-err");
    getConversationMessagesMock.mockRejectedValue(new Error("load failed"));
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    renderSession();

    await waitFor(() => {
      expect(getConversationMessagesMock).toHaveBeenCalledWith("conv-err");
      expect(setMessagesMock).toHaveBeenCalledWith([]);
      expect(toastErrorMock).toHaveBeenCalledWith(
        "Failed to load conversation history",
      );
    });

    consoleErrorSpy.mockRestore();
  });

  it("restores the input and shows a toast if sending a message fails", async () => {
    currentSearchParams = new URLSearchParams("conversationId=conv-2");
    getConversationMessagesMock.mockResolvedValue([]);
    sendMessageMock.mockRejectedValue(new Error("send failed"));
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const { result } = renderSession();

    act(() => {
      result.current.setInput("Follow-up details");
    });

    await act(async () => {
      await result.current.actions.submitMessage();
    });

    expect(sendMessageMock).toHaveBeenCalledWith({
      text: "Follow-up details",
    });
    expect(result.current.input).toBe("Follow-up details");
    expect(toastErrorMock).toHaveBeenCalledWith("Failed to send message");

    consoleErrorSpy.mockRestore();
  });

  it("clears the transcript when a selected conversation loads no messages", async () => {
    currentSearchParams = new URLSearchParams("conversationId=conv-empty");
    getConversationMessagesMock.mockResolvedValue([]);

    renderSession();

    await waitFor(() => {
      expect(getConversationMessagesMock).toHaveBeenCalledWith("conv-empty");
      expect(setMessagesMock).toHaveBeenCalledWith([]);
    });
  });

  it("updates the URL for selection and reset actions", () => {
    currentSearchParams = new URLSearchParams("conversationId=old&foo=bar");

    const { result } = renderSession();

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

  it("shows an LLM-specific toast for classified chat-stream errors", () => {
    renderSession();

    const options = useChatMock.mock.calls[0][0] as {
      onError?: (error: Error) => void;
    };

    options.onError?.(
      new Error(
        serializeChatErrorPayload(createChatErrorPayload("LLM_UNAVAILABLE")),
      ),
    );

    expect(toastErrorMock).toHaveBeenCalledWith(
      "The AI service is currently unavailable",
    );
  });

  it("shows a rate-limit toast for classified chat-stream errors", () => {
    renderSession();

    const options = useChatMock.mock.calls[0][0] as {
      onError?: (error: Error) => void;
    };

    options.onError?.(
      new Error(
        serializeChatErrorPayload(createChatErrorPayload("LLM_RATE_LIMITED")),
      ),
    );

    expect(toastErrorMock).toHaveBeenCalledWith(
      "AI usage limit reached. Please try again later",
    );
  });

  it("shows a toast when the selected chat model is unavailable", () => {
    renderSession({
      chat: "claude-sonnet-4-5",
      diagnosis: "gemini-2.5-flash",
    });

    const options = useChatMock.mock.calls[0][0] as {
      onError?: (error: Error) => void;
    };

    options.onError?.(
      new Error(
        serializeChatErrorPayload(
          createChatErrorPayload("CHAT_MODEL_UNAVAILABLE"),
        ),
      ),
    );

    expect(toastErrorMock).toHaveBeenCalledWith(
      "The selected chat model is unavailable",
    );
  });

  it("shows a toast when the selected diagnosis model is unavailable", () => {
    renderSession({
      chat: "gemini-2.5-flash",
      diagnosis: "claude-sonnet-4-5",
    });

    const options = useChatMock.mock.calls[0][0] as {
      onError?: (error: Error) => void;
      transport?: {
        prepareSendMessagesRequest?: (input: {
          body: Record<string, unknown>;
          id: string;
          messages: unknown[];
        }) => { api: string; body: Record<string, unknown> };
      };
    };

    options.onError?.(
      new Error(
        serializeChatErrorPayload(
          createChatErrorPayload("DIAGNOSIS_MODEL_UNAVAILABLE"),
        ),
      ),
    );

    expect(toastErrorMock).toHaveBeenCalledWith(
      "The selected diagnosis model is unavailable",
    );

    const request = options.transport?.prepareSendMessagesRequest?.({
      id: "conv-1",
      messages: [],
      body: {},
    });

    expect(request?.body).toMatchObject({
      chatModelId: "gemini-2.5-flash",
      diagnosisModelId: "claude-sonnet-4-5",
    });
  });
});
