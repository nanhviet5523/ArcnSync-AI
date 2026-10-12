import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, CalendarDays } from 'lucide-react';
import { Header } from '@/components/layout';
import { Footer } from '@/components/layout';

export const StaffRequestDetail: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-slate-50/60 font-sans flex flex-col">
      <Header role="staff" />
      <main className="w-full max-w-[1440px] mx-auto px-6 lg:px-12 py-10 flex-1">
        <button onClick={() => navigate('/staff-requests')} className="text-sm text-blue-600 mb-4">← Requests</button>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8"><div><h1 className="text-3xl font-extrabold text-slate-900">Modern Townhouse · Thu Duc</h1><p className="text-slate-500 mt-1">Minh Anh · submitted 07 Oct · Townhouse</p></div><div className="flex gap-2"><button className="px-4 py-2.5 rounded-xl border bg-white"><CalendarDays className="inline mr-2" size={16} />Book consultation</button><button onClick={() => navigate('/create-contract')} className="px-4 py-2.5 rounded-xl bg-blue-600 text-white font-semibold">Create contract</button></div></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <section className="bg-white rounded-2xl border border-slate-100 p-6"><h2 className="text-lg font-bold mb-4">AI design brief</h2><p className="text-slate-600 leading-7">A family of four wants a warm, calm townhouse with an open kitchen and two quiet work areas. The narrow 5 × 16 m plot limits light in the middle, so light wells and light oak finishes are recommended.</p><h3 className="font-semibold mt-6 mb-3">Recommended styles</h3><div className="space-y-3">{[['Japandi', 92], ['Warm minimal', 86], ['Scandinavian', 71]].map(([name, value]) => <div key={name} className="flex items-center gap-4"><span className="w-32">{name}</span><div className="flex-1 h-2 bg-slate-100 rounded-full"><div className="h-2 rounded-full bg-blue-600" style={{ width: `${value}%` }} /></div><b>{value}%</b></div>)}</div></section>
            <section className="bg-white rounded-2xl border border-slate-100 p-6"><h2 className="text-lg font-bold mb-4">Homeowner's input</h2><dl className="grid grid-cols-2 gap-y-4 text-sm"><dt className="text-slate-500">Property / plot</dt><dd>Townhouse · 5 × 16 m</dd><dt className="text-slate-500">Floors / floor area</dt><dd>3 floors · 80 m²</dd><dt className="text-slate-500">Household / budget</dt><dd>4 people · VND 600–900M</dd><dt className="text-slate-500">Preferences</dt><dd>Japandi, Warm minimal</dd></dl><p className="mt-5 text-slate-600">Open kitchen on the ground floor and a quiet study for two on the top floor.</p></section>
            <section className="bg-white rounded-2xl border border-slate-100 p-6"><h2 className="text-lg font-bold mb-3">Files from homeowner</h2>{['Floor plan 2D.pdf · 2.4 MB', 'Facade photo.jpg · 1.1 MB', 'Reference board.zip · 8.6 MB'].map((file) => <div key={file} className="flex items-center justify-between py-3 border-b last:border-0"><span>{file}</span><button aria-label={`Download ${file}`} className="text-blue-600"><Download size={18} /></button></div>)}</section>
          </div>
          <aside className="space-y-6"><section className="bg-white rounded-2xl border border-slate-100 p-6"><h2 className="font-bold mb-4">Consultation</h2><p className="text-slate-600">Video consultation · Today at 09:30</p><button className="mt-4 text-blue-600 font-semibold">Reschedule</button></section><section className="bg-white rounded-2xl border border-slate-100 p-6"><h2 className="font-bold mb-4">Homeowner</h2><p className="font-semibold">Minh Anh</p><p className="text-sm text-slate-500">0903 *** 421</p><p className="text-sm text-slate-500">minh.anh@mail.com</p><button onClick={() => navigate('/messages')} className="mt-4 text-blue-600 font-semibold">Open chat</button></section><section className="bg-white rounded-2xl border border-slate-100 p-6"><h2 className="font-bold mb-3">Activity</h2><p className="text-sm text-slate-600">Request submitted · 07 Oct</p><p className="text-sm text-slate-600 mt-3">AI brief generated · 07 Oct</p></section></aside>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default StaffRequestDetail;
