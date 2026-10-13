import React from 'react';

export const CtaSection: React.FC<{ onFeatureClick: () => void }> = ({ onFeatureClick }) => {
  return (
    <section className="w-full bg-white py-16 px-6 lg:px-16">
      <div className="w-full max-w-[1440px] mx-auto bg-[#0B172A] rounded-3xl p-10 lg:p-14 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 shadow-xl">
        {/* Tiêu đề & Mô tả */}
        <div>
          <h2 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight mb-3">
            Ready to design your space?
          </h2>
          <p className="text-sm lg:text-base text-slate-400">
            Start with a simple brief. AI suggests directions, our designers make them real.
          </p>
        </div>

        {/* Nhóm Nút Action */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* Nút 1: Start Your Project */}
          <button
            type="button"
            onClick={onFeatureClick}
            className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition shadow-md"
          >
            Start Your Project
          </button>

          {/* Nút 2: Book a Consultation (Chuẩn nền trong suốt, viền mờ, chữ trắng) */}
          <button
            type="button"
            onClick={onFeatureClick}
            className="px-6 py-3.5 bg-transparent hover:bg-white/10 text-white border border-slate-600 font-bold text-sm rounded-xl transition"
          >
            Book a Consultation
          </button>
        </div>
      </div>
    </section>
  );
};

export default CtaSection;
