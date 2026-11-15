import { useEffect } from 'react';
import { X } from 'lucide-react';
import { Z, useFocusTrap } from '@/components/ui';
import { t } from '@/i18n';
import { BudgetCard, HomeCard, PeopleCard } from '@/features/projects/ProjectInfoSections';
import { TeamCard } from './TeamCard';
import type { Project, Role } from './types';

interface Props {
  project: Project;
  role: Role;
  /** Lead: the list links to the project page, where the team is managed. */
  canManageTeam: boolean;
  onClose: () => void;
}

/** "Project info" drawer in the workspace: Home, People, Team, Budget, without leaving the drawing. */
export function ProjectInfoDrawer({ project, role, canManageTeam, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Esc closes a dialog opened from this drawer first
      if (e.key === 'Escape' && document.querySelectorAll('[aria-modal="true"]').length < 2) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  const designer = role === 'designer';
  const box = useFocusTrap<HTMLElement>();
  return (
    <div className={`fixed inset-0 ${Z.sheet} flex justify-end`}>
      <div className="absolute inset-0 bg-slate-900/30" onClick={onClose} />
      <aside ref={box} role="dialog" aria-modal="true" aria-labelledby="project-info-title" className="relative flex h-full w-full max-w-[440px] flex-col bg-canvas shadow-float">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-line bg-surface px-5 py-3.5">
          <div className="min-w-0">
            <h2 id="project-info-title" className="text-[15px] font-semibold text-slate-900">{t('ws.projectInfo')}</h2>
            <p className="truncate text-xs text-slate-500">{project.title}</p>
          </div>
          <button type="button" autoFocus onClick={onClose} aria-label={t('common.close')} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-brand">
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          <HomeCard project={project} />
          {!designer && <PeopleCard project={project} />}
          {/* for homeowner and staff a team of one only repeats People */}
          {(designer || !!project.members?.length) && <TeamCard project={project} manageHref={canManageTeam ? `/designer/projects/${project.id}` : undefined} />}
          {!designer && <BudgetCard project={project} />}
        </div>
      </aside>
    </div>
  );
}
