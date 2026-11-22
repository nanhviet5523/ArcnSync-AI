import { Link } from 'react-router-dom';
import { t, tList } from '@/i18n';
import { StaticLayout } from './StaticLayout';

/** Shared layout for /terms and /privacy: table of contents + numbered sections from legalPage.<doc>. */
export function LegalDocument({ doc, sections }: { doc: 'terms' | 'privacy'; sections: string[] }) {
  const k = (path: string) => t(`legalPage.${doc}.${path}`);
  const other = doc === 'terms' ? 'privacy' : 'terms';

  return (
    <StaticLayout eyebrow={t('legalPage.eyebrow')} title={k('title')} subtitle={k('intro')}>
      <section className="w-full px-6 py-14 lg:px-16">
        <div className="mx-auto grid w-full max-w-[1200px] gap-10 lg:grid-cols-4">
          <aside className="lg:col-span-1">
            <nav aria-label={t('legalPage.contents')} className="rounded-2xl border border-line bg-surface p-5 lg:sticky lg:top-24">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('legalPage.contents')}</p>
              <ol className="mt-3 space-y-2 text-sm">
                {sections.map((s, i) => (
                  <li key={s}>
                    <a href={`#${s}`} className="text-slate-600 transition-colors hover:text-brand">{i + 1}. {k(`sections.${s}.title`)}</a>
                  </li>
                ))}
              </ol>
              <Link to={`/${other}`} className="mt-5 block border-t border-line pt-4 text-xs font-semibold text-brand hover:underline">
                {t(`legalPage.${other}.title`)} →
              </Link>
            </nav>
          </aside>

          <article className="rounded-2xl border border-line bg-surface p-6 shadow-card lg:col-span-3 lg:p-10">
            <p className="text-xs text-slate-500">{t('legalPage.lastUpdated')}</p>
            {sections.map((s, i) => (
              <section key={s} id={s} className="mt-8 scroll-mt-24 first-of-type:mt-6">
                <h2 className="text-lg font-bold tracking-tight text-slate-900">{i + 1}. {k(`sections.${s}.title`)}</h2>
                <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-700">
                  {tList(`legalPage.${doc}.sections.${s}.body`).map((p) => <p key={p}>{p}</p>)}
                </div>
              </section>
            ))}
            <p className="mt-10 border-t border-line pt-6 text-xs leading-relaxed text-slate-500">{t('legalPage.questions')}</p>
          </article>
        </div>
      </section>
    </StaticLayout>
  );
}
