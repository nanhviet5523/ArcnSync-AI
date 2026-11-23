import React from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '@/components/common';
import { t } from '@/i18n';
import { SectionLink } from './SectionLink';

/** hash: a landing-page section (scrolls there); to: a page of its own. */
const COLUMNS: { title: string; links: { label: string; hash?: string; to?: string }[] }[] = [
  {
    title: t('footer.platform'),
    links: [
      { label: t('footer.howItWorks'), hash: '#how-it-works' },
      { label: t('footer.features'), hash: '#features' },
    ],
  },
  {
    title: t('footer.legal'),
    links: [
      { label: t('footer.terms'), to: '/terms' },
      { label: t('footer.privacy'), to: '/privacy' },
    ],
  },
];

const linkClass = 'cursor-pointer rounded text-left text-slate-500 transition-colors hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-brand';

export const Footer: React.FC = () => (
  <footer className="w-full border-t border-line bg-surface px-6 py-12 text-slate-900 lg:px-12">
    <div className="mx-auto grid max-w-7xl gap-10 sm:grid-cols-2 lg:grid-cols-4">
      {/* Brand: wide on desktop so the two link columns sit on the right */}
      <div className="max-w-sm sm:col-span-2">
        <Logo size={32} to="/" />
        <p className="mt-3 text-xs leading-relaxed text-slate-500">{t('footer.slogan')}</p>
      </div>

      {COLUMNS.map((col) => (
        <nav key={col.title} aria-label={col.title}>
          <h4 className="mb-3.5 text-sm font-bold text-slate-900">{col.title}</h4>
          <ul className="space-y-2.5 text-xs">
            {col.links.map((link) => (
              <li key={link.label}>
                {link.hash
                  ? <SectionLink hash={link.hash} className={linkClass}>{link.label}</SectionLink>
                  : <Link to={link.to ?? '/'} className={linkClass}>{link.label}</Link>}
              </li>
            ))}
          </ul>
        </nav>
      ))}
    </div>

    <div className="mx-auto mt-10 max-w-7xl border-t border-line pt-6 text-xs text-slate-400">
      {t('footer.copyright')}
    </div>
  </footer>
);

export default Footer;
