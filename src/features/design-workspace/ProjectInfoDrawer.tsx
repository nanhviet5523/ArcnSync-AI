import { useEffect } from 'react';
import { X } from 'lucide-react';
import { t } from '@/i18n';
import { BudgetCard, HomeCard, PeopleCard } from '@/features/projects/ProjectInfoSections';
import type { Project } from './types';

/** "Project info" drawer in the workspace (homeowner): Home, People, Budget, without leaving the drawing. */
export function ProjectInfoDrawer({ project, onClose }: { project: Project; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[90] flex justify-end">
      <div className="absolute inset-0 bg-slate-900/30" onClick={onClose} />
      <aside role="dialog" aria-modal="true" aria-labelledby="project-info-title" className="relative flex h-full w-full max-w-[440px] flex-col bg-canvas shadow-float">
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
          <PeopleCard project={project} />
          <BudgetCard project={project} />
        </div>
      </aside>
    </div>
  );
}
