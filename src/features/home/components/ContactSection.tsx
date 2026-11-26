import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { t, tList } from '@/i18n';
import type { User } from '@/types/role';
import { ctaPrimaryOnDark, startFor } from '../landing';

/** Static contact details (values in home.contact.values); a link only where there is something to open. */
const CONTACTS: { key: string; icon: LucideIcon; href?: (value: string) => string }[] = [
  { key: 'hotline', icon: Phone, href: (value) => `tel:${value.replace(/[^\d+]/g, '')}` },
  { key: 'email', icon: Mail, href: (value) => `mailto:${value}` },
  { key: 'zalo', icon: MessageCircle },
  { key: 'address', icon: MapPin },
];

/** Section 5: contact details on the left; creating an account (or going back to your projects) on the right. */
export function ContactSection({ user }: { user: User | null }) {
  const start = user ? startFor(user) : null;

  return (
    <section id="contact" className="scroll-mt-16 border-t border-line bg-surface px-6 py-20 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-widest text-brand">{t('home.contact.eyebrow')}</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">{t('home.contact.title')}</h2>
          <p className="mt-4 text-sm leading-relaxed text-slate-600 sm:text-base">{t('home.contact.intro')}</p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-5">
          <div className="rounded-2xl border border-line bg-canvas p-6 sm:p-8 lg:col-span-2">
            <h3 className="text-base font-bold text-slate-900">{t('home.contact.infoTitle')}</h3>
            <dl className="mt-6 space-y-5">
              {CONTACTS.map(({ key, icon: Icon, href }) => {
                const value = t(`home.contact.values.${key}`);
                return (
                  <div key={key} className="flex items-start gap-3.5">
                    <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <dt className="text-xs font-medium text-slate-500">{t(`home.contact.${key}`)}</dt>
                      <dd className="mt-0.5 wrap-break-word text-sm font-semibold text-slate-900">
                        {href
                          ? <a href={href(value)} className="rounded transition-colors hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">{value}</a>
                          : value}
                      </dd>
                    </div>
                  </div>
                );
              })}
            </dl>
            <div className="mt-6 border-t border-line pt-5">
              <Link to="/contact" className="inline-flex items-center gap-1.5 rounded text-sm font-semibold text-brand transition-colors hover:text-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
                {t('contactPage.formTitle')}
                <ArrowRight aria-hidden className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className={`flex flex-col gap-8 rounded-2xl bg-dark p-6 text-surface shadow-float sm:p-8 lg:col-span-3 ${start ? 'justify-center' : 'justify-between'}`}>
            {start ? (
              <>
                <p className="text-xl font-bold leading-snug tracking-tight sm:text-2xl">{t('home.contact.signedIn')}</p>
                <Link to={start.to} className={`${ctaPrimaryOnDark} self-start`}>
                  {start.label}
                  <ArrowRight aria-hidden className="h-4 w-4" />
                </Link>
              </>
            ) : (
              <>
                <div>
                  <h3 className="text-xl font-bold tracking-tight sm:text-2xl">{t('home.contact.cardTitle')}</h3>
                  <ol className="mt-6 space-y-4">
                    {tList('home.contact.cardSteps').map((step, i) => (
                      <li key={step} className="flex items-center gap-3 text-sm text-surface">
                        <span aria-hidden className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-dark-hover text-xs font-bold text-brand-on-dark">
                          {i + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
                <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6">
                  <Link to="/signup" className={ctaPrimaryOnDark}>
                    {t('home.contact.signUp')}
                    <ArrowRight aria-hidden className="h-4 w-4" />
                  </Link>
                  <p className="text-sm text-surface">
                    {t('home.contact.haveAccount')}{' '}
                    <Link to="/login" className="rounded font-semibold text-surface underline underline-offset-4 transition-colors hover:text-brand-on-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-on-dark">
                      {t('home.cta.logIn')}
                    </Link>
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default ContactSection;
