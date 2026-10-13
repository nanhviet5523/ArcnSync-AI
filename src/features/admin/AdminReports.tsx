import React, { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { AdminButton, AdminCard, AdminPageFrame, AdminTable } from './AdminPageFrame';
import { useDemoWorkspace } from '@/hooks/useDemoWorkspace';

const issues = [
  {title:'Image generation is slower than usual',detail:'Average 38 s per concept in the last 2 hours (normal is 20 s).',severity:'Warning',since:'2 h ago'},
  {title:'File storage above 60%',detail:'62% of 500 GB used. Delivery files are the largest share.',severity:'Info',since:'Yesterday'},
  {title:'Catalog import failed for Noi That Viet',detail:'ntv-lighting.csv had 34 errors. The supplier has the error report.',severity:'Warning',since:'21 Aug'},
];
const tabs = ['Overview','Activity log','Issues'];

export const AdminReports: React.FC = () => {
  const workspace=useDemoWorkspace();
  const [params,setParams] = useSearchParams();
  const tabKey = params.get('tab');
  const tab = tabKey === 'issues' ? 'Issues' : tabKey === 'log' ? 'Activity log' : 'Overview';
  const [range,setRange] = useState('Last 7 days');
  const [role,setRole] = useState('All roles');
  const [query,setQuery] = useState('');
  const [resolved,setResolved] = useState<string[]>([]);
  const overviewStats: [string, string][] = [
    ['New requests', String(workspace.requests.filter((request) => request.status === 'AI brief ready').length)],
    ['Projects started', String(workspace.projects.length)],
    ['Contracts signed', String(workspace.contracts.filter((contract) => contract.status === 'Signed').length)],
    ['Design versions', String(workspace.versions.length)],
  ];
  const stageCounts: [string, number][] = [
    ['Requirements', workspace.projects.filter((project) => project.stage === 'Requirements').length],
    ['Concept', workspace.projects.filter((project) => project.stage === 'Concept').length],
    ['Review', workspace.projects.filter((project) => project.stage === 'Design review').length],
    ['Products & BOM', workspace.projects.filter((project) => project.stage === 'Product selection').length],
    ['Approval', 0],
    ['Handover', workspace.projects.filter((project) => project.stage === 'Handover').length],
  ];
  const logs=workspace.activity.map((item)=>[item.at,item.actor,item.role,item.action,item.target]);
  const filtered = useMemo(()=>logs.filter((row)=>(role==='All roles'||row[2]===role)&&row.join(' ').toLowerCase().includes(query.toLowerCase())),[role,query,workspace]);
  const selectTab = (value:string) => setParams(value==='Overview'?{}:{tab:value==='Issues'?'issues':'log'});
  const exportReport = () => {
    const csv = ['Time,User,Role,Action,Target',...filtered.map((row)=>row.map((cell)=>`"${cell.replaceAll('"','""')}"`).join(','))].join('\n');
    const link=document.createElement('a'); link.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'})); link.download='archsync-admin-activity.csv'; link.click(); URL.revokeObjectURL(link.href);
  };
  return <AdminPageFrame title="Reports & activity" description="Review platform usage, account activity, and issues that need attention." action={<AdminButton secondary onClick={exportReport}><Download size={16}/> Export report</AdminButton>}>
    <div className="mb-5 flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1">{tabs.map((item)=><button key={item} onClick={()=>selectTab(item)} className={`whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-semibold ${tab===item?'bg-blue-50 text-blue-700':'text-slate-500 hover:bg-slate-50'}`}>{item}{item==='Issues'?' (3)':''}</button>)}</div>
    {tab==='Overview'&&<><div className="mb-5 flex flex-wrap gap-2">{['Last 7 days','Last 30 days','Last 90 days'].map((item)=><button key={item} onClick={()=>setRange(item)} className={`rounded-lg px-3 py-2 text-sm font-semibold ${range===item?'bg-blue-600 text-white':'border border-slate-200 bg-white text-slate-600'}`}>{item}</button>)}</div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{overviewStats.map(([label,value])=><div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{label}</p><b className="mt-2 block text-2xl text-slate-900">{value}</b><span className="text-xs text-slate-400">Current demo data</span></div>)}</div><div className="mt-5 grid gap-5 lg:grid-cols-2"><AdminCard title="Projects by stage">{stageCounts.map(([label,value])=><div key={label} className="mb-4 last:mb-0"><div className="mb-1 flex justify-between text-sm"><span className="text-slate-600">{label}</span><b>{value}</b></div><div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-teal-500" style={{width:`${Number(value)/Math.max(workspace.projects.length,1)*100}%`}}/></div></div>)}<p className="mt-4 text-xs text-slate-400">{workspace.projects.length} shared projects</p></AdminCard><AdminCard title="Contract value by package">{(['Essential','Standard','Premium'] as const).map((name)=>{const contracts=workspace.contracts.filter((contract)=>contract.packageName===name);const total=contracts.reduce((sum,contract)=>sum+contract.fee,0);return <div key={name} className="mb-4 last:mb-0"><div className="mb-1 flex justify-between text-sm"><span className="font-medium text-slate-700">{name}<small className="ml-2 text-slate-400">{contracts.length} contracts</small></span><b>VND {(total/1e6).toLocaleString()}M</b></div><div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-blue-500" style={{width:`${total/Math.max(workspace.contracts.reduce((sum,contract)=>sum+contract.fee,0),1)*100}%`}}/></div></div>})}<p className="mt-4 text-xs text-slate-400">Total VND {(workspace.contracts.reduce((sum,contract)=>sum+contract.fee,0)/1e6).toLocaleString()}M across {workspace.contracts.length} contracts</p></AdminCard></div></>}
    {tab==='Activity log'&&<AdminCard><div className="mb-4 flex flex-col gap-3 sm:flex-row"><input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Search activity" className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm"/><select value={role} onChange={(event)=>setRole(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option>All roles</option>{['Homeowner','Designer','Staff','Supplier','Admin'].map((item)=><option key={item}>{item}</option>)}</select></div><AdminTable headings={['Time','User','Role','Action','Target']}>{filtered.map((row,index)=><tr key={`${row[0]}-${index}`}>{row.map((cell,i)=><td key={`${cell}-${i}`} className="px-4 py-3.5 text-slate-600">{cell}</td>)}</tr>)}</AdminTable><p className="mt-3 text-xs text-slate-400">Showing {filtered.length} events</p></AdminCard>}
    {tab==='Issues'&&<AdminCard title="Platform issues"><div className="divide-y divide-slate-100">{issues.map((issue)=>{const done=resolved.includes(issue.title);return <div key={issue.title} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 md:flex-row md:items-center"><span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${issue.severity==='Warning'?'bg-amber-500':'bg-blue-500'}`}/><div className="flex-1"><p className="font-semibold text-slate-800">{issue.title}</p><p className="mt-1 text-sm leading-6 text-slate-500">{issue.detail}</p><p className="mt-1 text-xs text-slate-400">{issue.severity} · since {issue.since}</p></div>{done?<span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">Resolved</span>:<div className="flex gap-2"><AdminButton secondary onClick={(event)=>{event.currentTarget.disabled=true;event.currentTarget.textContent='Acknowledged'}}>Acknowledge</AdminButton><AdminButton onClick={()=>setResolved((current)=>[...current,issue.title])}>Resolve</AdminButton></div>}</div>})}</div></AdminCard>}
  </AdminPageFrame>;
};
export default AdminReports;
