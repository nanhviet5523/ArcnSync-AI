import { useCallback, useEffect, useState } from 'react';
import { Avatar, Banner, Button, ErrorState, Field, Modal, Select, Skeleton, avatarLabels } from '@/components/ui';
import { errorText, t } from '@/i18n';
import { can, leavingWithRooms, teamErrorText, teamOptions } from '@/features/design-workspace/logic';
import { TeamRow } from '@/features/design-workspace/TeamCard';
import type { Role } from '@/features/design-workspace/types';
import { projectApi } from './projectApi';
import type { DesignerOption, Project, ProjectTeam } from './projectApi';

interface Props {
  project: Project;
  role: Role;
  /** GET /users/designers?available=true; null while loading. */
  designers: DesignerOption[] | null;
  /** The project changed (its Lead), reload it. */
  onSaved: () => void;
}

const sameSet = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((x) => b.includes(x));
const workload = (d: DesignerOption) => (d.isAvailable ? t('team.activeProjects', { n: d.activeProjectCount }) : t('team.notTakingProjects'));

/** Staff and Admin choose the Lead and the Members of a project (PUT /projects/:id/team). */
export function DesignTeamCard({ project, role, designers, onSaved }: Props) {
  const [team, setTeam] = useState<ProjectTeam | null>(null);
  const [loadError, setLoadError] = useState('');
  const [leadId, setLeadId] = useState('');
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [confirm, setConfirm] = useState<{ name: string; rooms: string[] }[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [reassigned, setReassigned] = useState<string[]>([]);
  // the backend said this viewer may not change the team: hide the controls
  const [forbidden, setForbidden] = useState(false);

  const show = useCallback((next: ProjectTeam) => {
    setTeam(next);
    setLeadId(next.lead?.userId ?? '');
    setMemberIds(next.members.map((m) => m.userId));
  }, []);
  const load = useCallback(async () => {
    setLoadError('');
    try { show(await projectApi.getTeam(project.id)); } catch (e) { setLoadError(errorText(e)); }
  }, [project.id, show]);
  useEffect(() => { Promise.resolve().then(load); }, [load]);

  const closed = project.status === 'COMPLETED' || project.status === 'CANCELLED';
  const editable = can('manageTeam', { role, version: null, project }).ok && !forbidden;
  const savedLead = team?.lead?.userId ?? '';
  const savedMembers = team?.members.map((m) => m.userId) ?? [];
  const dirty = !!team && (leadId !== savedLead || !sameSet(memberIds, savedMembers));
  const people = team ? [...(team.lead ? [team.lead] : []), ...team.members] : [];
  const roomsOf = new Map(people.map((p) => [p.userId, p.assignedRooms.map((r) => r.name)]));
  const options = teamOptions(designers ?? [], team);
  const avatars = avatarLabels(options.map((d) => ({ id: d.id, name: d.fullName })));
  // a new Lead must be taking projects; the current one stays selectable
  const leadOptions = options.filter((d) => d.isAvailable || d.id === savedLead);
  const memberOptions = options.filter((d) => d.id !== leadId);

  const pickLead = (id: string) => {
    setLeadId(id);
    setMemberIds((ms) => {
      const next = ms.filter((m) => m !== id);
      // like PUT /designer: the Lead being replaced stays on as a Member unless Staff unticks them
      return savedLead && id !== savedLead && !next.includes(savedLead) ? [...next, savedLead] : next;
    });
  };
  const toggle = (id: string, on: boolean) => setMemberIds((ms) => (on ? [...ms, id] : ms.filter((m) => m !== id)));

  const save = async (confirmed = false) => {
    const leaving = leavingWithRooms(team, leadId, memberIds);
    if (leaving.length && !confirmed) { setConfirm(leaving); return; }
    setBusy(true); setSaveError(''); setReassigned([]);
    try {
      const res = await projectApi.updateTeam(project.id, { leadId, memberIds });
      show({ lead: res.lead, members: res.members });
      setReassigned(res.reassignedRooms.map((r) => r.roomName));
      setConfirm(null);
      onSaved();
    } catch (e) {
      setConfirm(null);
      if ((e as { code?: string }).code === 'TEAM_MANAGED_BY_STAFF') setForbidden(true);
      else setSaveError(teamErrorText(e));
    } finally { setBusy(false); }
  };

  const heading = <h3 className="mb-2 text-[13px] font-medium text-slate-700">{t('team.designTeam')}</h3>;
  if (loadError) return <section>{heading}<ErrorState message={loadError} onRetry={load} /></section>;
  if (!team || (editable && !designers)) {
    return <section>{heading}<div className="space-y-2"><Skeleton className="h-9 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div></section>;
  }

  const sub = (label: string, id: string) => {
    const rooms = roomsOf.get(id) ?? [];
    return rooms.length ? `${label} · ${rooms.join(', ')}` : label;
  };
  if (!editable) {
    return (
      <section>
        {heading}
        {people.length ? (
          <ul className="divide-y divide-slate-100">
            {team.lead && <TeamRow id={team.lead.userId} name={team.lead.name} label={avatars[team.lead.userId]} sub={sub(t('team.lead'), team.lead.userId)} />}
            {team.members.map((m) => <TeamRow key={m.userId} id={m.userId} name={m.name} label={avatars[m.userId]} sub={sub(t('team.member'), m.userId)} />)}
          </ul>
        ) : <p className="text-sm text-slate-500">{t('projectDetail.notAssigned')}</p>}
        {closed && <p className="mt-3 text-xs text-slate-500">{t('team.closed')}</p>}
      </section>
    );
  }

  return (
    <section>
      {heading}
      {!!reassigned.length && <div className="mb-3"><Banner tone="amber">{t('team.reassigned', { rooms: reassigned.join(', ') })}</Banner></div>}

      <Field label={t('team.lead')}>
        {(f) => (
          <Select {...f} value={leadId} onChange={(e) => pickLead(e.target.value)}>
            <option value="" disabled>{leadOptions.length ? t('team.chooseLead') : t('projectDetail.noDesigners')}</option>
            {leadOptions.map((d) => <option key={d.id} value={d.id}>{d.fullName} · {workload(d)}</option>)}
          </Select>
        )}
      </Field>

      <fieldset className="mt-4">
        <legend className="mb-1.5 text-[13px] font-medium text-slate-700">{t('team.members')}</legend>
        {memberOptions.length ? (
          <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-line">
            {memberOptions.map((d) => {
              const rooms = roomsOf.get(d.id) ?? [];
              const on = memberIds.includes(d.id);
              return (
                <li key={d.id}>
                  <label className={`flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-slate-50 ${on ? 'bg-brand-soft/60' : ''}`}>
                    <input type="checkbox" checked={on} onChange={(e) => toggle(d.id, e.target.checked)} className="h-4 w-4 shrink-0 rounded border-slate-300 accent-brand" />
                    <Avatar id={d.id} name={d.fullName} label={avatars[d.id]} size="md" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-900">{d.fullName}</span>
                      <span className="block truncate text-xs text-slate-500">{d.email}</span>
                      {!!rooms.length && <span className="block truncate text-xs text-slate-600">{t('team.holds', { rooms: rooms.join(', ') })}</span>}
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-slate-500">{workload(d)}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        ) : <p className="text-sm text-slate-500">{t('team.noOtherDesigners')}</p>}
      </fieldset>

      {saveError && <div className="mt-3"><ErrorState message={saveError} /></div>}
      <div className="mt-4 flex justify-end">
        <Button disabled={!dirty || !leadId} loading={busy && !confirm} onClick={() => save()}>{t('team.save')}</Button>
      </div>

      {confirm && (
        <Modal title={t('team.leaveTitle')} onClose={() => setConfirm(null)} footer={<>
          <Button onClick={() => setConfirm(null)}>{t('common.cancel')}</Button>
          <Button variant="primary" loading={busy} onClick={() => save(true)}>{t('team.leaveConfirm')}</Button>
        </>}>
          <div className="space-y-2 text-sm text-slate-700">
            {confirm.map((p) => <p key={p.name}>{t('team.leaveBody', { name: p.name, rooms: p.rooms.join(', ') })}</p>)}
          </div>
        </Modal>
      )}
    </section>
  );
}
