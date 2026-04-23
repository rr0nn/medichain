import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/ai-elements/conversation", () => ({
  ConversationContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  ConversationEmptyState: ({
    children,
    title,
    description,
    className,
  }: {
    children: React.ReactNode;
    title: string;
    description: string;
    className?: string;
  }) => (
    <section className={className}>
      <h2>{title}</h2>
      <p>{description}</p>
      {children}
    </section>
  ),
}));

vi.mock("@/components/ai-elements/message", () => ({
  Message: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  MessageContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  MessageResponse: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

import { ChatMessageList } from "../chat-message-list";

describe("ChatMessageList", () => {
  it("renders the starter empty state and lets the user select a prompt", async () => {
    const user = userEvent.setup();
    const onPromptSelect = vi.fn();

    render(
      <ChatMessageList
        messages={[]}
        loadingMessages={false}
        isLoading={false}
        activeConversationId={null}
        status="ready"
        onPromptSelect={onPromptSelect}
      />,
    );

    expect(screen.getAllByText("Start a consultation")[0]).toBeInTheDocument();
    expect(screen.getByText("Example intake details")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: /52-year-old with crushing central chest pain/i,
      }),
    );

    expect(onPromptSelect).toHaveBeenCalledWith(
      "52-year-old with crushing central chest pain radiating to the left arm for 2 hours.",
    );
  });

  it("renders message content, DDx cue text, and the assistant loading state", () => {
    render(
      <ChatMessageList
        messages={[
          {
            id: "m1",
            role: "user",
            parts: [{ type: "text", text: "Patient has RLQ pain." }],
          },
          {
            id: "m2",
            role: "assistant",
            parts: [
              { type: "text", text: "Reviewing the case." },
              {
                type: "tool-runDifferentialDiagnosis",
                state: "input-available",
                input: { patientDescription: "RLQ pain" },
              },
            ],
          },
        ] as never}
        loadingMessages={false}
        isLoading={false}
        activeConversationId="conv-1"
        status="submitted"
      />,
    );

    expect(screen.getByText("Patient has RLQ pain.")).toBeInTheDocument();
    expect(screen.getByText("Reviewing the case.")).toBeInTheDocument();
    expect(screen.getByText("Look on the right side running ddx . . .")).toBeInTheDocument();
  });
});
