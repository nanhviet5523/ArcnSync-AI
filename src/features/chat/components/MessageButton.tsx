import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui';
import type { ButtonProps } from '@/components/ui/Button';
import { t } from '@/i18n';
import { useOpenConversation } from '../hooks/useOpenConversation';

/**
 * "Message" button for any screen (project, user profile...): opens the 1-1 conversation with `userId`.
 * Renders nothing for admins, signed-out visitors and the viewer themself. Pass `conversationId` when it is already known.
 */
export function MessageButton({ userId, conversationId, label, variant = 'secondary', size = 'md' }: {
  userId: string;
  conversationId?: string | null;
  label?: string;
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
}) {
  const { open, canOpen, isPending, error, canRetry, retry, reset } = useOpenConversation();
  if (!canOpen(userId)) return null;

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Button variant={variant} size={size} loading={isPending} onClick={() => void open(userId, conversationId)}>
        {!isPending && <MessageCircle aria-hidden className="h-4 w-4" />}
        {label ?? t('chat.open.button')}
      </Button>
      {error && (
        <span role="alert" className="flex items-center gap-2 text-xs text-rose-700">
          {error}
          {canRetry
            ? <button type="button" onClick={retry} className="cursor-pointer font-semibold underline">{t('common.retry')}</button>
            : <button type="button" onClick={reset} className="cursor-pointer font-semibold underline">{t('common.close')}</button>}
        </span>
      )}
    </span>
  );
}
