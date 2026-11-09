import { useState } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button, StatusChip, Tabs, Textarea, initials } from '@/components/ui';
import { t } from '@/i18n';
import { commentKind, elementName, formatTime, statusMatches, versionLabel, waitingForMe } from './logic';
import type { CommentThread, StatusFilter } from './logic';
import type { CommentTarget, Floor, Role } from './types';

interface Props {
  threads: CommentThread[];
  /** Viewer role: decides which threads are waiting for my reply. */
  me: Role;
  floors: Floor[];
  floorId: string;
  labels: Record<string, string>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** Selected room: list can be narrowed to its comments. */
  room: { name: string; has: (x: CommentThread) => boolean } | null;
  /** What a new comment attaches to; null = general comment. */
  target: CommentTarget | null;
  onTarget: (t: CommentTarget | null) => void;
  composerPlaceholder: string;
  /** Member: threads in their rooms. Adds a "My rooms" filter, on by default. */
  mine?: { has: (x: CommentThread) => boolean };
  /** Member: mark a thread as handled in their draft, a hint for the Lead. */
  draftTick?: { can: (x: CommentThread) => boolean; checked: (x: CommentThread) => boolean; onToggle: (x: CommentThread, on: boolean) => void };
  allow: { comment: boolean; reply: boolean; respond: boolean; address: boolean };
  onAddress: (id: string) => Promise<void>;
  onCreate: (text: string) => Promise<boolean>;
  onReply: (id: string, text: string) => Promise<void>;
  onAccept: (id: string) => Promise<void>;
  onNotYet: (id: string, text: string) => Promise<void>;
}

const Tag = ({ children }: { children: ReactNode }) => <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">{children}</span>;

function Composer({ placeholder, onSend, onCancel, label, autoFocus, rows = 2, quiet, compact, hint }: {
  placeholder: string; onSend: (t: string) => Promise<unknown>; onCancel?: () => void; label?: string; autoFocus?: boolean; rows?: number;
  /** Inside a thread: the button stays outlined, the panel keeps one filled action. */
  quiet?: boolean;
  /** One line until it is used, so the comment list keeps the height. */
  compact?: boolean;
  hint?: string;
}) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [focused, setFocused] = useState(false);
  const open = !compact || focused || !!text;
  const send = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try { if ((await onSend(text.trim())) !== false) setText(''); } finally { setBusy(false); }
  };
  return (
    <div className={open ? 'space-y-2' : 'flex items-center gap-2'} onFocus={() => setFocused(true)}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false); }}>
      <div className="min-w-0 flex-1">
        <Textarea autoFocus={autoFocus} rows={open ? rows : 1} value={text} aria-label={placeholder} onChange={(e) => setText(e.target.value)} placeholder={placeholder}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } }} />
      </div>
      {open && hint && <p className="text-[11px] leading-4 text-slate-500">{hint}</p>}
      <div className="flex shrink-0 justify-end gap-2">
        {onCancel && <Button size="sm" onClick={onCancel}>{t('common.cancel')}</Button>}
        <Button size="sm" variant={!quiet && text.trim() ? 'primary' : 'secondary'} onClick={send} loading={busy} disabled={!text.trim()}>{label ?? t('comments.send')}</Button>
      </div>
    </div>
  );
}

