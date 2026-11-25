import { t } from '@/i18n';
import { PROJECT_STEPS } from '../landing';

/** Section 2: the 7 steps of a project, one per backend status, as a numbered timeline. */
export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="scroll-mt-16 border-y border-line bg-surface px-6 py-20 lg:px-12">
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:col-span-5 lg:self-start">
          <p className="text-xs font-bold uppercase tracking-widest text-brand">{t('home.steps.eyebrow')}</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">{t('home.steps.title')}</h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-600 sm:text-base">{t('home.steps.intro')}</p>
        </div>

        <ol className="lg:col-span-7">
          {PROJECT_STEPS.map((status, i) => (
            <li key={status} className="relative flex gap-5 pb-8 last:pb-0">
              {/* rule down to the next step */}
              {i < PROJECT_STEPS.length - 1 && <span aria-hidden className="absolute bottom-0 left-5 top-10 w-px bg-line-strong" />}
              <span aria-hidden className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line-strong bg-canvas text-sm font-bold text-brand">
                {i + 1}
              </span>
              <div className="min-w-0 pt-1.5">
                <h3 className="text-base font-bold text-slate-900">{t(`home.steps.${status}.title`)}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{t(`home.steps.${status}.body`)}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export default HowItWorksSection;
