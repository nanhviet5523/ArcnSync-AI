import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { t, tList } from '@/i18n';

/** Homepage #contact section: benefits on the left, AI Studio promotion card on the right. */
export function ContactSection() {
  return (
    <section id="contact" className="w-full scroll-mt-20 bg-slate-50 px-6 py-16 lg:px-16">
      <div className="mx-auto grid w-full max-w-[1200px] gap-10 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">{t('contact.eyebrow')}</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 lg:text-4xl">{t('contact.title')}</h2>
          <p className="mt-3 text-sm text-slate-600 lg:text-base">{t('contact.description')}</p>
          <ul className="mt-6 space-y-3">
            {tList('contact.points').map((p) => (
              <li key={p} className="flex items-start gap-2 text-sm text-slate-700"><CheckCircle2 aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />{p}</li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-slate-800/80 bg-slate-900 p-6 shadow-2xl transition-all duration-300 hover:border-emerald-500/30 sm:p-8 lg:col-span-3">
          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400">
            {t('contact.promo.badge')}
          </span>
          <h3 className="text-xl font-bold leading-snug tracking-tight text-white sm:text-2xl">{t('contact.promo.title')}</h3>
          <p className="mb-6 mt-2.5 text-sm leading-relaxed text-slate-300">{t('contact.promo.description')}</p>
          <Link
            to="/login"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-6 py-3.5 text-center font-medium text-white shadow-lg shadow-slate-900/30 transition-all hover:bg-brand-hover"
          >
            {t('contact.promo.cta')}
          </Link>
          <p className="mt-3.5 text-center text-xs font-normal text-slate-400">{t('contact.promo.note')}</p>
        </div>
      </div>
    </section>
  );
}

export default ContactSection;
