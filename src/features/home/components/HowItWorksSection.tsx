import React from 'react';
import { Edit3, Sparkles, Users, Home } from 'lucide-react';

const STEPS = [
  {
    icon: Edit3,
    step: 'Step 1',
    title: 'Describe',
    desc: 'Share your house type, size, budget and 2D / 3D plans in a short guided brief.',
  },
  {
    icon: Sparkles,
    step: 'Step 2',
    title: 'AI Directions',
    desc: 'AI suggests design directions for free. Compare styles before you talk to anyone.',
  },
  {
    icon: Users,
    step: 'Step 3',
    title: 'Consult & Contract',
    desc: 'Meet our designers by chat or video call. Our staff prepares your contract.',
  },
  {
    icon: Home,
    step: 'Step 4',
    title: 'Design & Deliver',
    desc: 'Review versions, approve, and receive drawings, 3D, furniture list and cost estimate.',
  },
];

export const HowItWorksSection: React.FC = () => {
  return (
    <section className="w-full bg-slate-50 px-6 lg:px-12 py-20 text-center">
      <div className="max-w-7xl mx-auto">
        <span className="text-xs font-bold text-teal-600 tracking-widest uppercase">
          HOW IT WORKS
        </span>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 mt-2 mb-12 tracking-tight">
          Four steps from brief to finished design
        </h2>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {STEPS.map((s, idx) => {
            const Icon = s.icon;
            return (
              <div
                key={idx}
                className="relative bg-white border border-slate-100 rounded-2xl p-6 sm:p-7 text-left shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-200 flex flex-col justify-between"
              >
                {/* Badge Step */}
                <span className="absolute top-6 right-6 text-xs font-medium text-slate-400">
                  {s.step}
                </span>

                <div>
                  {/* Icon Wrapper */}
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-5">
                    <Icon className="w-5 h-5" />
                  </div>

                  {/* Content */}
                  <h3 className="text-lg font-bold text-slate-900 mb-2">
                    {s.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                    {s.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;