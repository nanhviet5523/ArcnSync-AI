import React, { useEffect, useMemo, useState } from 'react';
import { DoorOpen } from 'lucide-react';
import { getCurrentUser } from '@/services/authService';
import { errorText, t } from '@/i18n';
import {
  getRoomAssignments,
  updateRoomAssignments,
  type ApartmentFloor,
  type AssignRoomItem,
  type ProjectMember,
  type ProjectRoomRef,
  type RoomAssignment,
} from '@/features/projects/projectApi';
import { isUuid } from '@/features/projects/services/contractsApi';
import { Button, Modal } from '@/components/ui';

interface RoomAssignmentsTabProps {
  projectId: string;
  /** user_id of the project's Lead Designer. */
  leadDesignerId: string | null;
  /** apartment.rooms of GET /projects/:id: the rooms missing from the assignments are shown as unassigned. */
  apartmentRooms?: ProjectRoomRef[];
  /** apartment.floors, to show a floor's name instead of its id. */
  floors?: ApartmentFloor[];
  /** The Lead (`designer` of GET /projects/:id); with `members`, who a room can go to. */
  leadName?: string;
  /** `members` of GET /projects/:id (the Lead is not among them). */
  members?: ProjectMember[];
  /** The project is COMPLETED or CANCELLED: assignments are view-only. */
  closed?: boolean;
  /** Change it to fetch the assignments again (e.g. after the Lead changed). */
  reloadKey?: number;
}

/** Message for a failed GET, chosen by the backend `code` (401s are handled by the API client). */
function loadErrorText(err: unknown, role: string | undefined): string {
  const e = (err ?? {}) as { status?: number; code?: string };
  if (e.code === 'PROJECT_NOT_FOUND' || e.status === 404) return t(role === 'designer' ? 'projectDetail.roomAssign.errNotOnTeam' : 'projectDetail.roomAssign.errNotFound');
  if (e.code === 'INSUFFICIENT_ROLE') return t('projectDetail.roomAssign.errForbidden');
  if (e.code === 'BAD_REQUEST') return t('projectDetail.roomAssign.errBadId');
  return errorText(err);
}

const SAVE_ERRORS: Record<string, string> = {
  NOT_PROJECT_DESIGNER: 'projectDetail.roomAssign.errNotLead',
  INSUFFICIENT_ROLE: 'projectDetail.roomAssign.errCannotAssign',
  DESIGNER_NOT_IN_PROJECT: 'projectDetail.roomAssign.errDesignerNotInProject',
  ROOM_NOT_IN_APARTMENT: 'projectDetail.roomAssign.errRoomNotInApartment',
  PROJECT_CLOSED: 'projectDetail.roomAssign.errProjectClosed',
  VALIDATION_ERROR: 'projectDetail.roomAssign.errInvalidPayload',
  PROJECT_NOT_FOUND: 'projectDetail.roomAssign.errNotFound',
};

/** Message for a failed PUT, chosen by the backend `code`. */
function saveErrorText(err: unknown): string {
  const key = SAVE_ERRORS[(err as { code?: string } | null)?.code ?? ''];
  return key ? t(key) : errorText(err);
}

/**
 * Room assignments of one project (GET/PUT /projects/{id}/room-assignments).
 * Only the project's Lead Designer can edit; every other role sees it view-only.
 */
