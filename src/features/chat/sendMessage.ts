// No '@/' runtime imports here: sendMessage.test.ts loads this file with plain `node --test`.
import type { SendMessageInput, SendMessageJsonBody } from '../../types/chat.ts';

/** Backend limits for POST /conversations/:id/messages. */
export const MAX_MESSAGE_LENGTH = 4000;
/** Show the counter past this many characters. */
export const COUNTER_FROM = 3500;
export const MAX_CHAT_FILE_BYTES = 20 * 1024 * 1024;
export const CHAT_FILE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.pdf', '.docx', '.xlsx', '.dxf', '.zip'] as const;
/** For <input accept>. */
export const CHAT_FILE_ACCEPT = CHAT_FILE_EXTENSIONS.join(',');

export type ChatFileProblem = 'FILE_TOO_LARGE' | 'FILE_TYPE_NOT_ALLOWED';

/**
 * Early check on the client (extension + size) so the user hears about it before uploading.
 * The backend still decides from the content and may answer 422 INVALID_CHAT_ATTACHMENT.
 */
export function validateChatFile(file: { name: string; size: number }): ChatFileProblem | null {
  const name = file.name.toLowerCase();
  if (!CHAT_FILE_EXTENSIONS.some((ext) => name.endsWith(ext))) return 'FILE_TYPE_NOT_ALLOWED';
  if (file.size > MAX_CHAT_FILE_BYTES) return 'FILE_TOO_LARGE';
  return null;
}

/** Content length as the backend counts it (after trim). */
export const contentLength = (content: string): number => content.trim().length;

/** Text (after trim) or a file is required, and the text must fit. */
export function canSubmit(content: string, file: unknown): boolean {
  const length = contentLength(content);
  if (length > MAX_MESSAGE_LENGTH) return false;
  return length > 0 || !!file;
}

/** A value worth sending: no '', no whitespace, no 'undefined'. */
const present = (value: string | null | undefined): value is string => typeof value === 'string' && value.trim() !== '';

export type SendBody = { kind: 'json'; body: SendMessageJsonBody } | { kind: 'form'; form: FormData };

/**
 * JSON without a file; multipart (field "file" plus the text fields) with one. Optional fields without a value are
 * left out entirely. Content-Type is never set here: the browser adds the multipart boundary itself.
 */
export function buildSendBody(input: SendMessageInput): SendBody {
  const content = (input.content ?? '').trim();
  const projectId = present(input.projectId) ? input.projectId.trim() : undefined;
  const designVersionId = present(input.designVersionId) ? input.designVersionId.trim() : undefined;

  if (input.file) {
    const form = new FormData();
    form.append('file', input.file);
    if (content) form.append('content', content);
    if (projectId) form.append('projectId', projectId);
    if (designVersionId) form.append('designVersionId', designVersionId);
    return { kind: 'form', form };
  }

  const body: SendMessageJsonBody = { content };
  if (projectId) body.projectId = projectId;
  if (designVersionId) body.designVersionId = designVersionId;
  return { kind: 'json', body };
}
