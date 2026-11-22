import { useState } from 'react';
import { ClipboardList, CreditCard, Home, PenTool, ShieldCheck, Truck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { t } from '@/i18n';
import { StaticCta, StaticLayout, StaticSection } from './StaticLayout';

/** Project lifecycle in backend order (ProjectStatus), without CANCELLED. */
const STAGES = ['DRAFT', 'CONTRACT_PENDING', 'REQUIREMENT_ANALYSIS', 'IN_DESIGN', 'PRODUCT_SELECTION', 'QUOTING', 'COMPLETED'] as const;
/** Which milestones each stage unlocks. */
const STAGE_MILESTONES: Partial<Record<(typeof STAGES)[number], string[]>> = {
  CONTRACT_PENDING: ['DEPOSIT'],
  IN_DESIGN: ['LAYOUT_2D', 'RENDER_3D'],
  QUOTING: ['FINAL_PACKAGE'],
};
const MILESTONES = ['DEPOSIT', 'LAYOUT_2D', 'RENDER_3D', 'FINAL_PACKAGE'] as const;
const ROLES: { key: string; icon: LucideIcon }[] = [
  { key: 'customer', icon: Home },
  { key: 'staff', icon: ClipboardList },
  { key: 'designer', icon: PenTool },
  { key: 'supplier', icon: Truck },
  { key: 'admin', icon: ShieldCheck },
];

const k = (path: string) => t(`howItWorksPage.${path}`);

export function HowItWorksPage() {
  const [active, setActive] = useState(0);
  const stage = STAGES[active];

  return (
    <StaticLayout eyebrow={k('eyebrow')} title={k('title')} subtitle={k('subtitle')}>
      <StaticSection title={k('timelineTitle')} intro={k('timelineIntro')}>
        <div className="grid gap-6 lg:grid-cols-5">
          {/* Stage list */}
          <ol className="relative space-y-2 lg:col-span-2">
            {STAGES.map((s, i) => {
              const on = i === active;
              return (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => setActive(i)}
                    aria-current={on ? 'step' : undefined}
                    className={`flex w-full cursor-pointer items-center gap-4 rounded-xl border px-4 py-3 text-left transition focus-visible:outline-2 focus-visible:outline-brand ${
                      on ? 'border-brand bg-brand-soft' : 'border-line bg-surface hover:border-line-strong'
                    }`}
                  >
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${on ? 'bg-brand text-white' : i < active ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'}`}>
                      {i + 1}
                    </span>
                    <span className="min-w-0">
                      <span className={`block text-sm font-semibold ${on ? 'text-slate-900' : 'text-slate-700'}`}>{k(`stages.${s}.title`)}</span>
                      <span className="mt-0.5 block font-mono text-[11px] text-slate-500">{s}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          {/* Stage detail */}
          <div className="rounded-2xl border border-line bg-surface p-6 shadow-card lg:col-span-3 lg:p-8" aria-live="polite">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">{t('howItWorksPage.stageOf', { n: active + 1, total: STAGES.length })}</p>
            <h3 className="mt-2 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{k(`stages.${stage}.title`)}</h3>
            <span className="mt-3 inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 font-mono text-xs font-semibold text-slate-700">
              {k('stateLabel')}: {stage}
            </span>
            <p className="mt-5 text-sm leading-relaxed text-slate-700 lg:text-base">{k(`stages.${stage}.body`)}</p>
            <p className="mt-4 text-xs text-slate-500"><span className="font-semibold text-slate-700">{k('whoLabel')}:</span> {k(`stages.${stage}.who`)}</p>

            {STAGE_MILESTONES[stage] && (
              <div className="mt-6 flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <CreditCard aria-hidden className="h-4 w-4 text-amber-700" />
                <span className="text-xs font-semibold text-amber-900">{k('unlocksLabel')}:</span>
                {STAGE_MILESTONES[stage]?.map((m) => (
                  <span key={m} className="rounded-full bg-amber-100 px-2.5 py-0.5 font-mono text-[11px] font-bold text-amber-800">{m}</span>
                ))}
              </div>
            )}

            <div className="mt-8 flex items-center justify-between gap-3 border-t border-line pt-5">
              <button type="button" disabled={active === 0} onClick={() => setActive(active - 1)} className="cursor-pointer rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40">
                ← {k('prev')}
              </button>
              <button type="button" disabled={active === STAGES.length - 1} onClick={() => setActive(active + 1)} className="cursor-pointer rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-40">
                {k('next')} →
              </button>
            </div>
          </div>
        </div>
      </StaticSection>

      <StaticSection tone="surface" title={k('milestonesTitle')} intro={k('milestonesIntro')}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {MILESTONES.map((m, i) => (
            <article key={m} className="flex flex-col rounded-2xl border border-line bg-canvas p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('howItWorksPage.milestoneStep', { n: i + 1 })}</span>
                <CreditCard aria-hidden className="h-4 w-4 text-amber-600" />
              </div>
              <p className="mt-3 font-mono text-sm font-bold text-slate-900">{m}</p>
              <p className="mt-1 text-sm font-semibold text-brand">{k(`milestones.${m}.trigger`)}</p>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{k(`milestones.${m}.body`)}</p>
            </article>
          ))}
        </div>
      </StaticSection>

      <StaticSection title={k('rolesTitle')} intro={k('rolesIntro')}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {ROLES.map(({ key, icon: Icon }) => (
            <article key={key} className="rounded-2xl border border-line bg-surface p-5 shadow-card">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand"><Icon aria-hidden className="h-5 w-5" /></span>
              <h3 className="mt-4 text-base font-bold text-slate-900">{k(`roles.${key}.title`)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{k(`roles.${key}.body`)}</p>
            </article>
          ))}
        </div>
      </StaticSection>

      <StaticCta title={k('cta.title')} body={k('cta.body')} button={k('cta.button')} to="/signup" />
    </StaticLayout>
  );
}

export default HowItWorksPage;
