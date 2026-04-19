import { renderHook, act, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useConversationList } from "./use-conversation-list";

const listConversationsMock = vi.fn();
const deleteConversationMock = vi.fn();

vi.mock("@/lib/conversations", () => ({
  listConversations: (...args: unknown[]) => listConversationsMock(...args),
  deleteConversation: (...args: unknown[]) => deleteConversationMock(...args),
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
});
