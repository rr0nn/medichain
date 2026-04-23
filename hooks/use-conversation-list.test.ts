/**
 * @fileoverview Tests conversation list hook state, refresh, and deletion behavior.
 * @contributors Johnson Zhang
 */

import { renderHook, act, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useConversationList } from "./use-conversation-list";

const listConversationsMock = vi.fn();
const deleteConversationMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock("@/lib/conversations", () => ({
  listConversations: (...args: unknown[]) => listConversationsMock(...args),
  deleteConversation: (...args: unknown[]) => deleteConversationMock(...args),
}));

vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}));

const conversationA = {
  id: "conv-a",
  title: "Conversation A",
  createdAt: "2026-04-20T00:00:00.000Z",
  updatedAt: "2026-04-20T00:00:00.000Z",
  _count: { messages: 2 },
};

const conversationB = {
  id: "conv-b",
  title: "Conversation B",
  createdAt: "2026-04-20T00:00:00.000Z",
  updatedAt: "2026-04-20T01:00:00.000Z",
  _count: { messages: 1 },
};

describe("useConversationList", () => {
  beforeEach(() => {
    listConversationsMock.mockReset();
    deleteConversationMock.mockReset();
    toastErrorMock.mockReset();
  });

  it("loads the conversation list", async () => {
    listConversationsMock.mockResolvedValue([conversationA, conversationB]);

    const { result } = renderHook(() => useConversationList({
      activeId: null,
      onNew: vi.fn(),
      onSelect: vi.fn(),
      refreshToken: 0,
    }));

    await waitFor(() => {
      expect(listConversationsMock).toHaveBeenCalledTimes(1);
      expect(result.current.loading).toBe(false);
      expect(result.current.conversations).toEqual([conversationA, conversationB]);
    });
  });

  it("reloads when the refresh token changes", async () => {
    listConversationsMock
      .mockResolvedValueOnce([conversationA])
      .mockResolvedValueOnce([conversationA, conversationB]);

    const onNew = vi.fn();
    const onSelect = vi.fn();

    const { result, rerender } = renderHook(
      ({ refreshToken }) => useConversationList({
        activeId: null,
        onNew,
        onSelect,
        refreshToken,
      }),
      {
        initialProps: { refreshToken: 0 },
      },
    );

    await waitFor(() => {
      expect(result.current.conversations).toEqual([conversationA]);
    });

    rerender({ refreshToken: 1 });

    await waitFor(() => {
      expect(listConversationsMock).toHaveBeenCalledTimes(2);
      expect(result.current.conversations).toEqual([conversationA, conversationB]);
    });
  });

  it("shows a toast and clears the list if loading conversations fails", async () => {
    listConversationsMock.mockRejectedValue(new Error("load failed"));
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { result } = renderHook(() => useConversationList({
      activeId: null,
      onNew: vi.fn(),
      onSelect: vi.fn(),
      refreshToken: 0,
    }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.conversations).toEqual([]);
      expect(toastErrorMock).toHaveBeenCalledWith("Failed to load conversations");
    });

    consoleErrorSpy.mockRestore();
  });

  it("deletes an active conversation and selects the next remaining one", async () => {
    listConversationsMock.mockResolvedValue([conversationA, conversationB]);
    deleteConversationMock.mockResolvedValue(undefined);
    const onSelect = vi.fn();
    const onNew = vi.fn();

    const { result } = renderHook(() => useConversationList({
      activeId: "conv-a",
      onNew,
      onSelect,
      refreshToken: 0,
    }));

    await waitFor(() => {
      expect(result.current.conversations).toHaveLength(2);
    });

    await act(async () => {
      await result.current.actions.deleteConversation("conv-a");
    });

    expect(deleteConversationMock).toHaveBeenCalledWith("conv-a");
    expect(result.current.conversations).toEqual([conversationB]);
    expect(onSelect).toHaveBeenCalledWith("conv-b");
    expect(onNew).not.toHaveBeenCalled();
  });

  it("deletes the last active conversation and falls back to starting a new one", async () => {
    listConversationsMock.mockResolvedValue([conversationA]);
    deleteConversationMock.mockResolvedValue(undefined);
    const onSelect = vi.fn();
    const onNew = vi.fn();

    const { result } = renderHook(() => useConversationList({
      activeId: "conv-a",
      onNew,
      onSelect,
      refreshToken: 0,
    }));

    await waitFor(() => {
      expect(result.current.conversations).toHaveLength(1);
    });

    await act(async () => {
      await result.current.actions.deleteConversation("conv-a");
    });

    expect(result.current.conversations).toEqual([]);
    expect(onNew).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("shows a toast and keeps the list unchanged if deletion fails", async () => {
    listConversationsMock.mockResolvedValue([conversationA, conversationB]);
    deleteConversationMock.mockRejectedValue(new Error("delete failed"));
    const onSelect = vi.fn();
    const onNew = vi.fn();
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { result } = renderHook(() => useConversationList({
      activeId: "conv-a",
      onNew,
      onSelect,
      refreshToken: 0,
    }));

    await waitFor(() => {
      expect(result.current.conversations).toEqual([conversationA, conversationB]);
    });

    await act(async () => {
      await result.current.actions.deleteConversation("conv-a");
    });

    expect(result.current.conversations).toEqual([conversationA, conversationB]);
    expect(onNew).not.toHaveBeenCalled();
    expect(onSelect).not.toHaveBeenCalled();
    expect(toastErrorMock).toHaveBeenCalledWith("Failed to delete conversation");

    consoleErrorSpy.mockRestore();
  });
});
