import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AdminButton, AdminCard, AdminPageFrame, AdminTable } from './AdminPageFrame';

const prompts = [
  {id:'pr1',name:'Direction suggestion (free)',used:'Homeowner AI directions',version:3,status:'Active'},
  {id:'pr2',name:'Concept render (designer)',used:'Designer AI Studio',version:5,status:'Active'},
  {id:'pr3',name:'Mood board & palette',used:'Designer AI Studio',version:2,status:'Active'},
  {id:'pr4',name:'Cost optimization',used:'Designer budget page',version:2,status:'Active'},
];

export const AdminAISettings: React.FC = () => {
  const navigate = useNavigate();
  const [freeDirections,setFreeDirections] = useState(true);
  const [showBudget,setShowBudget] = useState(true);
  const [limits,setLimits] = useState({directions:'3',daily:'20',concepts:'4'});
  const [saved,setSaved] = useState(false);
  return <AdminPageFrame title="AI settings" description="Configure generation limits and the prompts that shape AI output." action={<AdminButton onClick={()=>{setSaved(true);window.setTimeout(()=>setSaved(false),2000)}}>{saved?'Saved':'Save changes'}</AdminButton>}>
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.9fr)]"><div className="space-y-5"><AdminCard title="Prompt library"><div className="mb-4 flex items-center justify-between"><p className="text-sm text-slate-500">Prompts used by homeowner and designer AI tools.</p><AdminButton secondary onClick={()=>window.alert('Demo: create a prompt')}>+ New</AdminButton></div><AdminTable headings={['Prompt','Used by','Version','Status','']}>
      {prompts.map((prompt)=><tr key={prompt.id} className="cursor-pointer hover:bg-slate-50" onClick={()=>navigate(`/admin-prompts/${prompt.id}`)}><td className="px-4 py-3.5 font-semibold text-slate-800">{prompt.name}</td><td className="px-4 py-3.5 text-slate-500">{prompt.used}</td><td className="px-4 py-3.5 text-slate-500">v{prompt.version}</td><td className="px-4 py-3.5"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">{prompt.status}</span></td><td className="px-4 py-3.5"><button aria-label={`Edit ${prompt.name}`}><ArrowRight size={16} className="text-blue-600"/></button></td></tr>)}
    </AdminTable></AdminCard><AdminCard title="Usage this month"><div className="mb-4 flex items-baseline justify-between"><p className="text-sm text-slate-500">Total generations</p><strong className="text-2xl text-slate-900">1,248</strong></div>{[['Homeowner directions',812],['Designer concepts',372],['Mood boards',40],['Cost optimization',24]].map(([name,value])=><div key={name} className="mb-4 last:mb-0"><div className="mb-1.5 flex justify-between text-sm"><span className="text-slate-600">{name}</span><b>{value}</b></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-500" style={{width:`${Math.max(4,Number(value)/812*100)}%`}}/></div></div>)}</AdminCard></div>
      <div className="space-y-5"><AdminCard title="Feature switches">{[[freeDirections,setFreeDirections,'Free AI directions for homeowners'],[showBudget,setShowBudget,'Show estimated budget in directions']].map(([value,setter,label])=><div key={String(label)} className="flex items-center justify-between gap-3 border-t border-slate-100 py-4 first:border-0"><span className="text-sm text-slate-700">{label as string}</span><button role="switch" aria-checked={value as boolean} onClick={()=> (setter as React.Dispatch<React.SetStateAction<boolean>>)(!(value as boolean))} className={`relative h-6 w-11 rounded-full ${value?'bg-blue-600':'bg-slate-300'}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white ${value?'left-6':'left-1'}`}/></button></div>)}</AdminCard><AdminCard title="Generation limits"><div className="space-y-4">{[['directions','Directions per project'],['daily','Designer generations / day'],['concepts','Concepts per run (max)']].map(([key,label])=><label key={key} className="block text-sm text-slate-600">{label}<input type="number" min="1" value={limits[key as keyof typeof limits]} onChange={(event)=>setLimits({...limits,[key]:event.target.value})} className="mt-1.5 block w-full rounded-xl border border-slate-200 px-3 py-2.5"/></label>)}</div></AdminCard><AdminCard title="Provider status"><div className="flex justify-between border-t border-slate-100 py-3 first:border-0"><span className="text-sm text-slate-600">Generative AI service</span><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Operational</span></div><div className="flex justify-between border-t border-slate-100 py-3"><span className="text-sm text-slate-600">Average response</span><b className="text-sm">38 s</b></div><p className="mt-2 text-xs text-slate-400">Prototype values; live provider metrics require backend integration.</p></AdminCard></div>
    </div>
  </AdminPageFrame>;
};
export default AdminAISettings;
