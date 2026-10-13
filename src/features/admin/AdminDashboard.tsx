import React from 'react';
import { Activity, AlertTriangle, ArrowRight, Layers3, Sparkles, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AdminButton, AdminCard, AdminPageFrame } from './AdminPageFrame';
import { useDemoWorkspace } from '@/hooks/useDemoWorkspace';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const workspace = useDemoWorkspace();
  const stats = [
    { label: 'Demo accounts', value: '5', icon: Users, color: 'bg-blue-50 text-blue-600', path: '/admin-users' },
    { label: 'Active projects', value: String(workspace.projects.filter((project) => project.stage !== 'Handover').length), icon: Layers3, color: 'bg-teal-50 text-teal-700', path: '/admin-reports' },
    { label: 'Design versions', value: String(workspace.versions.length), icon: Sparkles, color: 'bg-violet-50 text-violet-700', path: '/admin-reports' },
    { label: 'Open inquiries', value: String(workspace.inquiries.filter((inquiry) => inquiry.status !== 'Answered').length), icon: AlertTriangle, color: 'bg-amber-50 text-amber-700', path: '/admin-reports?tab=issues' },
  ];
  const activity = workspace.activity.slice(0, 4).map((item) => [item.action, item.role, item.at]);
  return <AdminPageFrame title="Platform overview" description="Monitor activity and manage accounts, data and AI settings." action={<AdminButton secondary onClick={() => navigate('/admin-reports')}>Export report</AdminButton>}>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map(({ label, value, icon: Icon, color, path }) => <button key={label} onClick={() => navigate(path)} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><span className={`grid h-12 w-12 place-items-center rounded-xl ${color}`}><Icon size={23} /></span><span><span className="block text-sm text-slate-500">{label}</span><strong className="mt-1 block text-2xl text-slate-900">{value}</strong></span></button>)}</div>
    <div className="mt-5 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
      <div className="space-y-5">
        <AdminCard title="AI generations per day · Last 7 days"><div className="flex h-56 items-end justify-around gap-3 border-b border-slate-100 px-2 pt-5">{[['Mon',48],['Tue',72],['Wed',59],['Thu',87],['Fri',68],['Sat',38],['Sun',55]].map(([day,height])=><div key={day} className="flex h-full flex-1 flex-col items-center justify-end gap-2"><span className="w-full max-w-12 rounded-t-lg bg-blue-500/85" style={{height:`${height}%`}} /><span className="pb-2 text-xs text-slate-400">{day}</span></div>)}</div></AdminCard>
        <AdminCard title="Recent account activity"><div className="divide-y divide-slate-100">{activity.map(([message, role, time])=><div key={message} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"><span className="text-sm font-medium text-slate-700">{message}</span><span className="flex items-center gap-3 text-xs text-slate-400"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">{role}</span>{time}</span></div>)}</div><button onClick={() => navigate('/admin-reports?tab=log')} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-blue-600">View activity log <ArrowRight size={15}/></button></AdminCard>
      </div>
      <div className="space-y-5"><AdminCard title="System health"><div className="divide-y divide-slate-100">{[['AI service','Operational','bg-emerald-100 text-emerald-700'],['Video call service','Operational','bg-emerald-100 text-emerald-700'],['File storage','62% used','bg-amber-100 text-amber-700']].map(([name,status,style])=><div key={name} className="flex items-center justify-between py-3 first:pt-0 last:pb-0"><span className="text-sm text-slate-600">{name}</span><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${style}`}>{status}</span></div>)}</div></AdminCard>
        <AdminCard title="Quick actions"><div className="grid gap-2"><AdminButton onClick={() => navigate('/admin-users')}>Invite team member</AdminButton><AdminButton secondary onClick={() => navigate('/admin-users')}>Add supplier partner</AdminButton><AdminButton secondary onClick={() => navigate('/admin-ai-settings')}><Sparkles size={16}/> Edit AI prompts</AdminButton></div></AdminCard>
        <AdminCard><p className="flex items-center gap-2 text-sm font-semibold text-amber-800"><Activity size={17}/> 3 items need attention</p><p className="mt-2 text-sm leading-6 text-slate-500">Review current platform issues and recent system activity.</p><AdminButton secondary className="mt-4" onClick={() => navigate('/admin-reports?tab=issues')}>Review reports</AdminButton></AdminCard>
      </div>
    </div>
  </AdminPageFrame>;
};

export default AdminDashboard;
