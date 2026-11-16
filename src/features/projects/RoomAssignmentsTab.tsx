import React, { useEffect, useState } from 'react';
import { DoorOpen } from 'lucide-react';
import { getCurrentUser } from '@/services/authService';
import { errorText, t } from '@/i18n';
import {
  getRoomAssignments,
  updateRoomAssignments,
  type RoomAssignment,
} from '@/features/projects/projectApi';

interface RoomAssignmentsTabProps {
  projectId: string;
  /** user_id of the project's Lead Designer. */
  leadDesignerId: string | null;
}

/**
 * Room assignments of one project (GET/PUT /projects/{id}/room-assignments).
 * Only the project's Lead Designer can edit; every other role sees it view-only.
 */
export const RoomAssignmentsTab: React.FC<RoomAssignmentsTabProps> = ({ projectId, leadDesignerId }) => {
  const currentUser = getCurrentUser();
  const canEdit = currentUser?.role === 'designer' && !!leadDesignerId && currentUser.id === leadDesignerId;

  const [rooms, setRooms] = useState<RoomAssignment[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setLoadError('');
    getRoomAssignments(projectId)
      .then((res) => {
        if (cancelled) return;
        setRooms(res.items);
        setDraft(Object.fromEntries(res.items.map((item) => [item.roomId, item.designerId])));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(errorText(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await updateRoomAssignments(projectId, {
        assignments: rooms.map((room) => {
          const value = (draft[room.roomId] ?? '').trim();
          return { roomId: room.roomId, designerId: value ? value : null };
        }),
      });
      setRooms(res.items);
      setDraft(Object.fromEntries(res.items.map((item) => [item.roomId, item.designerId])));
      setToast({ type: 'success', message: 'Room assignments updated.' });
    } catch (err) {
      setToast({ type: 'error', message: errorText(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
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

      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DoorOpen size={16} className="text-slate-400" />
          <h2 className="text-base font-bold text-slate-900">{t('projectDetail.roomAssignments')}</h2>
        </div>
        {!canEdit && (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-500">
            View only
          </span>
        )}
      </div>

      {loading && <p className="py-6 text-center text-xs text-slate-400">Loading rooms…</p>}

      {!loading && loadError && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
          {loadError}
        </p>
      )}

      {!loading && !loadError && rooms.length === 0 && (
        <p className="py-6 text-center text-xs text-slate-400">This project has no rooms yet.</p>
      )}

      {!loading && !loadError && rooms.length > 0 && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/80">
                  <th className="py-3 px-4 rounded-l-xl">ROOM</th>
                  <th className="py-3 px-4">FLOOR</th>
                  <th className="py-3 px-4">ASSIGNED TO</th>
                  <th className="py-3 px-4 rounded-r-xl">REASSIGN (DESIGNER ID)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {rooms.map((room) => (
                  <tr key={room.roomId} className="hover:bg-slate-50/50 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">{room.roomName}</td>
                    <td className="py-3 px-4 text-slate-500 font-medium">{room.floorId}</td>
                    <td className="py-3 px-4 text-slate-700 font-medium">{room.designerName || 'Not assigned'}</td>
                    <td className="py-3 px-4">
                      {canEdit ? (
                        <input
                          type="text"
                          value={draft[room.roomId] ?? ''}
                          onChange={(e) => setDraft((d) => ({ ...d, [room.roomId]: e.target.value }))}
                          disabled={saving}
                          placeholder="Designer UUID, empty = unassign"
                          className="w-full min-w-[220px] rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                        />
                      ) : (
                        <span className="text-slate-400">—</span>
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
                onClick={() => void handleSave()}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
                {saving ? 'Saving…' : 'Save room assignments'}
              </button>
            </div>
          ) : (
            <p className="mt-4 text-[11px] font-medium text-slate-400">
              Only the project's Lead Designer can change room assignments.
            </p>
          )}
        </>
      )}
    </div>
  );
};

export default RoomAssignmentsTab;
