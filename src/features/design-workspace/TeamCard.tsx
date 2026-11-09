import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Avatar, Button, Card, EmptyState, ErrorState, Input, Modal, Skeleton, avatarLabels } from '@/components/ui';
import { projectApi } from '@/features/projects/projectApi';
import type { InvitableDesigner, ProjectMember } from '@/features/projects/projectApi';
import { errorText, t } from '@/i18n';
import type { Project } from './types';

function Row({ id, name, label, sub, action }: { id: string; name: string; label?: string; sub: string; action?: ReactNode }) {
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

function AddDesigner({ projectId, onClose, onAdded }: { projectId: string; onClose: () => void; onAdded: () => void }) {
  const [q, setQ] = useState('');
  const [list, setList] = useState<InvitableDesigner[] | null>(null);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [adding, setAdding] = useState<string | null>(null);
  // Only the newest search may fill the list.
  const seq = useRef(0);
  useEffect(() => {
    const mine = ++seq.current;
    const id = setTimeout(() => {
      setList(null); setError('');
      projectApi.listInvitableDesigners(projectId, q).then(
        (r) => { if (mine === seq.current) setList(r); },
        (e) => { if (mine === seq.current) setError(errorText(e)); },
      );
    }, 250);
    return () => clearTimeout(id);
  }, [projectId, q, reload]);
  const add = async (d: InvitableDesigner) => {
    setAdding(d.id); setError('');
    try { await projectApi.addMember(projectId, d.id); onAdded(); onClose(); } catch (e) { setError(errorText(e)); setAdding(null); }
  };
  return (
    <Modal title={t('team.addTitle')} onClose={onClose} footer={<Button onClick={onClose}>{t('common.cancel')}</Button>}>
      <div className="space-y-3">
        <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('team.search')} aria-label={t('team.search')} />
        {error && <ErrorState message={error} onRetry={() => setReload((n) => n + 1)} />}
        {!error && !list && <div className="space-y-2"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>}
        {list && !list.length && <EmptyState compact title={t('team.noneFound')} />}
        {list && !!list.length && (
          <ul className="divide-y divide-slate-100">
            {list.map((d) => <Row key={d.id} id={d.id} name={d.fullName} sub={d.email} action={<Button size="sm" loading={adding === d.id} disabled={!!adding} onClick={() => add(d)}>{t('team.add')}</Button>} />)}
          </ul>
        )}
      </div>
    </Modal>
  );
}

interface Props {
  project: Project;
  /** Lead on the project page: add and remove Members. */
  canManage?: boolean;
  onChanged?: () => void;
  /** Workspace drawer: the list only, with a link to where the Lead manages it. */
  manageHref?: string;
  /** Inside another card: a small heading instead of its own card. */
  bare?: boolean;
}

/** Design team of a project. */
export function TeamCard({ project, canManage = false, onChanged, manageHref, bare = false }: Props) {
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<ProjectMember | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const members = project.members ?? [];
  const lead = project.designer;
  const avatars = avatarLabels([...(lead ? [{ id: lead.id, name: lead.fullName }] : []), ...members.map((m) => ({ id: m.designerId, name: m.fullName }))]);
  const remove = async () => {
    setBusy(true); setError('');
    try { await projectApi.removeMember(project.id, removing!.designerId); setRemoving(null); onChanged?.(); } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  };
  const actions = canManage
    ? <Button size="sm" onClick={() => setAdding(true)}>{t('team.addDesigner')}</Button>
    : manageHref ? <Link to={manageHref} className="rounded text-[13px] font-medium text-brand hover:underline focus-visible:outline-2 focus-visible:outline-brand">{t('team.manage')}</Link> : undefined;
  const body = (
    <>
      <ul className="divide-y divide-slate-100">
        {lead && <Row id={lead.id} name={lead.fullName} label={avatars[lead.id]} sub={t('team.lead')} />}
        {members.map((m) => (
          <Row key={m.designerId} id={m.designerId} name={m.fullName} label={avatars[m.designerId]} sub={t('team.member')} action={canManage
            ? <Button size="sm" variant="ghost" aria-label={t('team.removeNamed', { name: m.fullName })} onClick={() => { setError(''); setRemoving(m); }}>{t('team.remove')}</Button>
            : undefined} />
        ))}
      </ul>
      {!members.length && <p className="mt-2 text-xs text-slate-500">{t('team.noMembers')}</p>}
      {adding && <AddDesigner projectId={project.id} onClose={() => setAdding(false)} onAdded={() => onChanged?.()} />}
      {removing && (
        <Modal title={t('team.removeTitle', { name: removing.fullName })} onClose={() => setRemoving(null)} footer={<>
          <Button onClick={() => setRemoving(null)}>{t('common.cancel')}</Button>
          <Button variant="danger" loading={busy} onClick={remove}>{t('team.remove')}</Button>
        </>}>
          <p className="text-sm text-slate-700">{t('team.removeBody')}</p>
          {error && <div className="mt-3"><ErrorState message={error} /></div>}
        </Modal>
      )}
    </>
  );
  if (!bare) return <Card title={t('team.title')} actions={actions}>{body}</Card>;
  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-[13px] font-medium text-slate-700">{t('team.title')}</h3>
        {actions}
      </div>
      {body}
    </section>
  );
}
