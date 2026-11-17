import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Avatar, Button, Card, ErrorState, Field, Input, Modal, Skeleton, avatarLabels } from '@/components/ui';
import { addMemberErrorText, addProjectMember, getInvitableDesigners, invitableErrorText, membersErrorText, projectApi, removeMemberErrorText, removeProjectMember } from '@/features/projects/projectApi';
import type { InvitableDesignerItem as InvitableDesigner, ProjectMember, ProjectTeam } from '@/features/projects/projectApi';
import { t } from '@/i18n';
import type { Project, Role } from './types';

export function TeamRow({ id, name, label, sub, action }: { id: string; name: string; label?: string; sub: ReactNode; action?: ReactNode }) {
  return (
    <li className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
      <Avatar id={id} name={name} label={label} size="md" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
        <p className="truncate text-xs text-slate-500">{sub}</p>
      </div>
      {action}
    </li>
  );
}

/** "Lead · Bedroom 1, Bedroom 2" */
const subOf = (role: string, rooms?: { name: string }[]) => (rooms?.length ? `${role} · ${rooms.map((r) => r.name).join(', ')}` : role);

/** The team as the homeowner has always seen it: from the project, without rooms (GET /team is not theirs). */
const fromProject = (p: Project): ProjectTeam => ({
  lead: p.designer ? { userId: p.designer.id, name: p.designer.fullName, email: p.designer.email ?? '', avatar: null, addedAt: null, assignedRooms: [] } : null,
  members: (p.members ?? []).map((m) => ({ userId: m.designerId, name: m.fullName, email: m.email, avatar: null, addedAt: m.addedAt, assignedRooms: [] })),
});

interface Props {
  project: Project;
  role: Role;
  /** Inside another card: a small heading instead of its own card. */
  bare?: boolean;
  /** Given where the Lead may add Members (the project page): their success and error toasts. */
  onToast?: (toast: { tone: 'success' | 'warning' | 'error'; message: string }) => void;
  /** A Member was added (append it), or the team may be stale (no argument: reload the project). */
  onTeamChange?: (added?: ProjectMember) => void;
}

