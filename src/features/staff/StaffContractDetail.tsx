import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Download } from 'lucide-react';
import { Header } from '@/components/layout';
import { Footer } from '@/components/layout';

export const StaffContractDetail: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-slate-50/60 font-sans flex flex-col">
      <Header role="staff" />
      <main className="w-full max-w-[1440px] mx-auto px-6 lg:px-12 py-10 flex-1">
        <button onClick={() => navigate('/staff-contracts')} className="text-sm text-blue-600 mb-4">← Contracts</button>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8"><div><h1 className="text-3xl font-extrabold text-slate-900">C-2026-014</h1><p className="text-slate-500 mt-1">Minh Anh · Modern Townhouse · Thu Duc</p></div><div className="flex gap-2"><button className="px-4 py-2.5 rounded-xl border bg-white"><Download className="inline mr-2" size={16} />Download PDF</button><button className="px-4 py-2.5 rounded-xl border bg-white">Send reminder</button></div></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6"><div className="lg:col-span-2 space-y-6">
          <section className="bg-white rounded-2xl border border-slate-100 p-6"><div className="flex justify-between items-start"><div><h2 className="text-lg font-bold">Contract details</h2><p className="text-sm text-slate-500 mt-1">Interior design services · Standard package</p></div><span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">Awaiting signature</span></div><dl className="grid grid-cols-2 gap-y-4 mt-6 text-sm"><dt className="text-slate-500">Homeowner</dt><dd>Minh Anh</dd><dt className="text-slate-500">Project</dt><dd>Modern Townhouse · Thu Duc</dd><dt className="text-slate-500">Total fee</dt><dd>VND 68M</dd><dt className="text-slate-500">Design rounds</dt><dd>3 rounds</dd><dt className="text-slate-500">Timeline</dt><dd>10 weeks</dd></dl></section>
          <section className="bg-white rounded-2xl border border-slate-100 p-6"><h2 className="text-lg font-bold mb-4">Payment milestones</h2><div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Milestone</th><th className="p-3">Share</th><th className="p-3">Amount</th><th className="p-3">Status</th><th className="p-3"></th></tr></thead><tbody>{[['Contract signed', '30%', 'VND 20.4M', 'Locked until signed'], ['Concept approved', '40%', 'VND 27.2M', 'Locked until signed'], ['Final handover', '30%', 'VND 20.4M', 'Locked until signed']].map((row) => <tr key={row[0]} className="border-b border-slate-100"><td className="p-3 font-semibold">{row[0]}</td><td className="p-3">{row[1]}</td><td className="p-3">{row[2]}</td><td className="p-3">{row[3]}</td><td className="p-3" /></tr>)}</tbody></table></div></section>
        </div><aside className="bg-white rounded-2xl border border-slate-100 p-6 h-fit"><h2 className="font-bold mb-4">Signature activity</h2>{[['Created', 'Today, 09:00'], ['Sent to homeowner', 'Today, 10:20'], ['Viewed', 'Not viewed yet'], ['Signed', 'Pending']].map(([label, value]) => <div key={label} className="py-3 border-b last:border-0"><b className="block text-sm">{label}</b><span className="text-sm text-slate-500">{value}</span></div>)}<button onClick={() => navigate('/create-contract')} className="w-full mt-5 text-sm text-blue-600 font-semibold">Continue editing</button></aside></div>
      </main>
      <Footer />
    </div>
  );
};

export default StaffContractDetail;
