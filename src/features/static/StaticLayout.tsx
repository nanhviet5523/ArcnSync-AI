import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
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
        <section className="relative overflow-hidden bg-dark px-6 py-16 text-[#FBF8EF] lg:px-16 lg:py-20">
          <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-dark-hover/40 blur-3xl" />
          <div className="relative mx-auto w-full max-w-[1200px]">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-on-dark">{eyebrow}</p>
            <h1 className="mt-3 max-w-3xl text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-5xl">{title}</h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#A2AE86] lg:text-lg">{subtitle}</p>
            {heroExtra}
          </div>
        </section>
        {children}
      </main>
      <Footer />
    </div>
  );
}
