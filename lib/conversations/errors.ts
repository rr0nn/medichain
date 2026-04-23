/**
 * @fileoverview Defines conversation API error types used by client-side consultation state.
 * @contributors Johnson Zhang
 */

export class ConversationNotFoundError extends Error {
  constructor() {
    super("Conversation not found");
    this.name = "ConversationNotFoundError";
  }
}
