import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Footer, Header } from '@/components/layout';

/** Shell for the public info pages: shared header, dark hero, page body, footer. */
export function StaticLayout({ eyebrow, title, subtitle, children, heroExtra }: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  heroExtra?: ReactNode;
}) {
  const navigate = useNavigate();

  // footer links arrive here from the bottom of another page: start at the top
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div className="min-h-screen bg-canvas font-sans">
      <Header onLoginClick={() => navigate('/login')} onSignUpClick={() => navigate('/signup')} />
      <main>
        <section className="relative overflow-hidden bg-linear-to-br from-slate-900 via-slate-900 to-blue-900 px-6 py-16 text-white lg:px-16 lg:py-20">
          <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl" />
          <div className="relative mx-auto w-full max-w-[1200px]">
            <p className="text-sm font-semibold uppercase tracking-wide text-amber-400">{eyebrow}</p>
            <h1 className="mt-3 max-w-3xl text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-5xl">{title}</h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-300 lg:text-lg">{subtitle}</p>
            {heroExtra}
          </div>
        </section>
        {children}
      </main>
      <Footer />
    </div>
  );
}

/** Section wrapper with the shared container width. */
export function StaticSection({ title, intro, children, tone = 'canvas', id }: {
  title?: string;
  intro?: string;
  children: ReactNode;
  tone?: 'canvas' | 'surface';
  id?: string;
}) {
  return (
    <section id={id} className={`w-full px-6 py-14 lg:px-16 lg:py-16 ${tone === 'surface' ? 'border-y border-line bg-surface' : ''}`}>
      <div className="mx-auto w-full max-w-[1200px]">
        {title && <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 lg:text-3xl">{title}</h2>}
        {intro && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 lg:text-base">{intro}</p>}
        <div className={title || intro ? 'mt-8' : ''}>{children}</div>
      </div>
    </section>
  );
}

/** Dark closing call-to-action band. */
export function StaticCta({ title, body, button, to }: { title: string; body: string; button: string; to: string }) {
  return (
    <section className="w-full px-6 pb-16 lg:px-16">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col items-start justify-between gap-6 rounded-2xl border border-slate-800/80 bg-slate-900 p-8 shadow-2xl sm:flex-row sm:items-center lg:p-10">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">{title}</h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-300">{body}</p>
        </div>
        <Link to={to} className="inline-flex shrink-0 items-center justify-center rounded-xl bg-brand px-6 py-3.5 font-medium text-white shadow-lg shadow-slate-900/30 transition-all hover:bg-brand-hover">
          {button}
        </Link>
      </div>
    </section>
  );
}