/** Design team of a project, view only. Staff choose the team on the project page (DesignTeamCard). */
export function TeamCard({ project, role, bare = false, onToast, onTeamChange }: Props) {
  const homeowner = role === 'homeowner';
  const [team, setTeam] = useState<ProjectTeam | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    if (homeowner) return;
    setError('');
    try { setTeam(await projectApi.getTeam(project.id)); } catch (e) { setError(membersErrorText(e, role)); }
  }, [homeowner, project.id, role]);
  useEffect(() => { Promise.resolve().then(load); }, [load]);
  // Add/remove member: Staff and Admin (the backend answers 403 to anyone else), only where toasts can be shown.
  const closed = project.status === 'COMPLETED' || project.status === 'CANCELLED';
  // they see the buttons; they are disabled once the project is closed
  const canManage = (role === 'staff' || role === 'admin') && !!onToast;
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState('');
  /** q after 300 ms without typing: what is searched. */
  const [searchQ, setSearchQ] = useState('');
  const [attempt, setAttempt] = useState(0);
  /** The result of the last search, tagged with the query it answers. */
  const [found, setFound] = useState<{ q: string; attempt: number; items: InvitableDesigner[]; error: string } | null>(null);
  const [pick, setPick] = useState('');
  const [saving, setSaving] = useState(false);
  const openAdd = () => { setAdding(true); setQ(''); setSearchQ(''); setPick(''); setFound(null); };

  useEffect(() => {
    const timer = setTimeout(() => setSearchQ(q.trim()), 300);
    return () => clearTimeout(timer);
  }, [q]);
  useEffect(() => {
    if (!adding) return;
    let cancelled = false;
    getInvitableDesigners(project.id, searchQ)
      .then((items) => { if (!cancelled) setFound({ q: searchQ, attempt, items, error: '' }); })
      .catch((e: unknown) => {
        if (cancelled) return;
        const message = invitableErrorText(e);
        setFound({ q: searchQ, attempt, items: [], error: message });
        onToast?.({ tone: 'error', message });
      });
    return () => { cancelled = true; };
  }, [adding, project.id, searchQ, attempt, onToast]);
  const searching = !found || found.q !== searchQ || found.attempt !== attempt;
  const choices = found?.items ?? [];
  // the chosen designer must still be in the current results (a new search may drop them)
  const picked = !searching && choices.some((d) => d.id === pick);
  const choiceAvatars =avatarLabels(choices.map((d) => ({ id: d.id, name: d.fullName })));
  const add = async () => {
    if (!picked || saving) return;
    // the item's id is the designerId of POST /members
    setSaving(true);
    try {
      const member = await addProjectMember(project.id, { designerId: pick });
      // the new Member goes last, as the list is ordered by addedAt
      setTeam((tm) => (tm ? { ...tm, members: [...tm.members, { userId: member.designerId, name: member.fullName, email: member.email, avatar: null, addedAt: member.addedAt, assignedRooms: [] }] } : tm));
      setAdding(false);
      onToast?.({ tone: 'success', message: t('team.memberAdded') });
      onTeamChange?.(member);
    } catch (e) {
      const exists = (e as { code?: string } | null)?.code === 'PROJECT_MEMBER_EXISTS';
      onToast?.({ tone: exists ? 'warning' : 'error', message: addMemberErrorText(e) });
      if (exists) { setAdding(false); void load(); onTeamChange?.(); }
    } finally { setSaving(false); }
  };

  // Remove member (Staff/Admin): confirm, then reload the members and the room assignments.
  const [toRemove, setToRemove] = useState<{ id: string; name: string } | null>(null);
  const [removing, setRemoving] = useState('');
  const remove = async (designerId: string) => {
    if (removing) return;
    setRemoving(designerId);
    try {
      await removeProjectMember(project.id, designerId);
      onToast?.({ tone: 'success', message: t('team.memberRemoved') });
    } catch (e) {
      const gone = (e as { code?: string } | null)?.code === 'PROJECT_MEMBER_NOT_FOUND';
      onToast?.({ tone: gone ? 'warning' : 'error', message: removeMemberErrorText(e) });
      if (!gone) return;
    } finally {
      setRemoving('');
      setToRemove(null);
    }
    // getTeam fetches GET /members and GET /room-assignments again; the page reloads the project and its rooms tab
    await load();
    onTeamChange?.();
  };

  // the homeowner's list follows the project as before
  const shown = homeowner ? fromProject(project) : team;

  const people = shown ? [...(shown.lead ? [shown.lead] : []), ...shown.members] : [];
  const avatars = avatarLabels(people.map((p) => ({ id: p.userId, name: p.name })));
  const body = (
    <>
      {error ? <ErrorState message={error} onRetry={load} />
        : !shown ? <div className="space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
        : (
          <>
            <ul className="divide-y divide-slate-100">
              {shown.lead && <TeamRow id={shown.lead.userId} name={shown.lead.name} label={avatars[shown.lead.userId]} sub={subOf(t('team.lead'), shown.lead.assignedRooms)} />}
              {shown.members.map((m) => (
                <TeamRow key={m.userId} id={m.userId} name={m.name} label={avatars[m.userId]} sub={subOf(t('team.member'), m.assignedRooms)}
                  action={canManage && !closed ? (
                    <Button variant="ghost" size="sm" aria-label={t('team.removeMemberAria', { name: m.name })}
                      loading={removing === m.userId} disabled={!!removing} onClick={() => setToRemove({ id: m.userId, name: m.name })}>
                      {t('team.removeMember')}
                    </Button>
                  ) : undefined} />
              ))}
            </ul>
            {!shown.members.length && <p className="mt-2 text-xs text-slate-500">{t('team.noMembers')}</p>}
          </>
        )}
      {canManage && shown && <div className="mt-3 flex justify-end"><Button disabled={closed} title={closed ? t('team.addErrClosed') : undefined} onClick={openAdd}>{t('team.addMember')}</Button></div>}
      {role === 'designer' && <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">{t('team.managedByStaff')}</p>}
      {toRemove && (
        <Modal title={t('team.removeTitle')} onClose={() => { if (!removing) setToRemove(null); }} footer={<>
          <Button onClick={() => setToRemove(null)} disabled={!!removing}>{t('common.cancel')}</Button>
          <Button variant="danger" loading={!!removing} onClick={() => void remove(toRemove.id)}>{t('team.removeConfirm')}</Button>
        </>}>
          <p className="text-sm text-slate-700">{t('team.removeBody', { fullName: toRemove.name })}</p>
        </Modal>
      )}
      {adding && (
        <Modal title={t('team.addMemberTitle')} onClose={() => { if (!saving) setAdding(false); }} footer={<>
          <Button onClick={() => setAdding(false)} disabled={saving}>{t('common.cancel')}</Button>
          <Button variant="primary" loading={saving} disabled={!picked || saving} onClick={() => void add()}>{t('team.addMember')}</Button>
        </>}>
          <Field label={t('team.searchDesigner')}>
            {(f) => <Input {...f} type="search" maxLength={100} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('team.searchDesignerPlaceholder')} />}
          </Field>
          <div className="mt-3">
            {searching ? <div className="space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
              : found?.error ? <ErrorState message={found.error} onRetry={() => setAttempt((n) => n + 1)} />
              : choices.length === 0 ? <p className="text-sm text-slate-500">{t('team.noInvitable')}</p>
              : (
                <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-line">
                  {choices.map((d) => {
                    const on = pick === d.id;
                    return (
                      <li key={d.id}>
                        <label className={`flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-slate-50 ${on ? 'bg-brand-soft/60' : ''}`}>
                          <input type="radio" name="invite-designer" checked={on} onChange={() => setPick(d.id)} className="h-4 w-4 shrink-0 rounded border-slate-300 accent-brand" />
                          {/* avatarUrl is always null: initials */}
                          <Avatar id={d.id} name={d.fullName} label={choiceAvatars[d.id]} size="md" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-slate-900">{d.fullName}</span>
                            <span className="block truncate text-xs text-slate-500">{d.email}</span>
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
          </div>
        </Modal>
      )}
    </>
  );
  if (!bare) return <Card title={t('team.title')}>{body}</Card>;
  return (
    <section>
      <h3 className="mb-2 text-[13px] font-medium text-slate-700">{t('team.title')}</h3>
      {body}
    </section>
  );
}
