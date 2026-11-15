import React, { useEffect, useState } from 'react';
import { DoorOpen } from 'lucide-react';
import { ApiError, getCurrentUser } from '@/services/authService';
import {
  getRoomAssignments,
  updateRoomAssignments,
  type RoomAssignment,
} from '@/features/projects/services/projectsApi';

interface RoomAssignmentsTabProps {
  projectId: string;
  /** user_id của Lead Designer hiện tại của dự án (ProjectResponse.designerId). */
  leadDesignerId: string | null;
}

/**
 * Khảo sát & phân công phòng cho một dự án (GET/PUT /projects/{id}/room-assignments).
 * Chỉ Lead Designer của dự án mới chỉnh sửa được; mọi role khác ở chế độ view-only.
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
        setLoadError(err instanceof ApiError ? err.message : 'Không tải được danh sách phòng.');
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
      setToast({ type: 'success', message: 'Cập nhật phân công phòng thành công!' });
    } catch (err) {
      let message = 'Có lỗi xảy ra. Vui lòng thử lại.';
      if (err instanceof ApiError) {
        if (err.status === 403 && err.code === 'INSUFFICIENT_ROLE') {
          message = 'Chỉ Lead Designer của dự án mới có quyền phân công phòng.';
        } else if (err.status === 422 && err.code === 'ROOM_NOT_IN_APARTMENT') {
          message = 'Phòng không thuộc căn hộ của dự án.';
        } else if (err.status === 422 && err.code === 'DESIGNER_NOT_IN_PROJECT') {
          message = 'Designer được chọn không thuộc đội ngũ dự án.';
        } else {
          message = err.message;
        }
      }
      setToast({ type: 'error', message });
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
          <h2 className="text-base font-bold text-slate-900">Room assignments</h2>
        </div>
        {!canEdit && (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-500">
            Chế độ chỉ xem
          </span>
        )}
      </div>

      {loading && <p className="py-6 text-center text-xs text-slate-400">Đang tải danh sách phòng…</p>}

      {!loading && loadError && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
          {loadError}
        </p>
      )}

      {!loading && !loadError && rooms.length === 0 && (
        <p className="py-6 text-center text-xs text-slate-400">Dự án chưa có phòng nào.</p>
      )}

      {!loading && !loadError && rooms.length > 0 && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/80">
                  <th className="py-3 px-4 rounded-l-xl">ROOM</th>
                  <th className="py-3 px-4">FLOOR</th>
                  <th className="py-3 px-4">ĐANG PHỤ TRÁCH</th>
                  <th className="py-3 px-4 rounded-r-xl">PHÂN CÔNG (DESIGNER ID)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {rooms.map((room) => (
                  <tr key={room.roomId} className="hover:bg-slate-50/50 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">{room.roomName}</td>
                    <td className="py-3 px-4 text-slate-500 font-medium">{room.floorId}</td>
                    <td className="py-3 px-4 text-slate-700 font-medium">{room.designerName || '— chưa giao —'}</td>
                    <td className="py-3 px-4">
                      {canEdit ? (
                        <input
                          type="text"
                          value={draft[room.roomId] ?? ''}
                          onChange={(e) => setDraft((d) => ({ ...d, [room.roomId]: e.target.value }))}
                          disabled={saving}
                          placeholder="UUID — để trống = bỏ giao"
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
                {saving ? 'Đang lưu…' : 'Lưu phân công phòng'}
              </button>
            </div>
          ) : (
            <p className="mt-4 text-[11px] font-medium text-slate-400">
              Chỉ Lead Designer của dự án mới có quyền chỉnh sửa phân công phòng.
            </p>
          )}
        </>
      )}
    </div>
  );
};

export default RoomAssignmentsTab;