export function CommentPanel(p: Props) {
  const [mineOnly, setMineOnly] = useState(true);
  const inScope = (x: CommentThread) => !p.mine || !mineOnly || p.mine.has(x);
  const waiting = p.threads.filter((x) => inScope(x) && waitingForMe(x.root, p.me));
  // "Waiting for me" is the default whenever someone is waiting on a reply
  const [status, setStatus] = useState<StatusFilter | 'WAITING'>(() => (waiting.length ? 'WAITING' : 'UNRESOLVED'));
  const canWait = p.me === 'designer' || p.me === 'homeowner';
  const [allFloors, setAllFloors] = useState(false);
  const [roomOnly, setRoomOnly] = useState(true);
  const [notYet, setNotYet] = useState<string | null>(null);
  const floorName = (id: string | null) => p.floors.find((f) => f.id === id)?.name;
  const multi = p.floors.length > 1;
  const list = p.threads.filter((x) => inScope(x) && (status === 'WAITING' ? waitingForMe(x.root, p.me) : statusMatches(x.root, status))
    && (!multi || allFloors || !x.root.floor_id || x.root.floor_id === p.floorId)
    && (!p.room || !roomOnly || p.room.has(x)));
  const target = p.target;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-2 px-4 pb-2 pt-3">
        <Tabs size="sm" label={t('workspace.comments')} value={status} onChange={setStatus}
          items={[
            ...(canWait ? [{ id: 'WAITING' as const, label: t('comments.filterWaiting'), badge: waiting.length }] : []),
            { id: 'UNRESOLVED' as const, label: t('comments.filterOpen') }, { id: 'ALL' as const, label: t('comments.filterAll') },
          ]} />
        {p.mine && (
          <button type="button" aria-pressed={mineOnly} onClick={() => setMineOnly(!mineOnly)}
            className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-brand ${mineOnly ? 'border-brand bg-brand-soft text-brand' : 'border-line text-slate-600 hover:bg-slate-50'}`}>
            {t('comments.myRooms')}
          </button>
        )}
        {p.room && (
          <button type="button" aria-pressed={roomOnly} onClick={() => setRoomOnly(!roomOnly)}
            className={`max-w-[160px] truncate rounded-full border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-brand ${roomOnly ? 'border-brand bg-brand-soft text-brand' : 'border-line text-slate-600 hover:bg-slate-50'}`}>
            {t('ws.onlyRoom', { room: p.room.name })}
          </button>
        )}
        {multi && (
          <label className="ml-auto flex items-center gap-1.5 text-xs text-slate-600">
            <input type="checkbox" className="h-3.5 w-3.5 rounded border-slate-300 accent-brand" checked={allFloors} onChange={(e) => setAllFloors(e.target.checked)} />
            {t('comments.allFloors')}
          </label>
        )}
      </div>

      <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 pb-3">
        {!list.length && <li className="rounded-lg border border-dashed border-line-strong px-4 py-6 text-center text-sm text-slate-500">{t(status === 'WAITING' ? 'comments.emptyWaiting' : 'comments.empty')}</li>}
        {list.map((thread) => {
          const { root, replies, element, carried, num } = thread;
          const open = p.selectedId === root.id;
          const kind = commentKind(root);
          const floor = multi ? floorName(root.floor_id) : undefined;
          return (
            <li key={root.id} className={`rounded-card border bg-surface transition-colors ${open ? 'border-brand ring-2 ring-brand/15' : 'border-line hover:border-line-strong'}`}>
              <button type="button" aria-expanded={open} className="w-full rounded-card px-3 py-2.5 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand" onClick={() => p.onSelect(open ? null : root.id)}>
                <div className="flex items-start gap-2.5">
                  <span aria-hidden className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy text-[11px] font-semibold text-white">
                    {initials(root.author.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="min-w-0 truncate text-[13px] font-semibold text-slate-900">{root.author.name}</p>
                      <StatusChip kind="comment" value={root.status} size="sm" />
                    </div>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-slate-500">
                      {num != null && <span className="font-semibold text-rose-600">{t('ws.pin', { n: num })}</span>}
                      <span>{formatTime(root.created_at)}</span>
                    </p>
                    <p className="mt-1 whitespace-pre-line break-words text-[13px] leading-5 text-slate-800">{root.content}</p>
                    {p.allow.respond && root.status === 'ADDRESSED' && !open && <p className="mt-1 text-xs font-medium text-amber-800">{t('comments.yourTurn')}</p>}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {element ? <Tag>{elementName(element, p.me)}</Tag> : kind === 'element' ? <Tag>{t('comments.removedItem', { name: root.element?.name ?? t('comments.kind.element') })}</Tag> : kind === 'general' && <Tag>{t('comments.kind.general')}</Tag>}
                      {floor && <Tag>{floor}</Tag>}
                      {carried && <Tag>{t('comments.fromVersion', { label: versionLabel(root.version_label, p.me) })}</Tag>}
                      {root.addressed_in_version_id && <Tag>{t('comments.addressedIn', { label: p.labels[root.addressed_in_version_id] ?? '—' })}</Tag>}
                      {!!replies.length && <Tag>{t('comments.replies', { n: replies.length })}</Tag>}
                    </div>
                  </div>
                </div>
              </button>
              {open && (
                <div className="space-y-2 border-t border-line px-3 py-3">
                  {replies.map((r) => (
                    <div key={r.id} className="rounded-lg bg-slate-50 px-2.5 py-2 text-[13px]">
                      <p><span className="font-medium text-slate-800">{r.author.name}</span><span className="ml-1.5 text-[11px] text-slate-500">{formatTime(r.created_at)}</span></p>
                      <p className="mt-0.5 whitespace-pre-line break-words text-slate-700">{r.content}</p>
                    </div>
                  ))}
                  {p.allow.respond && root.status === 'ADDRESSED' && notYet !== root.id && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="primary" className="flex-1" onClick={() => p.onAccept(root.id)}>{t('comments.accept')}</Button>
                      <Button size="sm" className="flex-1" onClick={() => setNotYet(root.id)}>{t('comments.notYet')}</Button>
                    </div>
                  )}
                  {p.allow.address && root.status === 'OPEN' && (
                    <Button size="sm" block onClick={() => p.onAddress(root.id)}>{t('comments.markAddressed')}</Button>
                  )}
                  {p.draftTick?.can(thread) && (
                    <label className="flex items-start gap-2 text-[13px] text-slate-700">
                      <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-brand" checked={p.draftTick.checked(thread)} onChange={(e) => p.draftTick!.onToggle(thread, e.target.checked)} />
                      {t('comments.handledInDraft')}
                    </label>
                  )}
                  {notYet === root.id ? (
                    <Composer autoFocus placeholder={t('comments.notYetPlaceholder')} label={t('comments.reopen')} onCancel={() => setNotYet(null)}
                      onSend={async (text) => { await p.onNotYet(root.id, text); setNotYet(null); }} />
                  ) : p.allow.reply && root.status !== 'RESOLVED' && (
                    <Composer quiet rows={1} placeholder={t('comments.replyPlaceholder')} onSend={(text) => p.onReply(root.id, text)} />
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {p.allow.comment && (
        <div className="shrink-0 border-t border-line bg-surface px-4 py-3">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <p className={`truncate text-xs font-medium ${target ? 'text-brand' : 'text-slate-600'}`}>
              {target?.kind === 'element' ? t('comments.onItem', { name: elementName(target.element, p.me) }) : target?.kind === 'point' ? t('comments.onSpot') : t('comments.forGeneral')}
            </p>
            {target && target.kind !== 'general' && (
              <button type="button" onClick={() => p.onTarget({ kind: 'general' })} aria-label={t('ws.clearTarget')} title={t('ws.clearTarget')} className="rounded p-0.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-brand">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Composer key={target ? JSON.stringify(target.kind === 'element' ? target.element.id : target) : 'general'}
            compact hint={target ? undefined : t('comments.hint')} placeholder={p.composerPlaceholder} onSend={p.onCreate} />
        </div>
      )}
    </div>
  );
}
