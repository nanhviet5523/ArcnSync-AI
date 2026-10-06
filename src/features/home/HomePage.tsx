import React from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
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
  return (
    <div className="min-h-screen bg-white font-sans">
      <Header
        onLoginClick={onNavigateToLogin}
        onSignUpClick={onNavigateToSignUp}
      />
      <main>
        <HeroSection />
        <HowItWorksSection />
        <InspirationsSection />
        <FeaturesSection />
        <CtaSection />
      </main>
      <Footer />
    </div>
  );
};

export default HomePage;