import React, { useState } from 'react';
import { ArrowLeft, Play, Save } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { AdminButton, AdminCard, AdminPageFrame } from './AdminPageFrame';

const promptData: Record<string,{name:string;used:string;version:number;body:string}> = {
  pr1:{name:'Direction suggestion (free)',used:'Homeowner AI directions',version:3,body:'You are an interior design assistant for Vietnamese townhouses and level-4 houses.\nCreate {n} design directions for this brief.\nBuilding: {building}\nPlot: {plot}\nStyle preferences: {style}\nBudget: {budget}\nObey these locked constraints: {constraints}\nFor each direction return a name, a palette, key materials and an estimated budget.'},
  pr2:{name:'Concept render (designer)',used:'Designer AI Studio',version:5,body:'Render {n} interior concepts for the {room}.\nStyle: {style}\nObey these locked constraints: {constraints}\nKeep furniture inside the room limits and keep the total near {budget}.'},
  pr3:{name:'Mood board & palette',used:'Designer AI Studio',version:2,body:'Create a mood board and a five-colour palette for the {style} style in the {room}.'},
  pr4:{name:'Cost optimization',used:'Designer budget page',version:2,body:'Suggest cheaper options that keep the {style} look. Stay inside {budget} and respect {constraints}.'},
};

export const AdminPromptDetail: React.FC = () => {
  const navigate = useNavigate();
  const {promptId='pr1'} = useParams();
  const prompt = promptData[promptId] ?? promptData.pr1;
  const [name,setName] = useState(prompt.name);
  const [body,setBody] = useState(prompt.body);
  const [testStyle,setTestStyle] = useState('Japandi');
  const [testResult,setTestResult] = useState(false);
  const [notice,setNotice] = useState('');
  const insertVariable = (variable:string) => setBody((current)=>`${current}${current.endsWith('\n')?'':'\n'}${variable}`);
  return <AdminPageFrame title={name} description={`Prompt library · Used by ${prompt.used}`} action={<div className="flex flex-wrap gap-2"><AdminButton secondary onClick={()=>{setNotice('Draft saved in this demo session.');window.setTimeout(()=>setNotice(''),2500)}}><Save size={15}/> Save as draft</AdminButton><AdminButton onClick={()=>{setNotice(`Saved as v${prompt.version+1} and activated in this demo.`);window.setTimeout(()=>setNotice(''),2500)}}>Save as v{prompt.version+1} and activate</AdminButton></div>}>
    <button onClick={()=>navigate('/admin-ai-settings')} className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-600"><ArrowLeft size={16}/> AI Settings / Prompt library</button>
    {notice&&<div role="status" className="mb-4 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-800">{notice}</div>}
    <div className="mb-5 flex items-center gap-2 text-sm text-slate-500">Version <b className="text-slate-800">v{prompt.version}</b><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Active</span></div>
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.8fr)]"><div className="space-y-5"><AdminCard title="Prompt editor"><label className="mb-4 block text-sm font-semibold text-slate-700">Name<input value={name} onChange={(event)=>setName(event.target.value)} className="mt-1.5 block w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal"/></label><label className="block text-sm font-semibold text-slate-700">Prompt<textarea value={body} onChange={(event)=>setBody(event.target.value)} rows={13} className="mt-1.5 block w-full rounded-xl border border-slate-200 px-3 py-3 font-mono text-sm leading-6 font-normal outline-none focus:border-blue-400"/></label><div className="mt-4"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Insert a variable</p><div className="flex flex-wrap gap-2">{['{n}','{style}','{room}','{budget}','{constraints}','{building}','{plot}'].map((variable)=><button key={variable} onClick={()=>insertVariable(variable)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 font-mono text-xs text-blue-700 hover:bg-blue-50">{variable}</button>)}</div></div></AdminCard><AdminCard title="Test prompt"><div className="flex flex-wrap items-center gap-3"><label className="text-sm text-slate-600">Sample style<select value={testStyle} onChange={(event)=>setTestStyle(event.target.value)} className="ml-2 rounded-lg border border-slate-200 bg-white px-3 py-2"><option>Japandi</option><option>Minimalist</option><option>Indochine</option></select></label><AdminButton onClick={()=>setTestResult(true)}><Play size={15}/> Run demo test</AdminButton></div>{testResult?<div className="mt-5 rounded-xl border border-slate-100 bg-slate-50 p-4"><b className="text-slate-800">Direction 1 · Warm {testStyle}</b><p className="mt-2 text-sm leading-6 text-slate-600">Light oak flooring, matte white walls and linen curtains. The sofa stays within the room limits.</p><p className="mt-3 text-sm font-semibold text-emerald-700">Estimated VND 640M</p><p className="mt-3 text-xs text-slate-400">Static sample result for the prototype; no AI API is called.</p></div>:<p className="mt-5 rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">Run a demo test to preview a sample output.</p>}</AdminCard></div>
      <div className="space-y-5"><AdminCard title="Versions">{Array.from({length:Math.min(prompt.version,4)},(_,index)=>{const version=prompt.version-index;return <div key={version} className="flex items-center justify-between border-t border-slate-100 py-3 first:border-0"><div><b className="text-sm text-slate-700">v{version}</b><p className="mt-1 text-xs text-slate-400">{index===0?'02 Oct · Admin':`${18-index*4} Sep · Admin`}</p></div><span className={`rounded-full px-2 py-1 text-xs ${index===0?'bg-emerald-50 text-emerald-700':'bg-slate-100 text-slate-500'}`}>{index===0?'Active':'Archived'}</span></div>})}</AdminCard><AdminCard><p className="text-sm font-semibold text-slate-800">Version history</p><p className="mt-2 text-sm leading-6 text-slate-500">Saving and activating creates a new version. Previous versions stay in the history and can be restored when connected to the backend.</p></AdminCard></div>
    </div>
  </AdminPageFrame>;
};
export default AdminPromptDetail;
