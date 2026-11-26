import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Avatar, Card, ErrorState, Skeleton, avatarLabels } from '@/components/ui';
import { membersErrorText, projectApi } from '@/features/projects/projectApi';
import type { ProjectTeam } from '@/features/projects/projectApi';
import { t } from '@/i18n';
import type { Project, Role } from './types';

export function TeamRow({ id, name, label, sub, action }: { id: string; name: string; label?: string; sub: ReactNode; action?: ReactNode }) {
  return (
    <li className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
      <Avatar id={id} name={name} label={label} size="md" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">{name}</p>
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
  /** Bump to fetch GET /projects/:id/team again (after Staff saved the team). */
  reloadKey?: number;
}

/**
 * Design team of a project, read-only for everyone: Staff and Admin choose the team on the project page
 * (DesignTeamCard, PUT /projects/:id/team); designers, the Lead included, only see it.
 */
export function TeamCard({ project, role, bare = false, reloadKey = 0 }: Props) {
  const homeowner = role === 'homeowner';
  const [team, setTeam] = useState<ProjectTeam | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    if (homeowner) return;
    setError('');
    try { setTeam(await projectApi.getTeam(project.id)); } catch (e) { setError(membersErrorText(e, role)); }
  }, [homeowner, project.id, role]);
  useEffect(() => { Promise.resolve().then(load); }, [load, reloadKey]);

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
                <TeamRow key={m.userId} id={m.userId} name={m.name} label={avatars[m.userId]} sub={subOf(t('team.member'), m.assignedRooms)} />
              ))}
            </ul>
            {!shown.members.length && <p className="mt-2 text-xs text-slate-500">{t('team.noMembers')}</p>}
          </>
        )}
      {/* designers (the Lead included) never manage the team */}
      {role === 'designer' && <p className="mt-3 border-t border-line pt-3 text-xs text-slate-500">{t('team.managedByStaff')}</p>}
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
