import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus } from 'lucide-react';
import { Header } from '@/components/layout';
import { Footer } from '@/components/layout';
import { useDemoWorkspace } from '@/hooks/useDemoWorkspace';

export const StaffContracts: React.FC = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('All');
  const [query, setQuery] = useState('');
  const workspace = useDemoWorkspace();
  const contracts = workspace.contracts.map((contract) => {
    const project = workspace.projects.find((item) => item.id === contract.projectId);
    return { ...contract, homeowner: project?.homeowner ?? 'Homeowner', project: project?.name ?? contract.projectId, package: contract.packageName, value: `VND ${(contract.fee / 1e6).toLocaleString()}M` };
  });
  const visible = useMemo(() => contracts.filter((item) => (filter === 'All' || item.status === filter) && `${item.id} ${item.homeowner} ${item.project}`.toLowerCase().includes(query.toLowerCase())), [contracts, filter, query]);
  const counts = ['All', 'Draft', 'Awaiting signature', 'Signed'];
  const totalAwaiting = workspace.contracts.filter((contract) => contract.status === 'Awaiting signature').reduce((total, contract) => total + contract.fee, 0);
  return (
    <div className="min-h-screen bg-slate-50/60 font-sans flex flex-col">
      <Header role="staff" />
      <main className="w-full max-w-[1440px] mx-auto px-6 lg:px-12 py-10 flex-1">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8"><div><h1 className="text-3xl font-extrabold text-slate-900">Contracts</h1><p className="text-sm text-slate-500 mt-1">Track contract signatures and milestone payments.</p></div><button onClick={() => navigate('/create-contract')} className="px-4 py-2.5 rounded-xl bg-blue-600 text-white font-semibold"><Plus className="inline mr-2" size={17} />New contract</button></div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">{[['Drafts', String(contracts.filter((contract) => contract.status === 'Draft').length)], ['Awaiting signature', String(contracts.filter((contract) => contract.status === 'Awaiting signature').length)], ['Signed', String(contracts.filter((contract) => contract.status === 'Signed').length)], ['Waiting value', `VND ${(totalAwaiting / 1e6).toLocaleString()}M`]].map(([label, value]) => <div key={label} className="bg-white rounded-2xl border border-slate-100 p-5"><span className="block text-xs font-bold uppercase text-slate-400">{label}</span><b className="block text-2xl mt-2">{value}</b></div>)}</div>
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6"><div className="flex flex-col lg:flex-row gap-4 justify-between mb-6"><div className="flex flex-wrap gap-2">{counts.map((item) => <button key={item} onClick={() => setFilter(item)} className={`px-3 py-2 rounded-xl text-sm font-semibold ${filter === item ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{item}</button>)}</div><label className="relative lg:w-72"><Search className="absolute left-3 top-3 text-slate-400" size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search contracts" className="w-full h-11 pl-10 pr-3 rounded-xl border border-slate-200" /></label></div>
          <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{['Contract', 'Homeowner', 'Project', 'Package', 'Value', 'Status', 'Updated', ''].map((x) => <th key={x} className="px-4 py-3">{x}</th>)}</tr></thead><tbody>{visible.map((item) => <tr key={item.id} className="border-b border-slate-100"><td className="px-4 py-4 font-semibold">{item.id}</td><td className="px-4 py-4">{item.homeowner}</td><td className="px-4 py-4">{item.project}</td><td className="px-4 py-4">{item.package}</td><td className="px-4 py-4">{item.value}</td><td className="px-4 py-4">{item.status}</td><td className="px-4 py-4">{item.updatedAt}</td><td className="px-4 py-4"><button onClick={() => navigate(`/staff-contract-detail?contractId=${item.id}`)} className="font-semibold text-blue-600">Open</button></td></tr>)}</tbody></table>{visible.length === 0 && <p className="p-8 text-center text-slate-500">No contracts match this filter.</p>}</div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default StaffContracts;
