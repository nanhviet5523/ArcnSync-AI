import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Sparkles,
  Scale,
  ThumbsUp,
} from 'lucide-react';
import { Logo } from '@/components/common';
import { RoomPreview } from '@/features/designer/DesignerPageFrame';

interface Concept {
  id: string;
  title: string;
  style: string;
  description: string;
  bestFor: string;
  budget: string;
  rooms: string;
  highlights: string[];
  colors: string[];
  tag: string;
}

const concepts: Concept[] = [
  {
    id: 'japandi',
    title: 'Calm natural home',
    style: 'Japandi',
    description: 'Warm wood, soft neutrals and clear circulation create a calm shared space.',
    bestFor: 'A quiet, uncluttered home with practical storage.',
    budget: 'VND 600–760M',
    rooms: 'Living, kitchen, main bedroom',
    highlights: ['Light oak finishes', 'Built-in entry storage', 'Soft layered lighting'],
    colors: ['#E8E0D4', '#B99770', '#82907A', '#353735'],
    tag: 'Closest to your preferred style',
  },
  {
    id: 'modern',
    title: 'Bright & functional',
    style: 'Modern',
    description: 'A brighter palette, flexible furniture and concealed storage make the apartment feel open.',
    bestFor: 'Flexible everyday use and easy-to-maintain materials.',
    budget: 'VND 560–720M',
    rooms: 'Living, kitchen, bedrooms',
    highlights: ['Reflective light surfaces', 'Flexible dining table', 'Durable easy-clean finishes'],
    colors: ['#DEDBD5', '#AAA59A', '#566C8C', '#BD9E5D'],
    tag: 'More budget-conscious',
  },
  {
    id: 'indochine',
    title: 'Warm heritage',
    style: 'Indochine',
    description: 'Classic dark accents and patterned details bring character while keeping the layout practical.',
    bestFor: 'A distinctive home with richer colors and crafted details.',
    budget: 'VND 700–880M',
    rooms: 'Living, dining, main bedroom',
    highlights: ['Dark timber accents', 'Decorative screens', 'Statement dining lighting'],
    colors: ['#D9C9A3', '#7A4E33', '#2F5D55', '#A53F2E'],
    tag: 'Distinctive character',
  },
];