export const RoomAssignmentsTab: React.FC<RoomAssignmentsTabProps> = ({ projectId, leadDesignerId, apartmentRooms, floors, leadName, members, closed = false, reloadKey }) => {
  const currentUser = getCurrentUser();
  const canEdit = !closed && currentUser?.role === 'designer' && !!leadDesignerId && currentUser.id === leadDesignerId;

  const [rooms, setRooms] = useState<RoomAssignment[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  /** Which project the shown rooms (or error) belong to: anything else means still loading. */
  const [loaded, setLoaded] = useState<{ projectId: string; error: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const role = currentUser?.role;
  // a malformed id is an error without calling the API
  const badId = !!projectId && !isUuid(projectId);
  // no project id (or a malformed one): nothing is loading
  const busy = !!projectId && !badId && loaded?.projectId !== projectId;
  const shownError = badId ? t('projectDetail.roomAssign.errBadId') : busy ? '' : loaded?.error ?? '';
  useEffect(() => {
    if (!projectId || badId) return;
    let cancelled = false;
    getRoomAssignments(projectId)
      .then((res) => {
        if (cancelled) return;
        setRooms(res.items);
        setDraft(Object.fromEntries(res.items.map((item) => [item.roomId, item.designerId])));
        setLoaded({ projectId, error: '' });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoaded({ projectId, error: loadErrorText(err, role) });
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, badId, role, reloadKey]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  // The API returns only the assigned rooms: the rest of the apartment's rooms are listed as unassigned.
  const rows = useMemo<RoomAssignment[]>(() => {
    const assigned = new Set(rooms.map((r) => r.roomId));
    const unassigned = (apartmentRooms ?? [])
      .filter((r) => !assigned.has(r.id))
      .map((r): RoomAssignment => ({ roomId: r.id, roomName: r.name, floorId: r.floorId, designerId: '', designerName: '' }));
    return [...rooms, ...unassigned];
  }, [rooms, apartmentRooms]);
  // A room can go to the Lead or any Member of the team.
  const options = [
    ...(leadDesignerId ? [{ id: leadDesignerId, name: leadName ?? leadDesignerId, isLead: true }] : []),
    ...(members ?? []).map((m) => ({ id: m.designerId, name: m.fullName, isLead: false })),
  ];
  const floorName = (floorId: string) => floors?.find((f) => f.id === floorId)?.name ?? floorId;

  // Only the rooms whose designer changed are sent, one entry per room; unassigning sends designerId: null.
  const changes: AssignRoomItem[] = rows
    .map((room) => ({ room, value: (draft[room.roomId] ?? '').trim() }))
    .filter(({ room, value }) => value !== room.designerId)
    .map(({ room, value }) => ({ roomId: room.roomId, designerId: value ? value : null }));
  // Moving a room off its designer discards that room's unmerged drafts: confirm first.
  const discardsDrafts = changes.some((c) => !!rows.find((r) => r.roomId === c.roomId)?.designerId);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const save = async () => {
    setConfirmOpen(false);
    if (changes.length === 0) return;
    setSaving(true);
    try {
      const res = await updateRoomAssignments(projectId, { assignments: changes });
      // the response carries the full list: it becomes the new state, no extra GET
      setRooms(res.items);
      setDraft(Object.fromEntries(res.items.map((item) => [item.roomId, item.designerId])));
      setToast({ type: 'success', message: t('projectDetail.roomAssign.saved') });
    } catch (err) {
      setToast({ type: 'error', message: saveErrorText(err) });
    } finally {
      setSaving(false);
    }
  };
  const handleSave = () => { if (discardsDrafts) setConfirmOpen(true); else void save(); };

  return (
    <div className="relative bg-surface rounded-2xl border border-line shadow-sm p-6">
      {toast && (
        <div
          role={toast.type === 'error' ? 'alert' : 'status'}
          className={`fixed right-4 top-4 z-[80] max-w-sm rounded-xl border px-4 py-3 text-sm font-medium shadow-lg ${
            toast.type === 'success'
              ? 'border-emerald-100 bg-emerald-50 text-emerald-800'
              : 'border-red-100 bg-red-50 text-red-700'
          }`}
        >
          {toast.message}
        </div>
      )}

      {confirmOpen && (
        <Modal
          title={t('projectDetail.roomAssign.confirmTitle')}
          onClose={() => setConfirmOpen(false)}
          footer={(
            <>
              <Button variant="secondary" onClick={() => setConfirmOpen(false)}>{t('common.cancel')}</Button>
              <Button variant="primary" onClick={() => void save()}>{t('projectDetail.roomAssign.confirm')}</Button>
            </>
          )}
        >
          <p className="text-sm text-slate-600">{t('projectDetail.roomAssign.confirmBody')}</p>
        </Modal>
      )}

      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DoorOpen size={16} className="text-subtext" />
          <h2 className="text-base font-bold text-ink">{t('projectDetail.roomAssignments')}</h2>
        </div>
        {!canEdit && (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-500">
            {t('projectDetail.roomAssign.viewOnly')}
          </span>
        )}
      </div>

      {busy && <p className="py-6 text-center text-xs text-subtext">{t('projectDetail.roomAssign.loading')}</p>}

      {!busy && shownError && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
          {shownError}
        </p>
      )}

      {!busy && !shownError && rows.length === 0 && (
        <p className="py-6 text-center text-xs text-subtext">{t('projectDetail.roomAssign.empty')}</p>
      )}

      {!busy && !shownError && rows.length > 0 && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-line text-[11px] font-bold text-subtext uppercase tracking-wider bg-sand-50/80">
                  <th className="py-3 px-4 rounded-l-xl">ROOM</th>
                  <th className="py-3 px-4">FLOOR</th>
                  <th className="py-3 px-4">ASSIGNED TO</th>
                  <th className="py-3 px-4 rounded-r-xl">REASSIGN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {rows.map((room) => (
                  <tr key={room.roomId} className="hover:bg-sand-50/50 transition">
                    <td className="py-3 px-4 font-bold text-ink">{room.roomName}</td>
                    <td className="py-3 px-4 text-slate-500 font-medium">{floorName(room.floorId)}</td>
                    <td className="py-3 px-4 text-slate-700 font-medium">{room.designerName || t('projectDetail.roomAssign.notAssigned')}</td>
                    <td className="py-3 px-4">
                      {canEdit ? (
                        <select
                          value={draft[room.roomId] ?? ''}
                          onChange={(e) => setDraft((d) => ({ ...d, [room.roomId]: e.target.value }))}
                          disabled={saving}
                          aria-label={t('projectDetail.roomAssign.reassign', { room: room.roomName })}
                          className="w-full min-w-[220px] rounded-lg border border-control bg-sand-100 px-2.5 py-1.5 text-xs font-medium text-ink focus:outline-none focus:ring-2 focus-visible:ring-brand"
                        >
                          <option value="">{t('projectDetail.roomAssign.notAssigned')}</option>
                          {options.map((o) => (
                            <option key={o.id} value={o.id}>{o.isLead ? t('projectDetail.roomAssign.leadOption', { name: o.name }) : o.name}</option>
                          ))}
                          {/* a designer who left the team but still holds the room stays selectable until changed */}
                          {room.designerId && !options.some((o) => o.id === room.designerId) && (
                            <option value={room.designerId}>{room.designerName || room.designerId}</option>
                          )}
                        </select>
                      ) : (
                        <span className="text-subtext">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {canEdit ? (
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || changes.length === 0}
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
                {saving ? t('projectDetail.roomAssign.saving') : t('projectDetail.roomAssign.save')}
              </button>
            </div>
          ) : (
            <p className="mt-4 text-[11px] font-medium text-subtext">
              {t('projectDetail.roomAssign.leadOnly')}
            </p>
          )}
        </>
      )}
    </div>
  );
};

export default RoomAssignmentsTab;
