import { Eye, Scale, Sparkles, Target, Workflow } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { t, tList } from '@/i18n';
import { StaticCta, StaticLayout, StaticSection } from './StaticLayout';

const VALUES: { key: string; icon: LucideIcon }[] = [
  { key: 'ai', icon: Sparkles },
  { key: 'cost', icon: Scale },
  { key: 'execution', icon: Workflow },
];

const k = (path: string) => t(`aboutPage.${path}`);

export function AboutPage() {
  return (
    <StaticLayout eyebrow={k('eyebrow')} title={k('title')} subtitle={k('subtitle')}>
      <StaticSection>
        <div className="grid gap-10 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 lg:text-3xl">{k('storyTitle')}</h2>
            <div className="mt-5 space-y-4 text-sm leading-relaxed text-slate-700 lg:text-base">
              {tList('aboutPage.story').map((p) => <p key={p}>{p}</p>)}
            </div>
          </div>
          <div className="space-y-4 lg:col-span-2">
            {(['vision', 'mission'] as const).map((key) => {
              const Icon = key === 'vision' ? Eye : Target;
              return (
                <article key={key} className="rounded-2xl border border-line bg-surface p-6 shadow-card">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><Icon aria-hidden className="h-4.5 w-4.5" /></span>
                    <h3 className="text-base font-bold text-slate-900">{k(`${key}.title`)}</h3>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{k(`${key}.body`)}</p>
                </article>
              );
            })}
          </div>
        </div>
      </StaticSection>

      <StaticSection tone="surface" title={k('valuesTitle')} intro={k('valuesIntro')}>
        <div className="grid gap-4 md:grid-cols-3">
          {VALUES.map(({ key, icon: Icon }) => (
            <article key={key} className="rounded-2xl border border-line bg-canvas p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand"><Icon aria-hidden className="h-5 w-5" /></span>
              <h3 className="mt-4 text-lg font-bold text-slate-900">{k(`values.${key}.title`)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{k(`values.${key}.body`)}</p>
            </article>
          ))}
        </div>
      </StaticSection>

      <StaticSection>
        <dl className="grid gap-4 sm:grid-cols-3">
          {(['roles', 'stages', 'milestones'] as const).map((key) => (
            <div key={key} className="rounded-2xl border border-line bg-surface p-6 text-center shadow-card">
              <dt className="text-sm text-slate-600">{k(`facts.${key}.label`)}</dt>
              <dd className="mt-1 text-4xl font-extrabold tracking-tight text-brand">{k(`facts.${key}.value`)}</dd>
            </div>
          ))}
        </dl>
      </StaticSection>

      <StaticCta title={k('cta.title')} body={k('cta.body')} button={k('cta.button')} to="/how-it-works" />
    </StaticLayout>
  );
}

export default AboutPage;
