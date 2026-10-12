import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout';
import { Footer } from '@/components/layout';

export const StaffAddendum: React.FC = () => {
  const navigate = useNavigate();
  const [rounds, setRounds] = useState(1);
  const [reason, setReason] = useState('Homeowner requested an additional design round after reviewing the latest version.');
  return (
    <div className="min-h-screen bg-slate-50/60 font-sans flex flex-col">
      <Header role="staff" />
      <main className="w-full max-w-[1440px] mx-auto px-6 lg:px-12 py-10 flex-1">
        <button onClick={() => navigate('/staff-projects')} className="text-sm text-blue-600 mb-4">← Projects</button>
        <div className="mb-8"><h1 className="text-3xl font-extrabold text-slate-900">Create addendum</h1><p className="text-sm text-slate-500 mt-1">Add design rounds to C-2026-014 · Modern Townhouse · Thu Duc</p></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6"><div className="lg:col-span-2 space-y-6">
          <section className="bg-white rounded-2xl border border-slate-100 p-6"><h2 className="font-bold mb-5">Project</h2><div className="grid md:grid-cols-2 gap-4"><label className="text-sm font-semibold">Project<select className="block w-full mt-2 h-11 rounded-xl border border-slate-200 px-3 font-normal"><option>Modern Townhouse · Thu Duc</option><option>Narrow Townhouse · Binh Thanh</option></select></label><label className="text-sm font-semibold">Homeowner<input readOnly value="Minh Anh" className="block w-full mt-2 h-11 rounded-xl border border-slate-200 px-3 font-normal" /></label></div><label className="block text-sm font-semibold mt-5">Reason<textarea value={reason} onChange={(event) => setReason(event.target.value)} className="block w-full min-h-28 mt-2 rounded-xl border border-slate-200 p-3 font-normal" /></label></section>
          <section className="bg-white rounded-2xl border border-slate-100 p-6"><h2 className="font-bold mb-5">Terms</h2><div className="grid md:grid-cols-3 gap-4"><label className="text-sm font-semibold">Extra rounds<div className="flex items-center gap-3 mt-2"><button onClick={() => setRounds(Math.max(1, rounds - 1))} className="w-10 h-10 rounded-lg bg-slate-100">−</button><b>{rounds}</b><button onClick={() => setRounds(Math.min(3, rounds + 1))} className="w-10 h-10 rounded-lg bg-slate-100">+</button></div></label><label className="text-sm font-semibold">Fee per round<input readOnly value="VND 5M" className="block w-full mt-2 h-11 rounded-xl border border-slate-200 px-3 font-normal" /></label><label className="text-sm font-semibold">Timeline extension<select className="block w-full mt-2 h-11 rounded-xl border border-slate-200 px-3 font-normal"><option>No change</option><option>+1 week</option><option>+2 weeks</option></select></label></div><p className="text-sm text-slate-500 mt-4">The additional fee is due when the homeowner signs the addendum.</p></section>
        </div><aside className="space-y-4"><section className="bg-white rounded-2xl border border-slate-100 p-6"><p className="text-xs uppercase tracking-wider text-teal-700 font-bold">Contract addendum</p><h2 className="text-xl font-bold mt-2">To C-2026-014</h2><dl className="mt-5 space-y-4 text-sm"><div className="flex justify-between"><dt className="text-slate-500">Original fee</dt><dd>VND 68M</dd></div><div className="flex justify-between"><dt className="text-slate-500">Extra rounds</dt><dd>{rounds} × VND 5M</dd></div><div className="flex justify-between font-bold"><dt>New total fee</dt><dd>VND {68 + rounds * 5}M</dd></div><div className="flex justify-between"><dt className="text-slate-500">Design rounds</dt><dd>3 → {3 + rounds}</dd></div></dl></section><button onClick={() => navigate('/staff-contract-detail')} className="w-full rounded-xl bg-blue-600 text-white font-semibold py-3">Send to homeowner</button><p className="text-xs text-slate-500">Staff prepares the addendum. The homeowner reviews and signs online.</p></aside></div>
      </main>
      <Footer />
    </div>
  );
};

export default StaffAddendum;
