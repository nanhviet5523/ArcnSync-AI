// No '@/' runtime imports here: chatIds.test.ts loads this file with plain `node --test`.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Same shape the backend's ParseUUIDPipe accepts (any version, any case). Anything else would be a 400 BAD_REQUEST. */
export const isUuid = (id: string | null | undefined): id is string => typeof id === 'string' && UUID.test(id);

/** The /messages route with the conversation open. */
export const conversationPath = (conversationId: string): string => `/messages?c=${encodeURIComponent(conversationId)}`;
