import { useEffect } from 'react';
import { BadgeCheck, ClipboardList, FileSignature, ListChecks, PenTool, Receipt, Sofa } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { t, tList } from '@/i18n';
import { PROJECT_STEPS, projectStepStates } from './steps';
import type { ProjectStep, StepState } from './steps';

/** One icon per step, keyed by status so the order lives only in PROJECT_STEPS (labels: steps.project, same order). */
const STEP_ICONS: Record<ProjectStep, LucideIcon> = {
  DRAFT: ClipboardList,
  CONTRACT_PENDING: FileSignature,
  REQUIREMENT_ANALYSIS: ListChecks,
  IN_DESIGN: PenTool,
  PRODUCT_SELECTION: Sofa,
  QUOTING: Receipt,
  COMPLETED: BadgeCheck,
};

const CIRCLE: Record<StepState, string> = {
  done: 'border-2 border-brand bg-brand text-white',
  active: 'border-2 border-brand bg-brand/10 text-brand ring-4 ring-brand/10',
  upcoming: 'border border-slate-300 bg-white text-slate-400',
  muted: 'border border-slate-200 bg-slate-50 text-slate-300',
};

const LABEL: Record<StepState, string> = {
  done: 'text-slate-700',
  active: 'font-semibold text-brand',
  upcoming: 'text-slate-500',
  muted: 'text-slate-400',
};

/**
 * Project progress on the project pages (Staff, Designer, Homeowner): the 7 steps of PROJECT_STEPS, drawn only from
 * `status`. Display only. Below 640px the bar scrolls sideways inside its card instead of squeezing the labels.
 */
export function ProjectStepper({ status, emphasis = false }: {
  status: string;
  /** Active label as a filled chip in the primary colour (homeowner overview). */
  emphasis?: boolean;
}) {
  const { states, cancelled, known } = projectStepStates(status);
  const labels = tList('steps.project');

  useEffect(() => {
    if (!known) console.warn(`ProjectStepper: unknown project status "${status}", steps shown muted.`);
  }, [known, status]);

  return (
    <div>
      {cancelled && (
        <p role="status" className="mb-4 flex flex-wrap items-center gap-2 text-sm text-slate-600">
          <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 ring-1 ring-rose-200">{t('steps.cancelled')}</span>
          {t('steps.cancelledHint')}
        </p>
      )}
      {!known && <p className="mb-4 text-sm text-slate-500">{t('steps.unknownStatus')}</p>}
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <ol aria-label={t('steps.label')} className="flex min-w-[600px] items-start">
          {PROJECT_STEPS.map((step, i) => {
            const state = states[i];
            const Icon = STEP_ICONS[step];
            const next = states[i + 1];
            // the rule into the next step is filled once this step is done and the next one reached
            const filled = state === 'done' && (next === 'done' || next === 'active');
            return (
              <li key={step} aria-current={state === 'active' ? 'step' : undefined} className="relative flex flex-1 flex-col items-center px-1">
                {i < PROJECT_STEPS.length - 1 && (
                  <span aria-hidden className={`absolute top-[19px] h-0.5 rounded-full ${filled ? 'bg-brand' : 'bg-slate-200'}`}
                    style={{ left: 'calc(50% + 26px)', right: 'calc(-50% + 26px)' }} />
                )}
                <span className={`relative grid h-10 w-10 shrink-0 place-items-center rounded-full ${CIRCLE[state]}`}>
                  <Icon aria-hidden className="h-[18px] w-[18px]" strokeWidth={2} />
                </span>
                <span className={`mt-2 max-w-[7.5rem] text-center text-xs leading-snug ${
                  state === 'active' && emphasis ? 'rounded-full bg-brand px-2.5 py-0.5 font-semibold text-white' : LABEL[state]}`}>
                  {labels[i]}
                  {state !== 'muted' && <span className="sr-only"> ({t(state === 'active' ? 'steps.current' : state === 'done' ? 'steps.done' : 'steps.upcoming')})</span>}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
