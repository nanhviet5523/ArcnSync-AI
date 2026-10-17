import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Download, CalendarDays } from 'lucide-react';
import { Header } from '@/components/layout';
import { Footer } from '@/components/layout';
import { useDemoWorkspace } from '@/hooks/useDemoWorkspace';
import { workspaceApi } from '@/services/workspaceApi';

export const StaffRequestDetail: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const workspace = useDemoWorkspace();
  const project = workspace.projects.find((item) => item.id === params.get('projectId')) ?? workspace.projects[0];
  const [selectedDesigner, setSelectedDesigner] = useState(project?.designerEmail === 'designer.demo@archsync.test' ? project.designerEmail : 'designer.demo@archsync.test');
  const [saving, setSaving] = useState(false);
  if (!project) return null;
  const projectFiles = workspace.files.filter((file) => file.projectId === project.id);
  const projectActivity = workspace.activity.filter((item) => item.projectId === project.id).slice(0, 6);
  const assignDesigner = async () => {
    const designer = 'Nguyen Linh';
    setSaving(true);
    await workspaceApi.assignDesigner(project.id, designer, selectedDesigner, 'Tran Nam');
    setSaving(false);
  };
  return (
    <div className="min-h-screen bg-slate-50/60 font-sans flex flex-col">
      <Header role="staff" />
      <main className="w-full max-w-[1440px] mx-auto px-6 lg:px-12 py-10 flex-1">
        <button onClick={() => navigate('/staff-requests')} className="text-sm text-blue-600 mb-4">← Requests</button>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8"><div><h1 className="text-3xl font-extrabold text-slate-900">{project.name}</h1><p className="text-slate-500 mt-1">{project.homeowner} · submitted {workspace.requests.find((request) => request.projectId === project.id)?.submittedAt} · {project.buildingType}</p></div><div className="flex gap-2"><button className="px-4 py-2.5 rounded-xl border bg-white"><CalendarDays className="inline mr-2" size={16} />Book consultation</button><button onClick={() => navigate(`/create-contract?projectId=${project.id}`)} className="px-4 py-2.5 rounded-xl bg-blue-600 text-white font-semibold">Create contract</button></div></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <section className="bg-white rounded-2xl border border-slate-100 p-6"><h2 className="text-lg font-bold mb-4">AI design brief</h2><p className="text-slate-600 leading-7">{project.brief}</p><h3 className="font-semibold mt-6 mb-3">Recommended styles</h3><div className="space-y-3">{[[project.style, 92], ['Warm minimal', 86], ['Scandinavian', 71]].map(([name, value]) => <div key={name} className="flex items-center gap-4"><span className="w-32">{name}</span><div className="flex-1 h-2 bg-slate-100 rounded-full"><div className="h-2 rounded-full bg-blue-600" style={{ width: `${value}%` }} /></div><b>{value}%</b></div>)}</div></section>
            <section className="bg-white rounded-2xl border border-slate-100 p-6"><h2 className="text-lg font-bold mb-4">Homeowner's input</h2><dl className="grid grid-cols-2 gap-y-4 text-sm"><dt className="text-slate-500">Property</dt><dd>{project.buildingType}, {project.area} m²</dd><dt className="text-slate-500">Floors</dt><dd>{project.floors}</dd><dt className="text-slate-500">Budget</dt><dd>VND {Math.round(project.budgetMin / 1e6)}–{Math.round(project.budgetMax / 1e6)}M</dd><dt className="text-slate-500">Preferred style</dt><dd>{project.style}</dd></dl><p className="mt-5 text-slate-600">{project.brief}</p></section>
            <section className="bg-white rounded-2xl border border-slate-100 p-6"><h2 className="text-lg font-bold mb-3">Files from homeowner</h2>{projectFiles.filter((file) => file.type === 'Homeowner upload').map((file) => <div key={file.id} className="flex items-center justify-between py-3 border-b last:border-0"><span>{file.name} · {file.size}</span><button aria-label={`Download ${file.name}`} className="text-blue-600"><Download size={18} /></button></div>)}</section>
          </div>
          <aside className="space-y-6"><section className="bg-white rounded-2xl border border-slate-100 p-6"><h2 className="font-bold mb-4">Assign designer</h2><select value={selectedDesigner} onChange={(event) => setSelectedDesigner(event.target.value)} className="w-full rounded-lg border border-slate-200 p-2 text-sm"><option value="designer.demo@archsync.test">Nguyen Linh</option></select><button disabled={saving} onClick={assignDesigner} className="mt-3 w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving ? 'Saving…' : 'Assign to project'}</button></section><section className="bg-white rounded-2xl border border-slate-100 p-6"><h2 className="font-bold mb-4">Homeowner</h2><p className="font-semibold">{project.homeowner}</p><p className="text-sm text-slate-500">{project.homeownerEmail}</p><button onClick={() => navigate(`/messages?projectId=${project.id}`)} className="mt-4 text-blue-600 font-semibold">Open project chat</button></section><section className="bg-white rounded-2xl border border-slate-100 p-6"><h2 className="font-bold mb-3">Activity</h2>{projectActivity.map((item) => <p key={item.id} className="mt-3 text-sm text-slate-600">{item.actor} · {item.action} · {item.at}</p>)}</section></aside>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default StaffRequestDetail;