export const HomeownerConceptGallery = () => {
  const [compareIds, setCompareIds] = useState<string[]>(['japandi', 'modern']);
  const [preferredId, setPreferredId] = useState('');
  const [notice, setNotice] = useState('');
  const comparison = useMemo(() => compareIds.map((id) => concepts.find((concept) => concept.id === id)).filter((concept): concept is Concept => Boolean(concept)), [compareIds]);

  const toggleCompare = (id: string) => {
    setNotice('');
    setCompareIds((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= 2) {
        setNotice('Compare up to two concepts at a time. Remove one from your comparison first.');
        return current;
      }
      return [...current, id];
    });
  };

  const chooseDirection = (concept: Concept) => {
    setPreferredId(concept.id);
    setNotice(`${concept.style} is marked as your preferred direction in this preview. Your choice has not been sent to the design team.`);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <div role="note" className="bg-amber-100 px-4 py-1.5 text-center text-xs font-semibold text-amber-900">Sample data – not connected to API</div>
      <header className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between gap-4 px-5 lg:px-8">
          <Logo size={34} to="/" />
          <span className="hidden text-xs text-slate-500 sm:block">OA Apartment · Bình Thạnh</span>
          <Link to="/homeowner/project-requirements" className="text-sm font-semibold text-blue-700 hover:text-blue-900">Project brief</Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-7 lg:px-8 lg:py-10">
        <Link to="/homeowner/project-requirements" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-900"><ArrowLeft size={16} /> Back to project brief</Link>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-blue-700">Project setup · Step 3 of 3</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">Explore your design concepts</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Compare different directions for your home, then choose the one you would like your designer to refine.</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50 px-3.5 py-2 text-xs font-semibold text-violet-800"><Sparkles size={15} /> 3 concepts prepared from your brief</span>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-2" aria-label="Design process progress">
          {['Accept invitation', 'Share requirements', 'Review concepts'].map((step, index) => <div key={step} className={`rounded-xl border px-3 py-3 ${index < 2 ? 'border-emerald-100 bg-emerald-50' : 'border-blue-200 bg-blue-50'}`}><div className={`grid h-6 w-6 place-items-center rounded-full text-xs font-bold ${index < 2 ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'}`}>{index < 2 ? <Check size={14} /> : '3'}</div><p className={`mt-2 text-xs font-semibold ${index < 2 ? 'text-emerald-800' : 'text-blue-800'}`}>{step}</p></div>)}
        </div>

        <section className="mt-7 grid gap-5 lg:grid-cols-3">
          {concepts.map((concept, index) => {
            const selected = compareIds.includes(concept.id);
            const preferred = preferredId === concept.id;
            return (
              <article key={concept.id} className={`overflow-hidden rounded-3xl border bg-white shadow-sm transition ${preferred ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200'}`}>
                <div className="relative h-52 bg-slate-100 sm:h-60"><RoomPreview style={concept.style} /><span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm">Concept {String.fromCharCode(65 + index)}</span><span className="absolute bottom-3 left-3 rounded-full bg-slate-900/75 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">{concept.tag}</span></div>
                <div className="p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-blue-700">{concept.style}</p><h2 className="mt-1 text-xl font-bold text-slate-900">{concept.title}</h2></div>{preferred && <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"><CheckCircle2 size={14} /> Preferred</span>}</div>
                  <p className="mt-3 min-h-12 text-sm leading-6 text-slate-600">{concept.description}</p>
                  <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-3"><span className="text-xs text-slate-500">Estimated project range</span><b className="text-sm text-slate-800">{concept.budget}</b></div>
                  <div className="mt-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Palette</p><div className="mt-2 flex gap-2">{concept.colors.map((color) => <span key={color} title={color} className="h-7 w-7 rounded-full border border-slate-200" style={{ backgroundColor: color }} />)}</div></div>
                  <div className="mt-5 flex flex-wrap gap-2"><button type="button" aria-pressed={selected} onClick={() => toggleCompare(concept.id)} className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${selected ? 'border border-blue-200 bg-blue-50 text-blue-800' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}><Scale size={15} />{selected ? 'Added to compare' : 'Compare'}</button><button type="button" onClick={() => chooseDirection(concept)} className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${preferred ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>{preferred ? 'Preferred direction' : 'Choose direction'}{preferred ? <Check size={15} /> : <ArrowRight size={15} />}</button></div>
                </div>
              </article>
            );
          })}
        </section>

        {notice && <p role="status" className="mt-5 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">{notice}</p>}

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-blue-700"><Scale size={15} /> Side-by-side comparison</p><h2 className="mt-1 text-xl font-bold">Compare your shortlisted directions</h2><p className="mt-1 text-sm text-slate-500">Select two concepts above to compare their design focus and estimated fit.</p></div>
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">{comparison.length}/2 selected</span>
          </div>
          {comparison.length === 2 ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {comparison.map((concept) => <div key={concept.id} className="overflow-hidden rounded-2xl border border-slate-200"><div className="grid h-40 grid-cols-[140px_1fr] bg-slate-100 sm:grid-cols-[180px_1fr]"><RoomPreview style={concept.style} /><div className="flex flex-col justify-center p-4"><span className="text-xs font-bold uppercase tracking-wide text-blue-700">{concept.style}</span><b className="mt-1 text-base text-slate-900">{concept.title}</b><span className="mt-2 text-xs text-slate-500">{concept.budget}</span></div></div><dl className="divide-y divide-slate-100 px-4"><div className="grid grid-cols-[105px_1fr] gap-3 py-3 text-sm"><dt className="text-slate-400">Best for</dt><dd className="text-slate-700">{concept.bestFor}</dd></div><div className="grid grid-cols-[105px_1fr] gap-3 py-3 text-sm"><dt className="text-slate-400">Spaces</dt><dd className="text-slate-700">{concept.rooms}</dd></div><div className="grid grid-cols-[105px_1fr] gap-3 py-3 text-sm"><dt className="text-slate-400">Highlights</dt><dd><ul className="space-y-1 text-slate-700">{concept.highlights.map((highlight) => <li key={highlight}>• {highlight}</li>)}</ul></dd></div></dl><div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3"><span className="text-xs text-slate-500">Does this direction feel right?</span><button type="button" onClick={() => chooseDirection(concept)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-blue-900"><ThumbsUp size={14} /> Choose</button></div></div>)}
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center"><CircleHelp size={24} className="mx-auto text-slate-400" /><p className="mt-2 text-sm font-semibold text-slate-700">Choose two concepts to compare</p><p className="mt-1 text-xs text-slate-500">Use the Compare buttons on the concept cards above.</p></div>
          )}
          <div className="mt-6 flex flex-col-reverse justify-between gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center"><Link to="/homeowner/project-requirements" className="text-sm font-semibold text-slate-600 hover:text-slate-900">Edit project requirements</Link><button type="button" onClick={() => setNotice('Your concept feedback is shown in this preview only. It has not been sent to the design team.')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700">Send preference to designer <ArrowRight size={16} /></button></div>
        </section>

        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-900"><ChevronDown size={17} className="mt-0.5 shrink-0" /><p><b>Next:</b> Your designer reviews your preferred direction and refines the design with you. Concept imagery and estimates on this page are sample previews.</p></div>
      </main>
    </div>
  );
};

export default HomeownerConceptGallery;
