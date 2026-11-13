import { useState } from 'react';
import { ArrowRight, ChevronRight, Download, Upload } from 'lucide-react';
import { Avatar, Button, StatusChip } from '@/components/ui';
import { t } from '@/i18n';
import { Thumb } from './ItemPanel';
import { OpTag } from './MemberDxfUpload';
import { changeCount, changeLines, draftChangeCount, draftPatches, layoutCount, layoutLines, signedVnd, totalDelta } from './roomDrafts';
import type { ChangeLine, MemberDraftRow } from './roomDrafts';
import type { DesignElement, Product, RoomDraft } from './types';

/** Member's bar at the bottom of the right column: one line per room with a draft. */
export function MemberDraftBar({ rows, hasRooms, busy, onSave, onReady, onUploadDxf, onShowLastUpload }: {
  rows: MemberDraftRow[]; hasRooms: boolean; busy: boolean; onSave: (r: MemberDraftRow) => void; onReady: (r: MemberDraftRow) => void;
  /** Shown when can('uploadRoomDxf'). */
  onUploadDxf?: () => void;
  /** Reopens the result of the last DXF upload, when there was one. */
  onShowLastUpload?: () => void;
}) {
  const uploadRow = onUploadDxf && (
    <div className="flex shrink-0 items-center justify-end gap-2 border-t border-line bg-surface px-4 py-2">
      {onShowLastUpload && <Button size="sm" variant="ghost" onClick={onShowLastUpload}>{t('drafts.lastUpload')}</Button>}
      <Button size="sm" disabled={busy} onClick={onUploadDxf}><Upload aria-hidden className="h-3.5 w-3.5" />{t('drafts.uploadDxf')}</Button>
    </div>
  );
  if (!rows.length) {
    return (
      <>
        <p className="shrink-0 border-t border-line bg-surface px-4 py-3 text-[13px] text-slate-500">{t(hasRooms ? 'drafts.none' : 'drafts.noRooms')}</p>
        {uploadRow}
      </>
    );
  }
  // one main action per screen: only the first line that still needs the Member gets the filled button
  const first = rows.find((r) => r.count > 0 && (r.dirty || !r.ready));
  return (
    <>
    <ul className="max-h-36 shrink-0 divide-y divide-line overflow-y-auto border-t border-line bg-surface">
      {rows.map((r) => {
        const waiting = r.ready && !r.dirty;
        return (
          <li key={r.roomId} className="space-y-2 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-slate-900">
                {r.count ? t('drafts.forRoom', { room: r.roomName, n: r.count }) : t('drafts.commentsOnly', { room: r.roomName })}
              </span>
              {waiting && <StatusChip kind="roomDraft" value="READY" size="sm" />}
            </div>
            {waiting ? <p className="text-xs text-slate-500">{t('drafts.waitingLead')}</p> : (
              <div className="flex justify-end gap-2">
                <Button size="sm" disabled={!r.dirty || busy} onClick={() => onSave(r)}>{t('drafts.saveDraft')}</Button>
                {r.count > 0 && <Button size="sm" variant={r === first ? 'primary' : 'secondary'} disabled={busy} onClick={() => onReady(r)}>{t('drafts.markReady')}</Button>}
              </div>
            )}
          </li>
        );
      })}
    </ul>
    {uploadRow}
    </>
  );
}

function ProductMini({ product }: { product: Product | null }) {
  return (
    <span className="flex min-w-0 flex-1 items-center gap-1.5">
      <Thumb path={product?.thumbnail_url ?? null} className="h-7 w-7" />
      <span className="min-w-0">
        <span className="line-clamp-2 text-xs leading-4 text-slate-700">{product?.name ?? t('drafts.notChosen')}</span>
        {product?.unavailable && <span className="block text-[11px] font-medium leading-4 text-rose-700">{t('drafts.noLongerAvailable')}</span>}
      </span>
    </span>
  );
}

/** Old product → new product and the price difference. Also shown in the Selected item tab during Compare. */
export function ChangeSummary({ line }: { line: ChangeLine }) {
  return (
    <>
      <span className="flex items-baseline justify-between gap-2">
        <span className="min-w-0 truncate text-[13px] font-medium text-slate-900">{line.name}</span>
        {line.layout && <OpTag op={line.layout.op} />}
        {line.swap && <span className="shrink-0 text-xs font-semibold tabular-nums text-slate-900">{signedVnd(line.delta)}</span>}
      </span>
      {line.swap && (
        <span className="mt-1 flex items-center gap-1.5">
          <ProductMini product={line.swap.from} />
          <ArrowRight aria-hidden className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <ProductMini product={line.swap.to} />
        </span>
      )}
      {line.overridesChanged && <span className="mt-0.5 block text-xs text-slate-500">{t('drafts.overrideChanged')}</span>}
    </>
  );
}

