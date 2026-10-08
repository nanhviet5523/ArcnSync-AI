import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/common/Button';


export const HeroSection: React.FC = () => {
  return (
    <section className="relative w-full min-h-[560px] flex items-center px-6 lg:px-12 py-20 lg:py-28 bg-slate-900 text-white bg-cover bg-center bg-no-repeat bg-[linear-gradient(to_right,rgba(11,19,43,0.92),rgba(11,19,43,0.6)),url('https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?q=80&w=1600&auto=format&fit=crop')]">
      <div className="max-w-7xl mx-auto w-full flex flex-col items-start">
        
        {/* Badge Generative AI */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-md text-xs font-medium text-white mb-6 border border-white/20">
          <Sparkles className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span>Generative AI for architecture & interior design</span>
        </div>

        {/* Headline */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[52px] font-extrabold leading-[1.15] max-w-2xl mb-5 tracking-tight">
          From your idea to your dream space.
        </h1>

        {/* Subtitle */}
        <p className="text-sm sm:text-base text-gray-300 max-w-xl mb-9 leading-relaxed">
          Describe your house, get free AI design directions, then work with our in-house designers to turn the best one into a complete design.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
          <Button
            fullWidth={false}
            className="px-6 py-3 text-sm font-semibold bg-blue-600 hover:bg-blue-700 border-transparent text-white"
          >
            <span>Start Your Project</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>

          <Button
            variant="outline"
            fullWidth={false}
            className="px-6 py-3 text-sm font-semibold text-white border-white/30 bg-white/10 hover:bg-white/20 backdrop-blur-sm"
          >
            Book a Consultation
          </Button>
        </div>

      </div>
    </section>
  );
};

export default HeroSection;