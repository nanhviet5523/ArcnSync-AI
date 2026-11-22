import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Search } from 'lucide-react';
import { t } from '@/i18n';
import { StaticLayout, StaticSection } from './StaticLayout';

/** FAQ groups and the question keys inside each one (helpPage.faq.<group>.<q>). */
const FAQ: { group: string; items: string[] }[] = [
  { group: 'contract', items: ['q1', 'q2', 'q3'] },
  { group: 'payments', items: ['q1', 'q2', 'q3'] },
  { group: 'survey', items: ['q1', 'q2'] },
  { group: 'design', items: ['q1', 'q2', 'q3'] },
];

const k = (path: string) => t(`helpPage.${path}`);

export function HelpPage() {
  const [open, setOpen] = useState<string | null>('contract.q1');

  return (
    <StaticLayout
      eyebrow={k('eyebrow')}
      title={k('title')}
      subtitle={k('subtitle')}
      heroExtra={
        // static visual element: search is not wired yet
        <div className="mt-8 flex max-w-xl items-center gap-3 rounded-xl border border-white/15 bg-white/5 px-4 py-3">
          <Search aria-hidden className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            type="search"
            aria-label={k('searchLabel')}
            placeholder={k('searchPlaceholder')}
            className="w-full bg-transparent text-sm text-white placeholder:text-slate-400 focus:outline-none"
          />
        </div>
      }
    >
      <StaticSection title={k('faqTitle')} intro={k('faqIntro')}>
        <div className="grid gap-8 lg:grid-cols-2">
          {FAQ.map(({ group, items }) => (
            <section key={group} aria-labelledby={`faq-${group}`}>
              <h3 id={`faq-${group}`} className="text-sm font-bold uppercase tracking-wide text-amber-700">{k(`faq.${group}.title`)}</h3>
              <div className="mt-3 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
                {items.map((q) => {
                  const id = `${group}.${q}`;
                  const isOpen = open === id;
                  return (
                    <div key={id}>
                      <h4>
                        <button
                          type="button"
                          aria-expanded={isOpen}
                          aria-controls={`faq-panel-${group}-${q}`}
                          onClick={() => setOpen(isOpen ? null : id)}
                          className="flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold text-slate-900 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
                        >
                          {k(`faq.${group}.${q}.q`)}
                          <ChevronDown aria-hidden className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                        </button>
                      </h4>
                      {isOpen && (
                        <p id={`faq-panel-${group}-${q}`} className="px-5 pb-5 text-sm leading-relaxed text-slate-600">{k(`faq.${group}.${q}.a`)}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </StaticSection>

      <section className="w-full px-6 pb-16 lg:px-16">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col items-start justify-between gap-4 rounded-2xl border border-line bg-brand-soft p-6 sm:flex-row sm:items-center lg:p-8">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{k('contactTitle')}</h2>
            <p className="mt-1 text-sm text-slate-700">{k('contactBody')}</p>
          </div>
          <Link to="/login" className="inline-flex shrink-0 items-center justify-center rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-hover">
            {k('contactButton')}
          </Link>
        </div>
      </section>
    </StaticLayout>
  );
}

export default HelpPage;
