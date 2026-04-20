import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ChatComposer } from "./chat-composer";

describe("ChatComposer", () => {
  it("submits when idle and input is present", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const onStop = vi.fn();

    render(
      <ChatComposer
        activeConversationId="conv-1"
        input="Patient has abdominal pain"
        isLoading={false}
        onInputChange={vi.fn()}
        onStop={onStop}
        onSubmit={onSubmit}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onStop).not.toHaveBeenCalled();
  });

  it("shows a stop action while loading and stops the response", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const onStop = vi.fn();

    render(
      <ChatComposer
        activeConversationId="conv-1"
        input=""
        isLoading
        onInputChange={vi.fn()}
        onStop={onStop}
        onSubmit={onSubmit}
      />,
    );

    const stopButton = screen.getByRole("button", { name: "Stop response" });

    expect(stopButton).toBeEnabled();

    await user.click(stopButton);

    expect(onStop).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
