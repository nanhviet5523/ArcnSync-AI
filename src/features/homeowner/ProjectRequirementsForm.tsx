import { useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  FileImage,
  FileText,
  Film,
  Home,
  Paperclip,
  Sparkles,
  Trash2,
  Upload,
  Users,
  Wallet,
} from 'lucide-react';
import { Logo } from '@/components/common';

const GOALS = [
  'Refresh my home',
  'Improve storage',
  'Make rooms more functional',
  'Prepare the home for a new family member',
  'Renovate for rental or resale',
  'Other',
];

const STYLES = ['Japandi', 'Modern', 'Minimalist', 'Scandinavian', 'Indochine', 'Not sure yet'];
const SPACES = ['Living room', 'Kitchen & dining', 'Main bedroom', 'Other bedrooms', 'Bathroom', 'Whole apartment'];
const fieldClass = 'mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50';
const toggleClass = (active: boolean) => `rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition ${active ? 'border-blue-600 bg-blue-50 text-blue-800 ring-1 ring-blue-600' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`;

function formatFileSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(file: File) {
  if (file.type.startsWith('video/')) return Film;
  if (file.type.startsWith('image/')) return FileImage;
  return FileText;
}

export const ProjectRequirementsForm = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const fileInput = useRef<HTMLInputElement>(null);
  const invitedEmail = searchParams.get('email') || 'minhanh@example.com';
  const [goals, setGoals] = useState<string[]>(['Refresh my home', 'Improve storage']);
  const [spaces, setSpaces] = useState<string[]>(['Living room', 'Kitchen & dining', 'Main bedroom']);
  const [style, setStyle] = useState('Japandi');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(1);
  const [elderly, setElderly] = useState(0);
  const [pets, setPets] = useState(0);
  const [budgetMin, setBudgetMin] = useState('500');
  const [budgetMax, setBudgetMax] = useState('900');
  const [specialRequirements, setSpecialRequirements] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [budgetError, setBudgetError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const householdMembers: { label: string; value: number; setValue: (value: number) => void }[] = [
    { label: 'Adults', value: adults, setValue: setAdults },
    { label: 'Children', value: children, setValue: setChildren },
    { label: 'Older adults', value: elderly, setValue: setElderly },
    { label: 'Pets', value: pets, setValue: setPets },
  ];

  const toggle = (value: string, selected: string[], update: (next: string[]) => void) => {
    update(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);
  };

  const addFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(event.target.files ?? []);
    if (picked.length) setFiles((current) => [...current, ...picked]);
    event.target.value = '';
  };

  const saveDraft = () => {
    setNotice('Sample draft saved for this preview. It is not stored on the server.');
    window.setTimeout(() => setNotice(''), 4000);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const min = Number(budgetMin);
    const max = Number(budgetMax);
    if (!min || !max || min > max) {
      setBudgetError('Enter a valid budget range. The maximum must be greater than the minimum.');
      return;
    }
    setBudgetError('');
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
        <div role="note" className="bg-amber-100 px-4 py-1.5 text-center text-xs font-semibold text-amber-900">Sample data – not connected to API</div>
        <header className="border-b border-slate-200/80 bg-white"><div className="mx-auto flex h-[68px] max-w-7xl items-center px-5 lg:px-8"><Logo size={34} to="/" /></div></header>
        <main className="mx-auto max-w-xl px-5 py-16 text-center sm:py-24">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-emerald-700"><CheckCircle2 size={28} /></span>
          <p className="mt-5 text-sm font-semibold text-emerald-700">Sample confirmation</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Your brief is ready for review</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">The project team can now review your goals, rooms, budget and uploaded files. In this preview, nothing has been saved or sent to the project team.</p>
          <div className="mt-7 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm">
            <p className="text-sm font-bold">Your brief summary</p>
            <p className="mt-2 text-sm text-slate-600">{style} · {spaces.length} spaces · VND {budgetMin}–{budgetMax}M</p>
            <p className="mt-1 text-xs text-slate-500">{goals.length} goals · {files.length} attachments</p>
          </div>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <button type="button" onClick={() => setSubmitted(false)} className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Review my answers</button>
            <button type="button" onClick={() => navigate(`/homeowner/concepts?email=${encodeURIComponent(invitedEmail)}`)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700">View sample concepts <ArrowRight size={16} /></button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <div role="note" className="bg-amber-100 px-4 py-1.5 text-center text-xs font-semibold text-amber-900">Sample data – not connected to API</div>
      <header className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between px-5 lg:px-8">
          <Logo size={34} to="/" />
          <span className="hidden text-xs text-slate-500 sm:block">Signed in as <b className="text-slate-700">{invitedEmail}</b></span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-7 lg:px-8 lg:py-10">
        <Link to={`/accept-project-invitation?email=${encodeURIComponent(invitedEmail)}`} className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-900"><ArrowLeft size={16} /> Back to invitation</Link>
        <div className="mt-5 grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <div className="mb-6">
              <p className="text-sm font-semibold text-blue-700">Project setup · Step 2 of 3</p>
              <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">Tell us about your home</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Share what matters to your household. Your designer will use this brief to prepare concepts that fit your space, lifestyle and budget.</p>
            </div>

            <div className="mb-6 grid grid-cols-3 gap-2" aria-label="Project setup progress">
              {['Accept invitation', 'Share requirements', 'Review concepts'].map((label, index) => (
                <div key={label} className={`rounded-xl border px-3 py-3 ${index < 1 ? 'border-emerald-100 bg-emerald-50' : index === 1 ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-white'}`}>
                  <div className={`grid h-6 w-6 place-items-center rounded-full text-xs font-bold ${index < 1 ? 'bg-emerald-600 text-white' : index === 1 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{index < 1 ? <Check size={14} /> : index + 1}</div>
                  <p className={`mt-2 text-xs font-semibold ${index < 1 ? 'text-emerald-800' : index === 1 ? 'text-blue-800' : 'text-slate-500'}`}>{label}</p>
                </div>
              ))}
            </div>

            {notice && <p role="status" className="mb-5 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">{notice}</p>}

            <form onSubmit={submit} className="space-y-5">
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                <div className="mb-5 flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700"><Sparkles size={19} /></span><div><h2 className="text-lg font-bold">What would you like to achieve?</h2><p className="mt-1 text-sm text-slate-500">Choose all that describe your project.</p></div></div>
                <div className="flex flex-wrap gap-2.5">{GOALS.map((goal) => <button key={goal} type="button" aria-pressed={goals.includes(goal)} onClick={() => toggle(goal, goals, setGoals)} className={toggleClass(goals.includes(goal))}>{goal}</button>)}</div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                <div className="mb-5 flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700"><Users size={19} /></span><div><h2 className="text-lg font-bold">Who lives in your home?</h2><p className="mt-1 text-sm text-slate-500">This helps us plan for daily routines and accessibility.</p></div></div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {householdMembers.map(({ label, value, setValue }) => (
                    <label key={label} className="block text-sm font-semibold text-slate-700">{label}<input type="number" min="0" max="20" value={value} onChange={(event) => setValue(Math.max(0, Number(event.target.value)))} className={fieldClass} /></label>
                  ))}
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                <div className="mb-5 flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700"><Home size={19} /></span><div><h2 className="text-lg font-bold">Which spaces need design?</h2><p className="mt-1 text-sm text-slate-500">Select the rooms included in this project.</p></div></div>
                <div className="flex flex-wrap gap-2.5">{SPACES.map((space) => <button key={space} type="button" aria-pressed={spaces.includes(space)} onClick={() => toggle(space, spaces, setSpaces)} className={toggleClass(spaces.includes(space))}>{space}</button>)}</div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                <div className="mb-5 flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700"><Sparkles size={19} /></span><div><h2 className="text-lg font-bold">Your preferred design style</h2><p className="mt-1 text-sm text-slate-500">Pick a starting point. You can explore more directions later.</p></div></div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{STYLES.map((option) => <button key={option} type="button" aria-pressed={style === option} onClick={() => setStyle(option)} className={`rounded-2xl border p-4 text-left transition ${style === option ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}><span className={`grid h-8 w-8 place-items-center rounded-lg ${style === option ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}><Sparkles size={15} /></span><b className="mt-3 block text-sm text-slate-800">{option}</b><span className="mt-1 block text-xs text-slate-500">{option === 'Not sure yet' ? 'Help me discover a style' : `${option} design direction`}</span></button>)}</div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                <div className="mb-5 flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700"><Wallet size={19} /></span><div><h2 className="text-lg font-bold">What is your expected budget?</h2><p className="mt-1 text-sm text-slate-500">Set a comfortable range for the design and furnishing project.</p></div></div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-semibold text-slate-700">Minimum budget (VND million)<input type="number" min="1" value={budgetMin} onChange={(event) => { setBudgetMin(event.target.value); setBudgetError(''); }} className={fieldClass} /></label>
                  <label className="block text-sm font-semibold text-slate-700">Maximum budget (VND million)<input type="number" min="1" value={budgetMax} onChange={(event) => { setBudgetMax(event.target.value); setBudgetError(''); }} className={fieldClass} /></label>
                </div>
                {budgetError && <p role="alert" className="mt-2 text-xs font-medium text-rose-600">{budgetError}</p>}
                <div className="mt-4 flex flex-wrap gap-2">{[['Up to 500M', '0', '500'], ['500–900M', '500', '900'], ['900M–1.5B', '900', '1500'], ['Flexible', '500', '1500']].map(([label, min, max]) => <button key={label} type="button" onClick={() => { setBudgetMin(min === '0' ? '100' : min); setBudgetMax(max); setBudgetError(''); }} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800">{label}</button>)}</div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                <div className="mb-5"><h2 className="text-lg font-bold">Anything else we should know?</h2><p className="mt-1 text-sm text-slate-500">Share special requirements, must-keep items, accessibility needs or things to avoid.</p></div>
                <textarea value={specialRequirements} onChange={(event) => setSpecialRequirements(event.target.value)} rows={5} maxLength={1200} placeholder="For example: keep the existing kitchen plumbing, add a quiet work-from-home corner, avoid glossy finishes…" className={`${fieldClass} resize-y`} />
                <p className="mt-1 text-right text-xs text-slate-400">{specialRequirements.length}/1200</p>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                <div className="mb-5 flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700"><Paperclip size={19} /></span><div><h2 className="text-lg font-bold">Add photos, floor plans or videos</h2><p className="mt-1 text-sm text-slate-500">Show us the current space. You can also add files later.</p></div></div>
                <input ref={fileInput} type="file" multiple accept="image/*,video/*,.pdf,.dwg,.dxf" onChange={addFiles} className="sr-only" />
                <button type="button" onClick={() => fileInput.current?.click()} className="group flex w-full flex-col items-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/70 px-5 py-9 text-center transition hover:border-blue-400 hover:bg-blue-50/50">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-white text-blue-700 shadow-sm transition group-hover:bg-blue-600 group-hover:text-white"><Upload size={19} /></span>
                  <b className="mt-3 text-sm text-slate-800">Choose files to upload</b>
                  <span className="mt-1 text-xs text-slate-500">Photos, PDF floor plans, DWG/DXF or videos · up to 50 MB each</span>
                </button>
                {files.length > 0 && <ul className="mt-4 divide-y divide-slate-100 rounded-2xl border border-slate-200 px-4">{files.map((file, index) => { const Icon = fileIcon(file); return <li key={`${file.name}-${file.lastModified}-${index}`} className="flex items-center gap-3 py-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600"><Icon size={17} /></span><span className="min-w-0 flex-1"><b className="block truncate text-sm text-slate-800">{file.name}</b><small className="text-xs text-slate-500">{formatFileSize(file.size)}</small></span><button type="button" onClick={() => setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))} aria-label={`Remove ${file.name}`} className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"><Trash2 size={16} /></button></li>; })}</ul>}
              </section>

              <div className="flex flex-col-reverse justify-between gap-3 sm:flex-row sm:items-center">
                <button type="button" onClick={saveDraft} className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Save draft</button>
                <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">Review my brief <ArrowRight size={17} /></button>
              </div>
            </form>
          </div>

          <aside className="space-y-5 xl:sticky xl:top-6">
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="bg-slate-900 px-5 py-5 text-white"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-300">Your project</p><h2 className="mt-2 text-lg font-bold">OA Apartment · Bình Thạnh</h2><p className="mt-1 text-xs text-slate-300">AS-2026-018 · invited by Trần Nam</p></div>
              <div className="space-y-4 p-5">
                <div className="flex items-start gap-3"><Home size={17} className="mt-0.5 text-blue-700" /><div><p className="text-xs text-slate-500">Property</p><p className="mt-0.5 text-sm font-semibold text-slate-800">2 bedrooms · 2 bathrooms</p><p className="text-xs text-slate-500">80 m² · 3 floors</p></div></div>
                <div className="flex items-start gap-3"><Users size={17} className="mt-0.5 text-blue-700" /><div><p className="text-xs text-slate-500">Household</p><p className="mt-0.5 text-sm font-semibold text-slate-800">{adults + children + elderly} people{pets > 0 ? ` · ${pets} pets` : ''}</p></div></div>
                <div className="flex items-start gap-3"><Wallet size={17} className="mt-0.5 text-blue-700" /><div><p className="text-xs text-slate-500">Your budget range</p><p className="mt-0.5 text-sm font-semibold text-slate-800">VND {budgetMin}–{budgetMax}M</p></div></div>
                <div className="rounded-2xl bg-blue-50 p-4"><p className="flex items-center gap-2 text-sm font-bold text-blue-900"><Sparkles size={16} /> What happens next</p><p className="mt-2 text-xs leading-5 text-blue-800">Your team reviews the brief, then prepares design directions based on your home and preferences.</p></div>
              </div>
            </section>
            <p className="flex items-start gap-2 px-2 text-xs leading-5 text-slate-500"><Check size={14} className="mt-0.5 shrink-0 text-emerald-600" /> You can update your requirements and add more files after submitting this brief.</p>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default ProjectRequirementsForm;
