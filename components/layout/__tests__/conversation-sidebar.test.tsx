/**
 * @fileoverview Tests consultation sidebar rendering and interaction behavior.
 * @contributors Johnson Zhang
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const useConversationListMock = vi.fn();

vi.mock("@/hooks/use-conversation-list", () => ({
  useConversationList: (...args: unknown[]) => useConversationListMock(...args),
}));

import { ConversationSidebar } from "../conversation-sidebar";

describe("ConversationSidebar", () => {
  it("renders the loading state", () => {
    useConversationListMock.mockReturnValue({
      collapsed: false,
      conversations: [],
      loading: true,
      actions: {
        deleteConversation: vi.fn(),
        toggleCollapsed: vi.fn(),
      },
    });

    render(
      <ConversationSidebar
        activeId={null}
        onSelect={vi.fn()}
        onNew={vi.fn()}
      />,
    );

    expect(screen.getByTitle("New consultation")).toBeInTheDocument();
    expect(document.querySelectorAll(".animate-pulse")).toHaveLength(3);
  });

  it("renders the empty state and triggers the new conversation action", async () => {
    const user = userEvent.setup();
    const onNew = vi.fn();

    useConversationListMock.mockReturnValue({
      collapsed: false,
      conversations: [],
      loading: false,
      actions: {
        deleteConversation: vi.fn(),
        toggleCollapsed: vi.fn(),
      },
    });

    render(
      <ConversationSidebar
        activeId={null}
        onSelect={vi.fn()}
        onNew={onNew}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Start one" }));

    expect(screen.getByText("No consultations yet")).toBeInTheDocument();
    expect(onNew).toHaveBeenCalledTimes(1);
  });

  it("renders the conversation list and wires select, delete, and collapse actions", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const deleteConversation = vi.fn();
    const toggleCollapsed = vi.fn();

    useConversationListMock.mockReturnValue({
      collapsed: false,
      conversations: [
        {
          id: "conv-1",
          title: "Appendicitis workup",
          createdAt: "2026-04-20T00:00:00.000Z",
          updatedAt: "2026-04-20T00:00:00.000Z",
          _count: { messages: 2 },
        },
      ],
      loading: false,
      actions: {
        deleteConversation,
        toggleCollapsed,
      },
    });

    render(
      <ConversationSidebar
        activeId="conv-1"
        onSelect={onSelect}
        onNew={vi.fn()}
      />,
    );

    await user.click(screen.getByText("Appendicitis workup"));
    await user.click(screen.getByTitle("Delete consultation"));
    await user.click(screen.getByTitle("Collapse sidebar"));

    expect(onSelect).toHaveBeenCalledWith("conv-1");
    expect(deleteConversation).toHaveBeenCalledWith("conv-1");
    expect(toggleCollapsed).toHaveBeenCalledTimes(1);
  });

  it("disables consultation switching while selection is blocked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onNew = vi.fn();

    useConversationListMock.mockReturnValue({
      collapsed: false,
      conversations: [
        {
          id: "conv-1",
          title: "Appendicitis workup",
          createdAt: "2026-04-20T00:00:00.000Z",
          updatedAt: "2026-04-20T00:00:00.000Z",
          _count: { messages: 2 },
        },
      ],
      loading: false,
      actions: {
        deleteConversation: vi.fn(),
        toggleCollapsed: vi.fn(),
      },
    });

    render(
      <ConversationSidebar
        activeId={null}
        disableSelection
        onSelect={onSelect}
        onNew={onNew}
      />,
    );

    await user.click(screen.getByText("Appendicitis workup"));
    await user.click(screen.getByTitle("New consultation"));

    expect(onSelect).not.toHaveBeenCalled();
    expect(onNew).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /appendicitis workup/i })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(screen.getByTitle("Delete consultation")).toBeDisabled();
    expect(screen.getByTitle("New consultation")).toBeDisabled();
  });
});
