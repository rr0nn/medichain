# API Routes

This folder contains the Next.js route handlers used by the MediChain frontend. The routes are internal application APIs: they support the chat interface, conversation persistence, and streaming AI responses.

## Design Notes

- Route handlers stay thin and delegate persistence to `server/db/`.
- Chat orchestration is delegated to `server/ai/`.
- Responses are JSON unless otherwise noted.
- The chat route streams assistant output rather than returning a single JSON payload.

## Routes

### `GET /api/conversations`

Returns the list of saved conversations.

Response:

- array of conversation summaries
- each item includes conversation metadata such as `id`, `title`, timestamps, and message count

### `POST /api/conversations`

Creates a new conversation.

Request body:

```json
{
  "title": "Optional conversation title"
}
```

Notes:

- if no title is provided, the default title is `New Consultation`

Response:

- the created conversation record

### `GET /api/conversations/:id`

Returns a single saved conversation by id.

Response:

- conversation record if found
- `404` with `{ "error": "Not found" }` if the conversation does not exist

### `PATCH /api/conversations/:id`

Updates the title of a saved conversation.

Request body:

```json
{
  "title": "Updated conversation title"
}
```

Response:

- the updated conversation record

### `DELETE /api/conversations/:id`

Deletes a saved conversation.

Response:

- `204 No Content` on success

### `GET /api/conversations/:id/messages`

Returns the saved message history for a conversation.

Response:

- array of persisted `UIMessage` objects ordered by creation time

### `POST /api/conversations/:id/chat`

Accepts a chat request for an existing conversation and streams the interview agent response.

Request body:

- `ChatRequest`
- includes the current message history used by the interview workflow

Behavior:

- persists the latest user message when appropriate
- runs the interview workflow
- streams the assistant response back to the client
- persists the assistant response after streaming finishes
- updates the conversation title from the first user message when applicable

Response:

- streaming AI response rather than a standard JSON body

## Related Documentation

- [`../README.md`](../README.md)
- [`../../server/README.md`](../../server/README.md)
- [`../../server/db/README.md`](../../server/db/README.md)
- [`../../server/ai/README.md`](../../server/ai/README.md)
