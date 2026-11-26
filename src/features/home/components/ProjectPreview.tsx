import { ArrowRight, Check, CreditCard } from 'lucide-react';
import { StatusChip } from '@/components/ui';
import { t, tList } from '@/i18n';
import { PROJECT_STEPS } from '../landing';

/** The preview sits on step 4 (IN_DESIGN, "2D design & concept"). */
const CURRENT = PROJECT_STEPS.indexOf('IN_DESIGN');

const p = (key: string) => t(`home.hero.preview.${key}`);

/**
 * Hero visual: the homeowner's project page in miniature, with the same marks and copy as the real page
 * (page header, step progress, latest design with pinned comments, "Next step" card) plus a paid deposit.
 * Decorative: screen readers get one image with a description, and nothing in it is focusable.
 */
export function ProjectPreview() {
  const steps = tList('steps.project');

  return (
    <div role="img" aria-label={p('label')} className="relative mx-auto w-full max-w-2xl lg:max-w-none">
      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-float">
        <div className="flex items-center gap-1.5 border-b border-line bg-muted px-4 py-2.5">
          {[0, 1, 2].map((i) => <span key={i} className="h-2.5 w-2.5 rounded-full bg-slate-300" />)}
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          <div>
            <p className="text-xs font-medium text-slate-500">‹ {t('nav.myProjects')}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <p className="text-base font-semibold tracking-tight text-ink sm:text-lg">{p('project')}</p>
              <StatusChip label={steps[CURRENT]} tone="blue" size="sm" />
            </div>
            <p className="mt-0.5 text-xs text-slate-500">{t('homeownerDetail.meta', { designer: p('designer'), staff: p('staff') })}</p>
          </div>

          <div className="rounded-xl border border-line bg-canvas px-2 py-3">
            <MiniStepper steps={steps} current={CURRENT} />
          </div>

          <div className="grid gap-3 sm:grid-cols-5">
            {/* latest design with pinned comments: from sm up, phones keep the two cards that matter */}
            <div className="hidden overflow-hidden rounded-xl border border-line sm:col-span-3 sm:block">
              <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
                <span className="truncate text-xs font-semibold text-ink">{t('homeownerDetail.latestDesign', { v: p('version') })}</span>
                <StatusChip kind="version" value="SUBMITTED" size="sm" />
              </div>
              <div className="relative bg-stage">
                <FloorPlan />
                <span className="absolute bottom-[37%] right-[37%] max-w-[58%] rounded-lg rounded-br-sm border border-line bg-surface px-2 py-1 text-[11px] leading-snug text-slate-700 shadow-float">
                  {p('comment')}
                </span>
              </div>
            </div>

            <div className="flex flex-col justify-center gap-4 rounded-xl border border-blue-100 bg-brand-soft p-4 sm:col-span-2">
              <div>
                <p className="text-xs font-medium text-brand">{t('nextStep.title')}</p>
                <p className="mt-1 text-sm font-semibold leading-snug text-ink sm:text-base">{t('nextStep.IN_DESIGN.homeowner')}</p>
              </div>
              <span className="inline-flex h-8 items-center gap-1.5 self-start rounded-lg bg-brand px-3 text-[13px] font-medium text-white">
                {t('homeownerDetail.openDesign')}
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute -bottom-5 -left-3 hidden items-center gap-2.5 rounded-xl border border-line bg-surface px-3 py-2 shadow-float sm:flex">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent-soft text-accent-text"><CreditCard className="h-4 w-4" /></span>
        <span>
          <span className="flex items-center gap-1 text-xs font-semibold text-ink">{p('paid')}<Check className="h-3.5 w-3.5 text-brand" strokeWidth={3} /></span>
          <span className="block text-[11px] text-slate-500">{p('paidVia')}</span>
        </span>
      </div>
    </div>
  );
}

/**
 * The project page's Stepper in miniature, always fitting its card: same rule, checks and filled current mark.
 * On phones only the current label shows.
 */
function MiniStepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex">
      {steps.map((label, i) => {
        const done = i < current, now = i === current;
        return (
          <li key={label} className="flex min-w-0 flex-1 flex-col items-center">
            <div className="flex w-full items-center">
              <span className={`h-px flex-1 ${i === 0 ? 'bg-transparent' : done || now ? 'bg-brand' : 'bg-slate-300'}`} />
              <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${now ? 'bg-brand ring-4 ring-brand-soft' : done ? 'border border-brand bg-surface text-brand' : 'border border-slate-300 bg-surface'}`}>
                {done && <svg viewBox="0 0 12 12" className="h-2.5 w-2.5"><path fill="none" stroke="currentColor" strokeWidth="1.8" d="m2.5 6.2 2.2 2.2 4.8-4.8" /></svg>}
                {now && <span className="h-1.5 w-1.5 rounded-full bg-surface" />}
              </span>
              <span className={`h-px flex-1 ${i === steps.length - 1 ? 'bg-transparent' : done ? 'bg-brand' : 'bg-slate-300'}`} />
            </div>
            {/* the current chip may be wider than its slot on phones; its neighbours' labels are hidden there */}
            <span className={`mt-1.5 text-[10px] ${now
              ? 'whitespace-nowrap rounded-full bg-brand px-2 py-0.5 font-semibold text-white'
              : `hidden max-w-full truncate sm:block ${done ? 'text-slate-700' : 'text-slate-500'}`}`}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** An apartment plan (bedroom, bath, kitchen, living and dining) with two comment pins, in the theme colours. */
function FloorPlan() {
  const furniture = 'fill-slate-100 stroke-slate-300';
  const pin = 'M12 22s7-6.3 7-12a7 7 0 1 0-14 0c0 5.7 7 12 7 12z';
  return (
    <svg viewBox="0 0 300 180" className="block h-auto w-full">
      <rect x="10" y="10" width="280" height="160" className="fill-surface" />

      <g className={furniture} strokeWidth="1">
        {/* bedroom: bed, pillows, wardrobe */}
        <rect x="22" y="22" width="56" height="62" rx="3" />
        <rect x="27" y="26" width="21" height="11" rx="2" />
        <rect x="52" y="26" width="21" height="11" rx="2" />
        <path d="M22 46H78" fill="none" />
        <rect x="92" y="16" width="22" height="42" rx="1.5" />
        {/* bathroom: toilet, basin, tub */}
        <ellipse cx="22" cy="118" rx="6" ry="8" />
        <rect x="38" y="106" width="18" height="10" rx="2" />
        <rect x="16" y="134" width="40" height="30" rx="8" />
        {/* kitchen counter */}
        <path d="M66 104h8v54h42v8H66z" />
        {/* living: TV unit, coffee table, sofa */}
        <rect x="172" y="15" width="60" height="7" rx="1.5" />
        <rect x="182" y="104" width="42" height="18" rx="3" />
        <rect x="160" y="134" width="86" height="24" rx="5" />
        <path d="M189 134v18M217 134v18M160 152h86" fill="none" />
        {/* dining table and chairs */}
        <circle cx="258" cy="48" r="13" />
        <rect x="252" y="26" width="12" height="6" rx="2" />
        <rect x="252" y="64" width="12" height="6" rx="2" />
        <rect x="236" y="42" width="6" height="12" rx="2" />
        <rect x="274" y="42" width="6" height="12" rx="2" />
      </g>
      <circle cx="140" cy="155" r="7" className="fill-blue-100 stroke-blue-300" strokeWidth="1" />

      {/* walls, windows, door swings */}
      <rect x="10" y="10" width="280" height="160" fill="none" className="stroke-slate-700" strokeWidth="4" />
      <path d="M120 10v56M120 92v20M10 100h18M48 100h72M62 100v70" fill="none" className="stroke-slate-700" strokeWidth="2.5" strokeLinecap="square" />
      <rect x="8" y="30" width="4" height="44" className="fill-surface stroke-slate-500" strokeWidth="0.8" />
      <rect x="288" y="96" width="4" height="56" className="fill-surface stroke-slate-500" strokeWidth="0.8" />
      <path d="M120 92H94M94 92a26 26 0 0 1 26-26M28 100v20M28 120a20 20 0 0 0 20-20" fill="none" className="stroke-slate-400" strokeWidth="1" />

      {/* comment pins: on the sofa (with the open comment) and on the bed */}
      <g transform="translate(191 118)">
        <path d={pin} className="fill-brand stroke-surface" strokeWidth="1.5" />
        <circle cx="12" cy="10" r="2.6" className="fill-surface" />
      </g>
      <g transform="translate(38 38)">
        <path d={pin} className="fill-accent stroke-surface" strokeWidth="1.5" />
        <circle cx="12" cy="10" r="2.6" className="fill-surface" />
      </g>
    </svg>
  );
}
