import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Header } from '@/components/layout';
import { Footer } from '@/components/layout';

const requests = [
  { id: 'R1', homeowner: 'Minh Anh', project: 'Modern Townhouse · Thu Duc', type: 'Townhouse', budget: '600–900M', submitted: '07 Oct', status: 'AI brief ready' },
  { id: 'R2', homeowner: 'Hoang Gia', project: 'Level-4 House · Long An', type: 'Level-4', budget: '400–550M', submitted: '06 Oct', status: 'Consult booked' },
  { id: 'R3', homeowner: 'Phuong Vy', project: 'Narrow Townhouse · Binh Thanh', type: 'Townhouse', budget: '0.8–1.1B', submitted: '05 Oct', status: 'Contract draft' },
  { id: 'R4', homeowner: 'Tuan Kiet', project: 'Level-4 House · Dong Nai', type: 'Level-4', budget: '350–480M', submitted: '04 Oct', status: 'Needs 2D input' },
  { id: 'R5', homeowner: 'Bao Chau', project: 'Townhouse · District 7', type: 'Townhouse', budget: '1.0–1.4B', submitted: '03 Oct', status: 'Signed' },
];

const statusStyle: Record<string, string> = {
  'AI brief ready': 'bg-blue-50 text-blue-700',
  'Consult booked': 'bg-amber-50 text-amber-700',
  'Contract draft': 'bg-slate-100 text-slate-700',
  'Needs 2D input': 'bg-rose-50 text-rose-700',
  Signed: 'bg-emerald-50 text-emerald-700',
};

export const StaffRequests: React.FC = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('All');
  const [query, setQuery] = useState('');
  const visible = useMemo(() => requests.filter((item) => {
    const matchesQuery = `${item.homeowner} ${item.project}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (filter === 'All' || item.status === filter);
  }), [filter, query]);

  return (
    <div className="min-h-screen bg-slate-50/60 font-sans flex flex-col">
      <Header role="staff" />
      <main className="w-full max-w-[1440px] mx-auto px-6 lg:px-12 py-10 flex-1">
        <div className="mb-8"><h1 className="text-3xl font-extrabold text-slate-900">Requests</h1><p className="text-sm text-slate-500 mt-1">Review AI briefs, book consultations and move requests into contracts.</p></div>
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex flex-col lg:flex-row gap-4 justify-between mb-6">
            <div className="flex flex-wrap gap-2">{['All', ...Object.keys(statusStyle)].map((item) => <button key={item} onClick={() => setFilter(item)} className={`px-3 py-2 rounded-xl text-sm font-semibold ${filter === item ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{item}</button>)}</div>
            <label className="relative lg:w-72"><Search className="absolute left-3 top-3 text-slate-400" size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search requests" className="w-full h-11 pl-10 pr-3 rounded-xl border border-slate-200" /></label>
          </div>
          <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{['Homeowner', 'Project', 'Type', 'Budget', 'Submitted', 'Status', ''].map((label) => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead><tbody>{visible.map((item) => <tr key={item.id} className="border-b border-slate-100"><td className="px-4 py-4 font-semibold">{item.homeowner}</td><td className="px-4 py-4">{item.project}</td><td className="px-4 py-4">{item.type}</td><td className="px-4 py-4">{item.budget}</td><td className="px-4 py-4">{item.submitted}</td><td className="px-4 py-4"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle[item.status]}`}>{item.status}</span></td><td className="px-4 py-4"><button onClick={() => navigate('/staff-request-detail')} className="font-semibold text-blue-600">Open</button></td></tr>)}</tbody></table>{visible.length === 0 && <p className="p-8 text-center text-slate-500">No requests match this filter.</p>}</div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default StaffRequests;
