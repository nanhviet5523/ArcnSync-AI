import React, { useEffect, useRef } from 'react';
import { Footer, Header, scrollToSection } from '@/components/layout';
import { getCurrentUser } from '@/services/authService';
import { HeroSection } from './components/HeroSection';
import { HowItWorksSection } from './components/HowItWorksSection';
import { FeaturesSection } from './components/FeaturesSection';
import { InspirationsSection } from './components/InspirationsSection';
import { ContactSection } from './components/ContactSection';

interface HomePageProps {
  onNavigateToLogin?: () => void;
  onNavigateToSignUp?: () => void;
}

/**
 * Landing page (/). Guests are sent to /signup or /login; signed-in visitors go straight to their projects.
 * No login prompts on this page.
 */
export const HomePage: React.FC<HomePageProps> = ({ onNavigateToLogin, onNavigateToSignUp }) => {
  const user = getCurrentUser();
  const rootRef = useRef<HTMLDivElement>(null);

  // Arriving with #features etc. (header or footer link on another page): scroll to the section once this page is the
  // only one in the document. During the route change the page being left can still sit above it for a frame, which
  // would put the target too far down by that page's height. Gives up waiting after ~30 frames.
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;
    let frame = 0;
    let waited = 0;
    const scrollWhenAlone = () => {
      const offset = (rootRef.current?.getBoundingClientRect().top ?? 0) + window.scrollY;
      if (offset > 1 && ++waited < 30) {
        frame = requestAnimationFrame(scrollWhenAlone);
        return;
      }
      scrollToSection(hash);
    };
    frame = requestAnimationFrame(scrollWhenAlone);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div ref={rootRef} className="min-h-screen bg-canvas font-sans">
      <Header onLoginClick={onNavigateToLogin} onSignUpClick={onNavigateToSignUp} />
      <main>
        <HeroSection user={user} />
        <HowItWorksSection />
        <FeaturesSection />
        <InspirationsSection />
        <ContactSection user={user} />
      </main>
      <Footer />
    </div>
  );
};

export default HomePage;
