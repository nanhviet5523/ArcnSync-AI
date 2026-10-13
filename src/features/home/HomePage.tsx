import React, { useEffect, useState } from 'react';
import { Header } from '@/components/layout';
import { Footer } from '@/components/layout';
import { HeroSection } from './components/HeroSection';
import { HowItWorksSection } from './components/HowItWorksSection';
import { InspirationsSection } from './components/InspirationsSection';
import { FeaturesSection } from './components/FeaturesSection';
import { CtaSection } from './components/CtaSection';

interface HomePageProps {
  onNavigateToLogin?: () => void;
  onNavigateToSignUp?: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onNavigateToLogin,
  onNavigateToSignUp,
}) => {
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);

  useEffect(() => {
    if (!loginPromptOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLoginPromptOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [loginPromptOpen]);

  const promptLogin = () => setLoginPromptOpen(true);

  return (
    <div className="min-h-screen bg-white font-sans">
      <Header
        onLoginClick={onNavigateToLogin}
        onSignUpClick={onNavigateToSignUp}
      />
      <main>
        <HeroSection onFeatureClick={promptLogin} />
        <HowItWorksSection />
        <InspirationsSection onFeatureClick={promptLogin} />
        <FeaturesSection />
        <CtaSection onFeatureClick={promptLogin} />
      </main>
      <Footer />
      {loginPromptOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 px-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setLoginPromptOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="login-prompt-title"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl sm:p-7"
          >
            <h2 id="login-prompt-title" className="text-xl font-bold text-slate-900">
              Log in to access this feature
            </h2>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setLoginPromptOpen(false)}
                className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginPromptOpen(false);
                  onNavigateToLogin?.();
                }}
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Confirm
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default HomePage;
