import { useCallback, useEffect, useState } from 'react';
import { Button, ErrorState, Field, Modal, Select, Skeleton, avatarLabels } from '@/components/ui';
import { errorText, t } from '@/i18n';
import { can, teamOptions } from '@/features/design-workspace/logic';
import { TeamRow } from '@/features/design-workspace/TeamCard';
import type { Role } from '@/features/design-workspace/types';
import { assignLeadDesigner, membersErrorText, projectApi } from './projectApi';
import type { DesignerOption, Project, ProjectTeam } from './projectApi';
import type { ContractToast } from './CreateContractModal';

interface Props {
  project: Project;
  role: Role;
  /** GET /users/designers?available=true; null while loading. */
  designers: DesignerOption[] | null;
  /** The Lead changed: reload the project and its room assignments. */
  onSaved: () => void;
  onToast: (toast: ContractToast) => void;
}

const workload = (d: DesignerOption) => (d.isAvailable ? t('team.activeProjects', { n: d.activeProjectCount }) : t('team.notTakingProjects'));

const LEAD_ERRORS: Record<string, string> = {
  DESIGNER_NOT_FOUND: 'team.errDesignerNotFound',
  USER_NOT_ACTIVE: 'team.errUserNotActive',
  DESIGNER_NOT_AVAILABLE: 'team.errNotAvailable',
  PROJECT_CLOSED: 'team.errProjectClosed',
  PROJECT_NOT_FOUND: 'team.errProjectNotFound',
};

/**
 * Staff and Admin set or change the Lead (PUT /projects/:id/designer). Members and rooms are the Lead's to
 * manage, so here they are read-only.
 */
export function DesignTeamCard({ project, role, designers, onSaved, onToast }: Props) {
  const [team, setTeam] = useState<ProjectTeam | null>(null);
  const [loadError, setLoadError] = useState('');
  const [leadId, setLeadId] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoadError('');
    try {
      const next = await projectApi.getTeam(project.id);
      setTeam(next);
      setLeadId(next.lead?.userId ?? '');
    } catch (e) { setLoadError(membersErrorText(e, role)); }
  }, [project.id, role]);
  useEffect(() => { Promise.resolve().then(load); }, [load]);

  const closed = project.status === 'COMPLETED' || project.status === 'CANCELLED';
  const editable = can('manageTeam', { role, version: null, project }).ok;
  const savedLead = team?.lead?.userId ?? '';
  const people = team ? [...(team.lead ? [team.lead] : []), ...team.members] : [];
  const roomsOf = new Map(people.map((p) => [p.userId, p.assignedRooms.map((r) => r.name)]));
  const options = teamOptions(designers ?? [], team);
  const avatars = avatarLabels(options.map((d) => ({ id: d.id, name: d.fullName })));
  // a new Lead must be taking projects; the current one stays selectable
  const leadOptions = options.filter((d) => d.isAvailable || d.id === savedLead);

  const save = async () => {
    setConfirm(false);
    setBusy(true);
    try {
      await assignLeadDesigner(project.id, { designerId: leadId });
      onToast({ tone: 'success', message: t('team.leadAssigned') });
      await load();
      onSaved();
    } catch (e) {
      const key = LEAD_ERRORS[(e as { code?: string } | null)?.code ?? ''];
      onToast({ tone: 'error', message: key ? t(key) : errorText(e) });
    } finally { setBusy(false); }
  };
  // Replacing a Lead removes them from the project: confirm first. A first Lead is assigned straight away.
  const submit = () => { if (savedLead && leadId !== savedLead) setConfirm(true); else void save(); };

  const heading = <h3 className="mb-2 text-[13px] font-medium text-slate-700">{t('team.designTeam')}</h3>;
  if (loadError) return <section>{heading}<ErrorState message={loadError} onRetry={load} /></section>;
  if (!team || (editable && !designers)) {
    return <section>{heading}<div className="space-y-2"><Skeleton className="h-9 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div></section>;
  }

  const sub = (label: string, id: string) => {
    const rooms = roomsOf.get(id) ?? [];
    return rooms.length ? `${label} · ${rooms.join(', ')}` : label;
  };
  const memberRows = team.members.map((m) => <TeamRow key={m.userId} id={m.userId} name={m.name} label={avatars[m.userId]} sub={sub(t('team.member'), m.userId)} />);

  if (!editable) {
    return (
      <section>
        {heading}
        {people.length ? (
          <ul className="divide-y divide-slate-100">
            {team.lead && <TeamRow id={team.lead.userId} name={team.lead.name} label={avatars[team.lead.userId]} sub={sub(t('team.lead'), team.lead.userId)} />}
            {memberRows}
          </ul>
        ) : <p className="text-sm text-slate-500">{t('projectDetail.notAssigned')}</p>}
        {closed && <p className="mt-3 text-xs text-slate-500">{t('team.closed')}</p>}
      </section>
    );
  }

  return (
    <section>
      {heading}

      <Field label={t('team.lead')}>
        {(f) => (
          <Select {...f} value={leadId} onChange={(e) => setLeadId(e.target.value)}>
            <option value="" disabled>{leadOptions.length ? t('team.chooseLead') : t('projectDetail.noDesigners')}</option>
            {leadOptions.map((d) => <option key={d.id} value={d.id}>{d.fullName} · {workload(d)}</option>)}
          </Select>
        )}
      </Field>
      <div className="mt-3 flex justify-end">
        <Button disabled={!leadId || leadId === savedLead} loading={busy && !confirm} onClick={submit}>{t('team.assignLead')}</Button>
      </div>

      <div className="mt-4">
        <h4 className="mb-1.5 text-[13px] font-medium text-slate-700">{t('team.members')}</h4>
        {memberRows.length ? <ul className="divide-y divide-slate-100">{memberRows}</ul> : <p className="text-sm text-slate-500">{t('team.noMembers')}</p>}
        <p className="mt-2 text-xs text-slate-500">{t('team.membersByLead')}</p>
      </div>

      {confirm && (
        <Modal title={t('team.changeLeadTitle')} onClose={() => setConfirm(false)} footer={<>
          <Button onClick={() => setConfirm(false)}>{t('common.cancel')}</Button>
          <Button variant="primary" loading={busy} onClick={() => void save()}>{t('team.changeLeadConfirm')}</Button>
        </>}>
          <p className="text-sm text-slate-700">{t('team.changeLeadBody')}</p>
        </Modal>
      )}
    </section>
  );
}
