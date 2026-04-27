/**
 * @fileoverview Defines client-facing conversation types shared by conversation helpers and hooks.
 * @contributors Johnson Zhang
 */

export interface ConversationSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  _count: { messages: number };
}
