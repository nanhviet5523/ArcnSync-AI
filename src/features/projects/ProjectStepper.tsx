import { useEffect } from 'react';
import { BadgeCheck, ClipboardList, FileSignature, PenTool, Receipt, Sofa } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { t, tList } from '@/i18n';
import { PROJECT_STEPS, projectStepStates } from './steps';
import type { ProjectStep, StepState } from './steps';

/** One icon per step, keyed by status so the order lives only in PROJECT_STEPS (labels: steps.project, same order). */
const STEP_ICONS: Record<ProjectStep, LucideIcon> = {
  DRAFT: ClipboardList,
  CONTRACT_PENDING: FileSignature,
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

export interface TrackStep {
  key: string;
  label: string;
  icon: LucideIcon;
  state: StepState;
  /** Short line under the label (flows with few steps, e.g. New project). */
  hint?: string;
}

/**
 * The circles-and-rule track: an icon circle per step, a rule to the next one that fills once both are reached, the
 * label (and optional hint) below. Drawn by ProjectStepper and by flows with their own steps, so they look the same.
 * Moving to a new step eases the colours over.
 */
export function StepTrack({ steps, label, emphasis = false, className = '' }: {
  steps: TrackStep[];
  label: string;
  /** Active label as a filled chip in the primary colour (homeowner overview). */
  emphasis?: boolean;
  className?: string;
}) {
  return (
    <ol aria-label={label} className={`flex items-start ${className}`}>
      {steps.map((step, i) => {
        const Icon = step.icon;
        const next = steps[i + 1]?.state;
        // the rule into the next step is filled once this step is done and the next one reached
        const filled = step.state === 'done' && (next === 'done' || next === 'active');
        return (
          <li key={step.key} aria-current={step.state === 'active' ? 'step' : undefined} className="relative flex flex-1 flex-col items-center px-1">
            {i < steps.length - 1 && (
              <span aria-hidden className="absolute top-[19px] h-0.5 overflow-hidden rounded-full bg-slate-200"
                style={{ left: 'calc(50% + 26px)', right: 'calc(-50% + 26px)' }}>
                {/* fills left to right when the step is completed */}
                <span className={`block h-full origin-left bg-brand transition-transform duration-500 ease-out motion-reduce:transition-none ${filled ? 'scale-x-100' : 'scale-x-0'}`} />
              </span>
            )}
            <span className={`relative grid h-10 w-10 shrink-0 place-items-center rounded-full transition-colors duration-300 motion-reduce:transition-none ${CIRCLE[step.state]}`}>
              <Icon aria-hidden className="h-[18px] w-[18px]" strokeWidth={2} />
            </span>
            <span className={`mt-2 ${step.hint ? 'max-w-[10rem]' : 'max-w-[7.5rem]'} text-center text-xs leading-snug transition-colors duration-300 ${
              step.state === 'active' && emphasis ? 'rounded-full bg-brand px-2.5 py-0.5 font-semibold text-white' : LABEL[step.state]}`}>
              {step.label}
              {step.state !== 'muted' && <span className="sr-only"> ({t(step.state === 'active' ? 'steps.current' : step.state === 'done' ? 'steps.done' : 'steps.upcoming')})</span>}
            </span>
            {step.hint && <span className="mt-0.5 max-w-[12rem] text-center text-[11px] leading-snug text-slate-500">{step.hint}</span>}
          </li>
        );
      })}
    </ol>
  );
}

/**
 * The 6 steps as a strip of tiny segments for tables: done steps filled, the current one half-tone. The step name
 * and number are in the tooltip and for screen readers. Nothing for a cancelled or unknown status.
 */
export function MiniSteps({ status }: { status: string }) {
  const { states, cancelled, known } = projectStepStates(status);
  if (cancelled || !known) return null;
  const labels = tList('steps.project');
  const current = states.indexOf('active');
  const text = current < 0
    ? t('cards.allDone', { total: PROJECT_STEPS.length })
    : t('cards.step', { n: current + 1, total: PROJECT_STEPS.length, label: labels[current] });
  return (
    <span title={text} className="mt-1.5 flex w-[84px] gap-0.5">
      {states.map((state, i) => (
        <span key={PROJECT_STEPS[i]} aria-hidden
          className={`h-1 flex-1 rounded-full ${state === 'done' ? 'bg-brand' : state === 'active' ? 'bg-brand/45' : 'bg-slate-200'}`} />
      ))}
      <span className="sr-only">{text}</span>
    </span>
  );
}

/**
 * Project progress on the project pages (Staff, Designer, Homeowner): the 6 steps of PROJECT_STEPS, drawn only from
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
        <StepTrack
          label={t('steps.label')}
          emphasis={emphasis}
          className="min-w-[600px]"
          steps={PROJECT_STEPS.map((step, i) => ({ key: step, label: labels[i], icon: STEP_ICONS[step], state: states[i] }))}
        />
      </div>
    </div>
  );
}