/** Lead's list of the Members' drafts, above the Save bar. */
export function RoomDraftsBlock({ drafts, avatars, elements, previewId, onPreview, onPickLine, commentText, comparing, canCompare, onCompare, onShowIgnored, onDownloadFile }: {
  drafts: RoomDraft[];
  /** Avatar letters by designer id (avatarLabels). */
  avatars: Record<string, string>;
  /** The version's own items, without any draft on them. */
  elements: readonly DesignElement[];
  previewId: string | null;
  onPreview: (d: RoomDraft) => void;
  onPickLine: (l: ChangeLine) => void;
  commentText: (id: string) => string | undefined;
  comparing: boolean;
  canCompare: boolean;
  onCompare: () => void;
  /** The Member tried to change items outside their rooms in the last upload. */
  onShowIgnored: (d: RoomDraft) => void;
  /** The DXF the Member uploaded. */
  onDownloadFile: (d: RoomDraft) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const shown = drafts.filter((d) => draftChangeCount(d) > 0);
  if (!shown.length) return null;
  return (
    <section aria-label={t('drafts.blockTitle')} className="shrink-0 border-t border-line bg-surface">
      <div className="flex items-center justify-between gap-2 px-4 pt-2.5">
        <h3 className="text-[13px] font-semibold text-slate-900">{t('drafts.blockTitle')}</h3>
        {(canCompare || comparing) && (
          <Button size="sm" variant="ghost" aria-pressed={comparing} className={comparing ? 'bg-brand-soft text-brand' : ''} onClick={onCompare}>{t('drafts.compareBeforeMerge')}</Button>
        )}
      </div>
      <ul className={`${openId ? 'max-h-[30vh]' : 'max-h-44'} overflow-y-auto px-4 pb-2`}>
        {shown.map((d) => {
          const open = openId === d.id;
          const lines = open ? [...layoutLines(elements, [d]), ...changeLines(elements, draftPatches([d]))] : [];
          const ignored = d.last_upload?.ignored.length ?? 0;
          const handled = open ? d.addressed_comment_ids.flatMap((id) => commentText(id) ?? []) : [];
          return (
            <li key={d.id} className="py-1.5">
              <div className="flex items-center gap-2">
                <button type="button" aria-expanded={open} aria-label={t('drafts.showChanges', { room: d.room_name })} onClick={() => setOpenId(open ? null : d.id)}
                  className="flex min-w-0 flex-1 items-center gap-1 rounded text-left text-[13px] focus-visible:outline-2 focus-visible:outline-brand">
                  <ChevronRight aria-hidden className={`h-3.5 w-3.5 shrink-0 text-slate-500 transition-transform ${open ? 'rotate-90' : ''}`} />
                  <Avatar id={d.designer_id} name={d.designer_name} label={avatars[d.designer_id]} />
                  <span className="ml-1 min-w-0">
                    <span className="block truncate font-medium text-slate-900" title={d.room_name}>{d.room_name}</span>
                    <span className="flex gap-1 text-xs text-slate-500"><span className="min-w-0 truncate" title={d.designer_name}>{d.designer_name}</span><span aria-hidden>·</span><span className="shrink-0 tabular-nums">{t('drafts.changes', { n: draftChangeCount(d) })}</span></span>
                  </span>
                </button>
                <StatusChip kind="roomDraft" value={d.status} size="sm" />
                <Button size="sm" variant="ghost" aria-pressed={previewId === d.id} aria-label={t('drafts.previewOf', { room: d.room_name })}
                  className={previewId === d.id ? 'bg-brand-soft text-brand' : ''} onClick={() => onPreview(d)}>{t('drafts.preview')}</Button>
              </div>
              <div className="ml-[18px] mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs tabular-nums text-slate-600">
                <span>{t('drafts.layoutCount', { n: layoutCount(d) })}</span>
                <span aria-hidden className="text-slate-400">·</span>
                <span>{t('drafts.productCount', { n: changeCount(d) })}</span>
                {ignored > 0 && (
                  <button type="button" onClick={() => onShowIgnored(d)} aria-label={t('drafts.ignored', { n: ignored })}
                    className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-900 hover:bg-amber-200 focus-visible:outline-2 focus-visible:outline-brand">
                    {t('drafts.ignoredChip', { n: ignored })}
                  </button>
                )}
              </div>
              {d.status !== 'READY' && <p className="ml-[18px] mt-0.5 text-xs text-slate-500">{t('drafts.notReady')}</p>}
              {open && (
                <div className="ml-[18px] mt-1.5 rounded-lg border border-line">
                  <ul className="divide-y divide-line">
                    {lines.map((l) => (
                      <li key={`${l.layout?.op ?? 'p'}-${l.elementId}`}>
                        <button type="button" onClick={() => onPickLine(l)} className="block w-full px-2.5 py-2 text-left hover:bg-slate-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand">
                          <ChangeSummary line={l} />
                        </button>
                      </li>
                    ))}
                  </ul>
                  <p className="flex justify-between gap-2 border-t border-line px-2.5 py-1.5 text-xs">
                    <span className="text-slate-600">{t('drafts.roomTotal')}</span>
                    <span className="font-semibold tabular-nums text-slate-900">{signedVnd(totalDelta(lines))}</span>
                  </p>
                  {d.has_source_file && (
                    <div className="border-t border-line px-2.5 py-1.5">
                      <Button size="sm" variant="ghost" onClick={() => onDownloadFile(d)}><Download aria-hidden className="h-3.5 w-3.5" />{t('drafts.memberFile')}</Button>
                    </div>
                  )}
                  {!!handled.length && (
                    <div className="border-t border-line px-2.5 py-1.5">
                      <p className="text-xs font-medium text-slate-700">{t('drafts.handledComments')}</p>
                      <ul className="mt-0.5 space-y-0.5">{handled.map((c, i) => <li key={i} className="line-clamp-2 text-xs text-slate-600">{c}</li>)}</ul>
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
