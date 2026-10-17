import React from 'react';
import { Button } from '@/components/common';

const INSPIRATION_CARDS = [
  {
    style: 'Minimalist',
    area: '35 m²',
    title: 'Minimalist Kitchen',
    designer: 'ArchSync Studio',
    img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=800&auto=format&fit=crop',
  },
  {
    style: 'Japandi',
    area: '42 m²',
    title: 'Cozy Living Room',
    designer: 'ArchSync Studio',
    img: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?q=80&w=800&auto=format&fit=crop',
  },
  {
    style: 'Modern',
    area: '18 m²',
    title: 'Bright Home Office',
    designer: 'ArchSync Studio',
    img: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?q=80&w=800&auto=format&fit=crop',
  },
];

export const InspirationsSection: React.FC<{ onFeatureClick: () => void }> = ({ onFeatureClick }) => {
  return (
    <section className="w-full bg-[#f8fafc] px-6 lg:px-12 py-20">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
          <div>
            <span className="text-xs font-bold text-teal-600 tracking-widest uppercase">
              INSPIRATION
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mt-2 mb-2 tracking-tight">
              Featured design inspirations
            </h2>
            <p className="text-sm text-slate-500">
              Completed townhouse and single-storey house projects by our in-house design team.
            </p>
          </div>

          <Button
            onClick={onFeatureClick}
            variant="outline"
            fullWidth={false}
            className="px-5 py-2 text-xs font-semibold shrink-0"
          >
            Explore all inspiration
          </Button>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
          {INSPIRATION_CARDS.map((card, idx) => (
            <div
              key={idx}
              className="group rounded-3xl overflow-hidden bg-white border border-slate-100/80 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col cursor-pointer"
            >
              {/* Image Container */}
              <div className="h-64 overflow-hidden relative">
                <img
                  src={card.img}
                  alt={card.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>

              {/* Card Body */}
              <div className="p-6 flex flex-col flex-1 justify-between">
                <div>
                  {/* Badges: Style & Area */}
                  <div className="flex items-center gap-2 mb-3.5">
                    <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                      {card.style}
                    </span>
                    <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                      {card.area}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">
                    {card.title}
                  </h3>
                </div>

                {/* Designer */}
                <p className="text-xs text-slate-400 mt-1">
                  Designed by <span className="text-slate-500">{card.designer}</span>
                </p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default InspirationsSection;
