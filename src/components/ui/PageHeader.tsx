import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { t } from '@/i18n';

/** Page title block: back link, title + chip, description, at most one primary action plus secondary ones. */
export function PageHeader({ back, title, chip, description, primary, secondary }: {
  back?: { to: string; label: string }; title: ReactNode; chip?: ReactNode; description?: ReactNode; primary?: ReactNode; secondary?: ReactNode;
}) {
  return (
    <div className="mb-6">
      {back && (
        <Link to={back.to} className="mb-3 inline-flex items-center gap-1 rounded text-[13px] font-medium text-slate-600 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
          <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4"><path fill="currentColor" d="M12.7 4.3 7 10l5.7 5.7-1.06 1.06L4.88 10l6.76-6.76 1.06 1.06Z" /></svg>
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
            {chip}
          </div>
          {description && <p className="mt-1 max-w-2xl text-sm text-slate-600">{description}</p>}
        </div>
        {(primary || secondary) && <div className="flex flex-wrap items-center gap-2">{secondary}{primary}</div>}
      </div>
    </div>
  );
}

/**
 * Project progress drawn like a dimension line on a technical drawing: ticks at each step,
 * a thin rule between them; done steps get a check, the current step a filled blue mark.
 */
export function Stepper({ steps, current, size = 'md', className = '', emphasis = false, optional }: {
  steps: string[]; current: number; size?: 'sm' | 'md'; className?: string;
  /** Current step label as a filled chip in the primary colour (homeowner overview). */
  emphasis?: boolean;
  /** A step that may be skipped (e.g. the AI concept stage, not built yet): never auto-checked, drawn dashed,
   * with a small tag under the label (md only) and an explanation on hover. */
  optional?: { index: number; tag: string; hint: string };
}) {
  const sm = size === 'sm';
  return (
    <ol aria-label={t('steps.label')} className={`flex min-w-0 items-start overflow-x-auto ${className}`}>
      {steps.map((label, i) => {
        const skip = optional?.index === i && i !== current;
        const done = i < current && !skip, now = i === current;
        // the rule keeps its colour through a skipped step so progress still reads as continuous
        const passed = i < current;
        return (
          <li key={label} aria-current={now ? 'step' : undefined} title={skip ? optional!.hint : undefined}
            className={`flex min-w-0 flex-1 flex-col ${sm ? 'min-w-[64px]' : 'min-w-[84px]'} ${skip ? 'cursor-help' : ''}`}>
            <div className="flex items-center">
              <span className={`h-2 w-px ${i === 0 ? 'bg-transparent' : passed || now ? 'bg-brand' : 'bg-slate-300'}`} />
              <span className={`h-px flex-1 ${i === 0 ? 'bg-transparent' : passed || now ? 'bg-brand' : 'bg-slate-300'}`} />
              <span className={`flex shrink-0 items-center justify-center rounded-full ${sm ? 'h-4 w-4' : 'h-5 w-5'} ${skip ? 'border border-dashed border-slate-400 bg-white' : now ? 'bg-brand ring-4 ring-brand/15' : done ? 'border border-brand bg-white text-brand' : 'border border-slate-300 bg-white'}`}>
                {done && <svg aria-hidden viewBox="0 0 12 12" className={sm ? 'h-2.5 w-2.5' : 'h-3 w-3'}><path fill="none" stroke="currentColor" strokeWidth="1.8" d="m2.5 6.2 2.2 2.2 4.8-4.8" /></svg>}
                {now && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
              </span>
              <span className={`h-px flex-1 ${i === steps.length - 1 ? 'bg-transparent' : passed ? 'bg-brand' : 'bg-slate-300'}`} />
              <span className={`h-2 w-px ${i === steps.length - 1 ? 'bg-transparent' : passed ? 'bg-brand' : 'bg-slate-300'}`} />
            </div>
            <span className={`mt-1.5 truncate text-center ${sm ? 'text-[11px]' : 'text-xs'} ${now ? (emphasis ? 'mx-auto rounded-full bg-brand px-2.5 py-0.5 font-semibold text-white' : 'font-semibold text-brand') : skip ? 'text-slate-500' : done ? 'text-slate-700' : 'text-slate-500'}`}>
              {label}
              {(done || now) && <span className="sr-only"> ({t(now ? 'steps.current' : 'steps.done')})</span>}
              {skip && <span className="sr-only"> ({optional!.tag}: {optional!.hint})</span>}
            </span>
            {skip && !sm && <span aria-hidden className="mt-0.5 truncate text-center text-[11px] text-slate-500">{optional!.tag}</span>}
          </li>
        );
      })}
    </ol>
  );
}
