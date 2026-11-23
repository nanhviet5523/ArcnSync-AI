import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Ruler } from 'lucide-react';
import { t } from '@/i18n';
import type { User } from '@/types/role';
import { ctaPrimary, ctaSecondary, startFor } from '../landing';
import { ProjectPreview } from './ProjectPreview';

/** Faint drafting grid in the border colour, fading out before it reaches the text. */
const fade = 'radial-gradient(ellipse 70% 80% at 80% 45%, #000 25%, transparent 75%)';
const GRID: CSSProperties = {
  backgroundImage: 'linear-gradient(var(--bd) 1px, transparent 1px), linear-gradient(90deg, var(--bd) 1px, transparent 1px)',
  backgroundSize: '40px 40px',
  maskImage: fade,
  WebkitMaskImage: fade,
};

/** Section 1: what the platform is, the account CTAs (or the way back to your projects), and the project page preview. */
export function HeroSection({ user }: { user: User | null }) {
  const start = user ? startFor(user) : null;

  return (
    <section id="hero" className="relative scroll-mt-16 overflow-hidden bg-canvas px-6 py-16 sm:py-20 lg:px-12 lg:py-24">
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-70" style={GRID} />

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] xl:gap-16">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-1.5 text-xs font-medium text-slate-700 shadow-card">
            <Ruler aria-hidden className="h-3.5 w-3.5 shrink-0 text-brand" />
            {t('home.hero.eyebrow')}
          </p>
          <h1 className="mt-6 text-3xl font-extrabold leading-[1.15] tracking-tight text-slate-900 sm:text-4xl xl:text-[44px]">
            {t('home.hero.title')}
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600">{t('home.hero.description')}</p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {start ? (
              <Link to={start.to} className={ctaPrimary}>
                {start.label}
                <ArrowRight aria-hidden className="h-4 w-4" />
              </Link>
            ) : (
              <>
                <Link to="/signup" className={ctaPrimary}>
                  {t('home.cta.signUp')}
                  <ArrowRight aria-hidden className="h-4 w-4" />
                </Link>
                <Link to="/login" className={ctaSecondary}>{t('home.cta.logIn')}</Link>
              </>
            )}
          </div>
        </div>

        <ProjectPreview />
      </div>
    </section>
  );
}

export default HeroSection;
