import { useCallback, useMemo, useState } from 'react';
import type { RoomAssignment } from '@/features/projects/projectApi';
import { draftChangeCount, draftPatches, memberDraftRows, mergePatches } from './roomDrafts';
import type { Patches } from './roomDrafts';
import type { DesignVersion, ProjectRole, RoomDraft } from './types';

/**
 * Who has which room and the per-room drafts of the version on screen.
 * `local` is what the viewer has changed and not saved yet. It stays in the page, where the Lead's edits always lived.
 */
export function useRoomWork({ viewerId, projectRole, version, local }: { viewerId: string; projectRole: ProjectRole | null; version: DesignVersion | null; local: Patches }) {
  const [assignments, setAssignments] = useState<RoomAssignment[]>([]);
  const [drafts, setDrafts] = useState<RoomDraft[]>([]);
  /** Drafts of the newest version, read while a Member sits on an older one: only for what was dropped. */
  const [latestDrafts, setLatestDrafts] = useState<RoomDraft[]>([]);
  /** Comment ticks changed on this page, by room; rooms not listed use what the draft holds. */
  const [ticks, setTicks] = useState<Record<string, string[]>>({});
  const [previewId, setPreviewId] = useState<string | null>(null);
  const member = projectRole === 'MEMBER';

  const assignedRoomIds = useMemo(() => assignments.filter((a) => a.designerId === viewerId).map((a) => a.roomId), [assignments, viewerId]);
  const ownerOf = useMemo(() => new Map(assignments.map((a) => [a.roomId, a])), [assignments]);
  const previewDraft = drafts.find((d) => d.id === previewId) ?? null;
  /** Lead: drafts that came with a room taken over. They are the Lead's own work, not something to review. */
  const ownDrafts = useMemo(() => (member ? [] : drafts.filter((d) => d.designer_id === viewerId && draftChangeCount(d) > 0)), [member, drafts, viewerId]);
  const reviewDrafts = useMemo(() => drafts.filter((d) => d.designer_id !== viewerId), [drafts, viewerId]);
  const readyDrafts = useMemo(() => reviewDrafts.filter((d) => d.status === 'READY'), [reviewDrafts]);
  /** Lead: everything that is their own change, saved in a taken-over draft or still unsaved on this page. */
  const leadWork = useMemo(() => mergePatches(draftPatches(ownDrafts), local), [ownDrafts, local]);

  /** What the canvas shows on top of the version: a Member's own work, or the draft the Lead is previewing. */
  const patches = useMemo(() => {
    if (member) return mergePatches(draftPatches(drafts), local);
    return previewDraft ? mergePatches(leadWork, draftPatches([previewDraft])) : leadWork;
  }, [member, drafts, local, leadWork, previewDraft]);

  const memberRows = useMemo(() => {
    if (!member || !version) return [];
    const roomNames = Object.fromEntries(version.floors.flatMap((f) => f.scene_json.rooms.flatMap((r) => (r.room_id ? [[r.room_id, r.name]] : []))));
    return memberDraftRows({ elements: version.elements, drafts, local, ticks, roomNames });
  }, [member, version, drafts, local, ticks]);

  const isTicked = (roomId: string, commentId: string) => (ticks[roomId] ?? drafts.find((d) => d.room_id === roomId)?.addressed_comment_ids ?? []).includes(commentId);
  const setTick = (roomId: string, commentId: string, on: boolean) => setTicks((m) => {
    const now = m[roomId] ?? drafts.find((d) => d.room_id === roomId)?.addressed_comment_ids ?? [];
    return { ...m, [roomId]: on ? [...new Set([...now, commentId])] : now.filter((x) => x !== commentId) };
  });
  const clearRoomTicks = (roomId: string) => setTicks(({ [roomId]: _gone, ...rest }) => rest);
  const resetForVersion = useCallback(() => { setTicks({}); setPreviewId(null); }, []);

  return {
    assignments, setAssignments, drafts, setDrafts, latestDrafts, setLatestDrafts, assignedRoomIds, ownerOf, previewId, setPreviewId, previewDraft, readyDrafts, ownDrafts, reviewDrafts, leadWork,
    patches, memberRows, memberDirty: memberRows.filter((r) => r.dirty).length, isTicked, setTick, clearRoomTicks, resetForVersion,
  };
}
