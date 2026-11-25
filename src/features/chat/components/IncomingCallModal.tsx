import { Phone, PhoneOff, Video } from 'lucide-react';
import { Avatar, Button, roleLabel } from '@/components/ui';
import { Z } from '@/components/ui/zIndex';
import { t } from '@/i18n';
import type { ChatContactUser } from '@/types/chat';

interface IncomingCallModalProps {
  peer: ChatContactUser | null;
  busyAction: 'accept' | 'decline' | null;
  error: string;
  onAccept: () => void;
  onDecline: () => void;
}

/**
 * Floating global incoming call card (`call.incoming`). Shown on any route so the callee
 * can accept (POST /video-calls/:id/acceptance) or decline (POST /video-calls/:id/rejection)
 * without having to be on /messages.
 */
export function IncomingCallModal({
  peer,
  busyAction,
  error,
  onAccept,
  onDecline,
}: IncomingCallModalProps) {
  const callerName = peer?.fullName ?? t('chat.call.incomingTitle');
  const subtitle = peer
    ? peer.companyName
      ? `${roleLabel(peer.role)} · ${peer.companyName}`
      : roleLabel(peer.role)
    : t('chat.call.incomingSubtitle', { name: callerName });

  return (
    <div
      role="alertdialog"
      aria-modal="false"
      aria-labelledby="incoming-call-title"
      aria-describedby="incoming-call-desc"
      className={`fixed right-4 bottom-4 ${Z.modal} w-[calc(100vw-2rem)] max-w-sm rounded-2xl border border-slate-700/80 bg-slate-950/95 p-5 text-white shadow-2xl backdrop-blur-md sm:right-6 sm:bottom-6`}
    >
      <div className="flex items-center gap-3.5">
        <div className="relative shrink-0">
          <span
            aria-hidden
            className="absolute -inset-1.5 animate-ping rounded-full bg-emerald-400/35"
          />
          {peer ? (
            <span className="relative inline-flex rounded-full ring-2 ring-emerald-400">
              <Avatar id={peer.id} name={peer.fullName} size="md" />
            </span>
          ) : (
            <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white ring-2 ring-emerald-400">
              <Video aria-hidden className="h-5 w-5" />
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
            <Video aria-hidden className="h-3.5 w-3.5" />
            {t('chat.call.incomingTitle')}
          </p>
          <h2 id="incoming-call-title" className="mt-0.5 truncate text-base font-semibold text-white">
            {callerName}
          </h2>
          <p id="incoming-call-desc" className="truncate text-xs text-slate-300">
            {subtitle}
          </p>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-rose-500/15 px-3 py-2 text-xs text-rose-200">
          {error}
        </p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <Button
          variant="danger"
          block
          loading={busyAction === 'decline'}
          disabled={busyAction !== null}
          onClick={onDecline}
        >
          {busyAction !== 'decline' && <PhoneOff aria-hidden className="h-4 w-4" />}
          {busyAction === 'decline' ? t('chat.call.declining') : t('chat.call.decline')}
        </Button>
        <button
          type="button"
          disabled={busyAction !== null}
          onClick={onAccept}
          className="inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-btn bg-emerald-600 px-4 text-sm font-medium text-white transition hover:bg-emerald-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busyAction === 'accept' ? (
            <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
          ) : (
            <Phone aria-hidden className="h-4 w-4" />
          )}
          {busyAction === 'accept' ? t('chat.call.accepting') : t('chat.call.accept')}
        </button>
      </div>
    </div>
  );
}
