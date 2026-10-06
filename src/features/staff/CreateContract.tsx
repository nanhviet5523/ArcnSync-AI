import React, { useState } from 'react';
import { Check, User, Send, Download, Lock } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export const CreateContract: React.FC = () => {
  // States quản lý form
  const [selectedPackage, setSelectedPackage] = useState<'essential' | 'standard' | 'premium'>('standard');
  const [designRounds, setDesignRounds] = useState('3');
  const [timeline, setTimeline] = useState('10 weeks');
  
  // States quản lý tính năng
  const [features, setFeatures] = useState({
    conceptDesign: true,
    visuals3D: true,
    furnitureBOM: true,
    siteSupervision: false,
  });

  const packagePrices = {
    essential: 'VND 45M',
    standard: 'VND 68M',
    premium: 'VND 95M',
  };

  const packageTotalFee = {
    essential: 'VND 45,000,000',
    standard: 'VND 68,000,000',
    premium: 'VND 95,000,000',
  };

  return (
    <div className="min-h-screen bg-slate-50/60 font-sans flex flex-col justify-between">
      <Header />

      {/* Main Content */}
      <main className="w-full max-w-[1440px] mx-auto px-6 lg:px-12 py-10 flex-1">
        {/* Title & Top Action */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Create contract
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              C-2026-014 · Modern Townhouse · Thu Duc
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-700">
              Draft
            </span>
            <button
              type="button"
              className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition"
            >
              Save draft
            </button>
          </div>
        </div>

        {/* 2 Columns Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* CỘT TRÁI (2 Cols): Form điền thông tin */}
          <div className="lg:col-span-2 space-y-6">
            {/* Box 1: Parties */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h2 className="text-sm font-bold text-slate-900 mb-4">Parties</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1.5">
                    Homeowner
                  </label>
                  <div className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800">
                    <User size={14} className="text-slate-400" />
                    <span>Minh Anh · 0903 *** 421</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1.5">
                    Company representative
                  </label>
                  <div className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800">
                    <User size={14} className="text-slate-400" />
                    <span>Tran Nam (Staff)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Box 2: Service package */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h2 className="text-sm font-bold text-slate-900 mb-4">Service package</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Gói Essential */}
                <div
                  onClick={() => setSelectedPackage('essential')}
                  className={`p-4 rounded-xl border cursor-pointer transition relative ${
                    selectedPackage === 'essential'
                      ? 'border-blue-600 bg-blue-50/20 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <h3 className="text-sm font-bold text-slate-900">Essential</h3>
                  <span className="text-[11px] font-semibold text-blue-600 block mb-2">
                    2 design rounds
                  </span>
                  <div className="text-base font-extrabold text-slate-900 mb-3">
                    VND 45M
                  </div>
                  <ul className="text-[11px] text-slate-500 space-y-1.5">
                    <li className="flex items-center gap-1.5">
                      <Check size={12} className="text-slate-400" />
                      <span>Concept design</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check size={12} className="text-slate-400" />
                      <span>3D per floor</span>
                    </li>
                  </ul>
                </div>

                {/* Gói Standard */}
                <div
                  onClick={() => setSelectedPackage('standard')}
                  className={`p-4 rounded-xl border cursor-pointer transition relative ${
                    selectedPackage === 'standard'
                      ? 'border-blue-600 bg-blue-50/30 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {selectedPackage === 'standard' && (
                    <div className="absolute top-3 right-3 text-blue-600">
                      <Check size={16} />
                    </div>
                  )}
                  <h3 className="text-sm font-bold text-slate-900">Standard</h3>
                  <span className="text-[11px] font-semibold text-blue-600 block mb-2">
                    3 design rounds
                  </span>
                  <div className="text-base font-extrabold text-slate-900 mb-3">
                    VND 68M
                  </div>
                  <ul className="text-[11px] text-slate-500 space-y-1.5">
                    <li className="flex items-center gap-1.5">
                      <Check size={12} className="text-blue-600" />
                      <span>Concept + AI studio</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check size={12} className="text-blue-600" />
                      <span>3D per floor</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check size={12} className="text-blue-600" />
                      <span>BOM & estimate</span>
                    </li>
                  </ul>
                </div>

                {/* Gói Premium */}
                <div
                  onClick={() => setSelectedPackage('premium')}
                  className={`p-4 rounded-xl border cursor-pointer transition relative ${
                    selectedPackage === 'premium'
                      ? 'border-blue-600 bg-blue-50/20 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <h3 className="text-sm font-bold text-slate-900">Premium</h3>
                  <span className="text-[11px] font-semibold text-emerald-600 block mb-2">
                    4 rounds + site visits
                  </span>
                  <div className="text-base font-extrabold text-slate-900 mb-3">
                    VND 95M
                  </div>
                  <ul className="text-[11px] text-slate-500 space-y-1.5">
                    <li className="flex items-center gap-1.5">
                      <Check size={12} className="text-slate-400" />
                      <span>Everything in Standard</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check size={12} className="text-slate-400" />
                      <span>2 site visits</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check size={12} className="text-slate-400" />
                      <span>Supplier sourcing</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Box 3: Terms */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h2 className="text-sm font-bold text-slate-900 mb-4">Terms</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1.5">
                    Design rounds included
                  </label>
                  <select
                    value={designRounds}
                    onChange={(e) => setDesignRounds(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1.5">
                    Extra round fee
                  </label>
                  <input
                    type="text"
                    defaultValue="VND 5M / round"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1.5">
                    Timeline
                  </label>
                  <select
                    value={timeline}
                    onChange={(e) => setTimeline(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="8 weeks">8 weeks</option>
                    <option value="10 weeks">10 weeks</option>
                    <option value="12 weeks">12 weeks</option>
                  </select>
                </div>
              </div>

              {/* Checkboxes List */}
              <div className="space-y-2.5 pt-2">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={features.conceptDesign}
                    onChange={(e) => setFeatures({ ...features, conceptDesign: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Concept design (AI-assisted)</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={features.visuals3D}
                    onChange={(e) => setFeatures({ ...features, visuals3D: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>3D visuals per floor</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={features.furnitureBOM}
                    onChange={(e) => setFeatures({ ...features, furnitureBOM: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Furniture & material list (BOM)</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={features.siteSupervision}
                    onChange={(e) => setFeatures({ ...features, siteSupervision: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>On-site construction supervision</span>
                </label>
              </div>
            </div>

            {/* Box 4: Payment milestones */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h2 className="text-sm font-bold text-slate-900 mb-4">Payment milestones</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/80">
                      <th className="py-2.5 px-4 rounded-l-lg">MILESTONE</th>
                      <th className="py-2.5 px-4">SHARE</th>
                      <th className="py-2.5 px-4 rounded-r-lg">AMOUNT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-800">
                    <tr>
                      <td className="py-3.5 px-4">Contract signed</td>
                      <td className="py-3.5 px-4 text-slate-500">30%</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">VND 20.4M</td>
                    </tr>
                    <tr>
                      <td className="py-3.5 px-4">Concept approved</td>
                      <td className="py-3.5 px-4 text-slate-500">40%</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">VND 27.2M</td>
                    </tr>
                    <tr>
                      <td className="py-3.5 px-4">Final handover</td>
                      <td className="py-3.5 px-4 text-slate-500">30%</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">VND 20.4M</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* CỘT PHẢI (1 Col): Preview Hợp Đồng & Action */}
          <div className="space-y-5">
            {/* Box Preview Hợp đồng */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">
                  DESIGN SERVICE CONTRACT
                </span>
                <h3 className="text-lg font-extrabold text-slate-900 mt-0.5">
                  No. C-2026-014
                </h3>
              </div>

              {/* Các đường vạch phác thảo thiết kế */}
              <div className="space-y-1.5 py-1">
                <div className="w-full h-2 bg-slate-100 rounded-full"></div>
                <div className="w-3/4 h-2 bg-slate-100 rounded-full"></div>
              </div>

              <div className="space-y-2.5 text-xs pt-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Package</span>
                  <span className="font-bold text-slate-900 capitalize">{selectedPackage}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Design rounds</span>
                  <span className="font-bold text-slate-900">{designRounds}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Timeline</span>
                  <span className="font-bold text-slate-900">{timeline}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                  <span className="text-slate-500 font-medium">Total fee</span>
                  <span className="font-extrabold text-slate-900 text-sm">
                    {packageTotalFee[selectedPackage]}
                  </span>
                </div>
              </div>

              {/* Các đường vạch mờ trang trí */}
              <div className="space-y-1.5 py-2">
                <div className="w-full h-1.5 bg-slate-100 rounded-full"></div>
                <div className="w-5/6 h-1.5 bg-slate-100 rounded-full"></div>
                <div className="w-2/3 h-1.5 bg-slate-100 rounded-full"></div>
              </div>

              {/* Ô Chữ ký giả lập */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="h-12 border border-slate-200 rounded-xl bg-slate-50/50 flex items-end p-2 text-[10px] text-slate-400">
                  Homeowner
                </div>
                <div className="h-12 border border-slate-200 rounded-xl bg-slate-50/50 flex items-end p-2 text-[10px] text-slate-400">
                  ArchSync AI
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <button
              type="button"
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2"
            >
              <Send size={14} />
              <span>Send to homeowner</span>
            </button>

            <button
              type="button"
              className="w-full py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2"
            >
              <Download size={14} />
              <span>Download PDF</span>
            </button>

            {/* Thông báo xanh */}
            <div className="bg-sky-50 border border-sky-100 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-sky-800 leading-relaxed">
              <Lock size={15} className="text-sky-600 flex-shrink-0 mt-0.5" />
              <span>
                Staff prepares the contract. The homeowner reviews and signs online.
              </span>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CreateContract;