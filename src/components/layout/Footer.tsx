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
      { label: t('footer.contact'), to: '/contact' },
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

/* Dark ink footer (the logo's colour): closes the page and stays apart from the cream header and cards.
 * Olive stays for buttons and the current tab only. text-white is the card cream (see globals.css). */
const linkClass = 'cursor-pointer rounded text-left text-white/65 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-accent';

export const Footer: React.FC = () => (
  <footer className="w-full bg-navy px-6 py-12 text-white lg:px-12">
    <div className="mx-auto grid max-w-7xl gap-10 sm:grid-cols-2 lg:grid-cols-4">
      {/* Brand: wide on desktop so the two link columns sit on the right */}
      <div className="max-w-sm sm:col-span-2">
        <Logo size={32} to="/" tone="onDark" />
        <p className="mt-3 text-xs leading-relaxed text-white/65">{t('footer.slogan')}</p>
      </div>

      {COLUMNS.map((col) => (
        <nav key={col.title} aria-label={col.title}>
          <h4 className="mb-3.5 text-sm font-bold text-white">{col.title}</h4>
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

    <div className="mx-auto mt-10 max-w-7xl border-t border-white/15 pt-6 text-xs text-white/50">
      {t('footer.copyright')}
    </div>
  </footer>
);

export default Footer;
