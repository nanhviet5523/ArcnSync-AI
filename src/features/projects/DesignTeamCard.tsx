import { useCallback, useEffect, useMemo, useState } from 'react';
import { Avatar, Button, ErrorState, Field, Input, Modal, Select, Skeleton, avatarLabels } from '@/components/ui';
import { t } from '@/i18n';
import { can, teamOptions } from '@/features/design-workspace/logic';
import { TeamRow } from '@/features/design-workspace/TeamCard';
import type { Role } from '@/features/design-workspace/types';
import { membersErrorText, projectApi, teamErrorText } from './projectApi';
import type { DesignerOption, Project, ProjectTeam } from './projectApi';
import type { ContractToast } from './CreateContractModal';

interface Props {
  project: Project;
  role: Role;
  /** GET /users/designers?available=true; null while loading. */
  designers: DesignerOption[] | null;
  /** The team changed: reload the project and its room assignments. */
  onSaved: () => void;
  onToast: (toast: ContractToast) => void;
}

const workload = (d: DesignerOption) => (d.isAvailable ? t('team.activeProjects', { n: d.activeProjectCount }) : t('team.notTakingProjects'));

/**
 * Staff and Admin choose the whole design team, the Lead and the Members, and save it with
 * PUT /projects/:id/team. Designers never manage the team (TeamCard is read-only for them).
 */
export function DesignTeamCard({ project, role, designers, onSaved, onToast }: Props) {
  const [team, setTeam] = useState<ProjectTeam | null>(null);
  const [loadError, setLoadError] = useState('');
  const [leadId, setLeadId] = useState('');
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setLoadError('');
    try {
      const next = await projectApi.getTeam(project.id);
      setTeam(next);
      setLeadId(next.lead?.userId ?? '');
      setMemberIds(next.members.map((m) => m.userId));
    } catch (e) { setLoadError(membersErrorText(e, role)); }
  }, [project.id, role]);
  useEffect(() => { Promise.resolve().then(load); }, [load]);

  const closed = project.status === 'COMPLETED' || project.status === 'CANCELLED';
  const editable = can('manageTeam', { role, version: null, project }).ok;
  const savedLead = team?.lead?.userId ?? '';
  const savedMembers = team?.members.map((m) => m.userId) ?? [];
  const people = team ? [...(team.lead ? [team.lead] : []), ...team.members] : [];
  const onTeam = new Set(people.map((p) => p.userId));
  const roomsOf = new Map(people.map((p) => [p.userId, p.assignedRooms.map((r) => r.name)]));
  const options = teamOptions(designers ?? [], team);
  const avatars = avatarLabels(options.map((d) => ({ id: d.id, name: d.fullName })));
  // someone new must be taking projects; whoever is on the team now stays selectable
  const selectable = options.filter((d) => d.isAvailable || onTeam.has(d.id));
  const matching = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    return selectable.filter((d) => d.id === leadId || !q || `${d.fullName} ${d.email}`.toLocaleLowerCase().includes(q));
  }, [query, selectable, leadId]);
  const memberOptions = matching.filter((d) => d.id !== leadId);

  const chosen = new Set([leadId, ...memberIds].filter(Boolean));
  const leaving = people.filter((p) => !chosen.has(p.userId));
  const dirty = leadId !== savedLead
    || memberIds.length !== savedMembers.length
    || memberIds.some((id) => !savedMembers.includes(id));

  const changeLead = (id: string) => {
    const prev = leadId;
    setLeadId(id);
    setMemberIds((m) => {
      const next = m.filter((x) => x !== id);
      // like PUT /designer: the Lead being replaced stays on the team as a Member (Staff can untick them)
      if (prev && prev !== id && (prev === savedLead || savedMembers.includes(prev)) && !next.includes(prev)) next.push(prev);
      return next;
    });
  };
  const toggleMember = (id: string) => setMemberIds((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]));

  const save = async () => {
    setConfirm(false);
    setBusy(true);
    try {
      const res = await projectApi.updateTeam(project.id, { leadId, memberIds });
      onToast({ tone: 'success', message: t('team.teamUpdated') });
      const moved = res.reassignedRooms?.length ?? 0;
      if (moved) onToast({ tone: 'warning', message: t('team.roomsReassigned', { n: moved }) });
      // GET /projects/:id/team here, GET /projects/:id on the page
      await load();
      onSaved();
    } catch (e) {
      onToast({ tone: 'error', message: teamErrorText(e) });
    } finally { setBusy(false); }
  };
  // Someone leaving the team (their rooms go to the Lead) or a new Lead: confirm first. A first team is saved straight away.
  const submit = () => { if (leaving.length || (savedLead && leadId !== savedLead)) setConfirm(true); else void save(); };

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

      <Field label={t('team.lead')}>
        {(f) => (
          <Select {...f} value={leadId} onChange={(e) => changeLead(e.target.value)}>
            <option value="" disabled>{selectable.length ? t('team.chooseLead') : t('projectDetail.noDesigners')}</option>
            {matching.map((d) => <option key={d.id} value={d.id}>{d.fullName} · {workload(d)}</option>)}
          </Select>
        )}
      </Field>

      <label className="mt-3 block">
        <span className="sr-only">{t('team.searchDesigners')}</span>
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('team.searchDesigners')} />
      </label>

      <fieldset className="mt-4">
        <legend className="mb-2 text-[13px] font-medium text-slate-700">{t('team.members')}</legend>
        <p className="mb-2 text-xs text-slate-500">{t('team.chooseMembers')}</p>
        {memberOptions.length ? (
          <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-line">
            {memberOptions.map((d) => {
              const on = memberIds.includes(d.id);
              return (
                <li key={d.id}>
                  <label className={`flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-sand-50 ${on ? 'bg-brand-soft/60' : ''}`}>
                    <input type="checkbox" checked={on} onChange={() => toggleMember(d.id)} className="h-4 w-4 shrink-0 rounded border-slate-300 accent-brand" />
                    <Avatar id={d.id} name={d.fullName} label={avatars[d.id]} size="md" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">{d.fullName}</span>
                      <span className="block truncate text-xs text-slate-500">{sub(workload(d), d.id)}</span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        ) : <p className="text-sm text-slate-500">{query.trim() ? t('team.noSearchResults') : t('team.noMemberOptions')}</p>}
        {savedLead && leadId !== savedLead && memberIds.includes(savedLead) && <p className="mt-2 text-xs text-slate-500">{t('team.formerLeadStays')}</p>}
      </fieldset>

      <div className="mt-3 flex justify-end">
        <Button disabled={!leadId || !dirty} loading={busy && !confirm} onClick={submit}>{t('team.saveTeam')}</Button>
      </div>

      {confirm && (
        <Modal title={t(leaving.length ? 'team.saveTeamTitle' : 'team.changeLeadTitle')} onClose={() => setConfirm(false)} footer={<>
          <Button onClick={() => setConfirm(false)}>{t('common.cancel')}</Button>
          <Button variant="primary" loading={busy} onClick={() => void save()}>{t('team.saveTeam')}</Button>
        </>}>
          <p className="text-sm text-slate-700">{t(leaving.length ? 'team.saveTeamBody' : 'team.changeLeadBody')}</p>
          {leaving.length > 0 && (
            <ul className="mt-3 divide-y divide-slate-100">
              {leaving.map((p) => <TeamRow key={p.userId} id={p.userId} name={p.name} label={avatars[p.userId]} sub={sub(t(p.userId === savedLead ? 'team.lead' : 'team.member'), p.userId)} />)}
            </ul>
          )}
        </Modal>
      )}
    </section>
  );
}
