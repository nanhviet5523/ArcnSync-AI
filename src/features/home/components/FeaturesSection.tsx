import React from 'react';
import { Sparkles, Grid, Home, BarChart2 } from 'lucide-react';

const FEATURES = [
  {
    icon: Sparkles,
    title: 'Free AI design directions',
    desc: 'Style directions from your brief, free for every homeowner.',
  },
  {
    icon: Grid,
    title: 'Mood boards and palettes',
    desc: 'Colours, materials and layouts that stay consistent across rooms.',
  },
  {
    icon: Home,
    title: 'Furniture and material suggestions',
    desc: 'Real products from partner suppliers that fit style and budget.',
  },
  {
    icon: BarChart2,
    title: 'Budget and cost estimates',
    desc: 'Bills of materials and estimates that update as the design changes.',
  },
];

// Danh sách 3 hình ảnh render mẫu tông Japandi/Gỗ ấm
const RENDER_IMAGES = [
  'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?q=80&w=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?q=80&w=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?q=80&w=400&auto=format&fit=crop',
];

// 5. Component Definition
export const FeaturesSection: React.FC = () => {
  return (
    <section className="w-full bg-[#0b132b] text-white px-6 lg:px-12 py-20">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
        
        {/* Cột bên trái: Nội dung giới thiệu */}
        <div className="lg:col-span-5">
          <span className="text-xs font-bold text-sky-400 tracking-widest uppercase">
            AI FEATURES
          </span>

          <h2 className="text-3xl md:text-4xl lg:text-[40px] font-extrabold leading-tight text-white mt-4 mb-10 tracking-tight">
            Generative AI that works with your designer, not instead of them
          </h2>

          <div className="space-y-7">
            {FEATURES.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div key={idx} className="flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center shrink-0 text-sky-400">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white mb-1">
                      {item.title}
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cột bên phải: Card Mockup AI Studio */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 text-slate-900 shadow-2xl w-full">
          {/* Header Card */}
          <h3 className="text-lg font-extrabold text-slate-900 mb-4">
            AI Studio
          </h3>

          {/* Prompt Box */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
            “Warm Japandi townhouse, 5 × 16 m, 3 floors, light oak, budget VND 600–900M.”
          </div>

          {/* 3 Khối ảnh render thực tế */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-6">
            {RENDER_IMAGES.map((imgUrl, index) => (
              <div key={index} className="h-32 sm:h-36 rounded-xl overflow-hidden bg-slate-100">
                <img
                  src={imgUrl}
                  alt={`AI Concept Render ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>

          {/* Dynamic Tags */}
          <div className="flex flex-wrap gap-2.5">
            <span className="text-xs font-semibold bg-blue-50 text-blue-600 px-3.5 py-1.5 rounded-full">
              Light oak
            </span>
            <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-3.5 py-1.5 rounded-full">
              Warm white
            </span>
            <span className="text-xs font-semibold bg-sky-50 text-sky-600 px-3.5 py-1.5 rounded-full">
              Sage green
            </span>
            <span className="text-xs font-semibold bg-slate-50 text-slate-500 px-3.5 py-1.5 rounded-full border border-slate-200">
              Est. cost ready
            </span>
          </div>
        </div>

      </div>
    </section>
  );
};

export default FeaturesSection;