import React from 'react';
import { Sparkles } from 'lucide-react';
import bannerImg from '@/assets/login-banner.jpg';
import { SignUpForm } from "./SignUpForm";

interface SignUpPageProps {
  onNavigateToLogin?: () => void;
}

export const SignUpPage: React.FC<SignUpPageProps> = ({ onNavigateToLogin }) => {
  return (
    <div className="flex w-full h-screen overflow-hidden font-sans bg-white">
      {/* Left Column: Hero Banner Section (50%) */}
      <div
        className="hidden md:flex flex-1 relative bg-cover bg-center p-12 lg:p-16 flex-col justify-end text-white"
        style={{
          backgroundImage: `linear-gradient(to top, rgba(11, 19, 43, 0.9), rgba(0, 0, 0, 0.15)), url(${bannerImg})`,
        }}
      >
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-medium w-fit mb-6">
          <Sparkles className="w-3.5 h-3.5 text-sky-400" />
          <span>Join in under 2 minutes</span>
        </div>

        {/* Heading & Subtitle */}
        <h2 className="text-3xl lg:text-4xl font-extrabold leading-tight mb-4 max-w-lg">
          From your idea to your dream space.
        </h2>
        <p className="text-sm lg:text-base text-slate-300 max-w-md leading-relaxed">
          Create your project, get free AI directions and talk to our design team.
        </p>
      </div>

      {/* Right Column: Form Section (50%) */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-16 overflow-hidden bg-white">
        <SignUpForm onLoginClick={onNavigateToLogin} />
      </div>
    </div>
  );
};

export default SignUpPage;