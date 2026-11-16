import React, { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle, ChevronDown } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Header, Footer } from '@/components/layout';
import { designStyleService, type DesignStyle } from '@/services/designStyleService';

interface PromptVersionItem {
  version: string;
  status: 'Active' | 'Archived';
  date: string;
}

interface PromptConfig {
  id: string;
  name: string;
  used: string;
  version: number;
  body: string;
  versions: PromptVersionItem[];
}

const PROMPT_CONFIGS: Record<string, PromptConfig> = {
  pr2: {
    id: 'pr2',
    name: 'Concept render (designer)',
    used: 'Designer AI Studio',
    version: 5,
    body: `Render {n} interior concepts for the {room}.\nStyle: {style}\nObey these locked constraints: {constraints}\nKeep furniture inside the room limits and keep the total near {budget}.`,
    versions: [
      { version: 'v5', status: 'Active', date: '02 Oct · Admin' },
      { version: 'v4', status: 'Archived', date: '18 Sep · Admin' },
      { version: 'v3', status: 'Archived', date: '04 Sep · Admin' },
    ],
  },
  pr1: {
    id: 'pr1',
    name: 'Direction suggestion (free)',
    used: 'Homeowner AI directions',
    version: 3,
    body: `You are an interior design assistant for Vietnamese townhouses and level-4 houses.\nCreate {n} design directions for this brief.\nBuilding: {building}\nPlot: {plot}\nStyle preferences: {style}\nBudget: {budget}\nObey these locked constraints: {constraints}\nFor each direction return a name, a palette, key materials and an estimated budget.`,
    versions: [
      { version: 'v3', status: 'Active', date: '28 Sep · Admin' },
      { version: 'v2', status: 'Archived', date: '12 Sep · Admin' },
      { version: 'v1', status: 'Archived', date: '01 Sep · Admin' },
    ],
  },
  pr3: {
    id: 'pr3',
    name: 'Mood board & palette',
    used: 'Designer AI Studio',
    version: 2,
    body: `Create a mood board and a five-colour palette for the {style} style in the {room}.\nInclude primary wood species, accent metals, textile swatches and lighting mood.`,
    versions: [
      { version: 'v2', status: 'Active', date: '20 Sep · Admin' },
      { version: 'v1', status: 'Archived', date: '05 Sep · Admin' },
    ],
  },
  pr4: {
    id: 'pr4',
    name: 'Cost optimization',
    used: 'Designer budget page',
    version: 2,
    body: `Suggest cheaper options that keep the {style} look. Stay inside {budget} and respect {constraints}.\nProvide line-by-line item alternatives with supplier part codes.`,
    versions: [
      { version: 'v2', status: 'Active', date: '25 Sep · Admin' },
      { version: 'v1', status: 'Archived', date: '10 Sep · Admin' },
    ],
  },
};

export const AdminPromptDetail: React.FC = () => {
  const navigate = useNavigate();
  const { promptId = 'pr2' } = useParams<{ promptId: string }>();

  const currentConfig = PROMPT_CONFIGS[promptId] || PROMPT_CONFIGS.pr2;

  const [promptName, setPromptName] = useState<string>(currentConfig.name);
  const [promptBody, setPromptBody] = useState<string>(currentConfig.body);
  const [currentVersion, setCurrentVersion] = useState<number>(currentConfig.version);
  const [versionsList, setVersionsList] = useState<PromptVersionItem[]>(currentConfig.versions);

  // Test prompt state (Image 2 & Image 3)
  const [testStyles, setTestStyles] = useState<DesignStyle[]>([]);
  const [testStylesLoading, setTestStylesLoading] = useState(true);
  const [testStylesError, setTestStylesError] = useState('');
  const [testStyle, setTestStyle] = useState<string>('');
  const [hasRunTest, setHasRunTest] = useState<boolean>(false);
  const [isRunningTest, setIsRunningTest] = useState<boolean>(false);

  // Toast notification
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    designStyleService.getAll(true).then((styles) => {
      if (active) {
        setTestStyles(styles);
        setTestStyle(styles[0]?.name ?? '');
      }
    }).catch(() => {
      if (active) setTestStylesError('Could not load active design styles.');
    }).finally(() => {
      if (active) setTestStylesLoading(false);
    });
    return () => { active = false; };
  }, []);

  const variablesList = [
    '{n}',
    '{style}',
    '{room}',
    '{budget}',
    '{constraints}',
    '{building}',
    '{plot}',
  ];

  const handleInsertVariable = (variableStr: string) => {
    setPromptBody((prev) => `${prev} ${variableStr}`);
  };

  const handleSaveDraft = () => {
    setNotification('Draft saved in this demo session.');
    setTimeout(() => {
      setNotification(null);
    }, 3500);
  };

  const handleSaveAndActivate = () => {
    const nextVer = currentVersion + 1;
    setCurrentVersion(nextVer);
    setVersionsList((prev) => [
      { version: `v${nextVer}`, status: 'Active', date: 'Today · Admin' },
      ...prev.map((v) => ({ ...v, status: 'Archived' as const })),
    ]);
    setNotification(`Saved as v${nextVer} and activated successfully!`);
    setTimeout(() => {
      setNotification(null);
    }, 3500);
  };

  const handleRestoreVersion = (ver: string) => {
    setNotification(`Version ${ver} restored as draft.`);
    setTimeout(() => {
      setNotification(null);
    }, 3500);
  };

  const handleRunTest = () => {
    setIsRunningTest(true);
    setTimeout(() => {
      setIsRunningTest(false);
      setHasRunTest(true);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-slate-50/60 font-sans flex flex-col justify-between relative">
      <Header role="admin" activeTab="ai-settings" />

      <main className="w-full max-w-[1440px] mx-auto px-6 lg:px-12 py-8 flex-1">
        {/* Breadcrumb Navigation */}
        <div className="mb-4">
          <button
            type="button"
            onClick={() => navigate('/admin-ai-settings')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>AI Settings / Prompt library / {promptName}</span>
          </button>
        </div>

        {/* Toast Notification */}
        {notification && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-3 transition-all shadow-xs">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-sm font-semibold">{notification}</span>
          </div>
        )}

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <span className="text-[11px] font-bold tracking-wider text-blue-600 uppercase mb-1 block">
              Admin · AI
            </span>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {promptName}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Used by {currentConfig.used}
            </p>
          </div>

          {/* Action Buttons & Version Badge */}
          <div className="flex items-center flex-wrap gap-3 self-start sm:self-auto">
            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 font-semibold text-xs rounded-full border border-emerald-200/60">
              v{currentVersion} · Active
            </span>

            <button
              type="button"
              onClick={handleSaveDraft}
              className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl transition cursor-pointer shadow-2xs"
            >
              Save as draft
            </button>

            <button
              type="button"
              onClick={handleSaveAndActivate}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs rounded-xl shadow-xs transition cursor-pointer"
            >
              Save as v{currentVersion + 1} and activate
            </button>
          </div>
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: Prompt Editor & Test prompt (8 cols) */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            {/* Card 1: Main Prompt Editor */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-5">
              {/* Name Field */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Name
                </label>
                <input
                  type="text"
                  value={promptName}
                  onChange={(e) => setPromptName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Prompt Textarea */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Prompt
                </label>
                <textarea
                  rows={8}
                  value={promptBody}
                  onChange={(e) => setPromptBody(e.target.value)}
                  className="w-full px-3.5 py-3 border border-slate-200 rounded-xl text-xs font-mono leading-relaxed text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Insert a variable */}
              <div>
                <p className="text-xs font-semibold text-slate-700 mb-2">
                  Insert a variable
                </p>
                <div className="flex flex-wrap gap-2">
                  {variablesList.map((variable) => (
                    <button
                      key={variable}
                      type="button"
                      onClick={() => handleInsertVariable(variable)}
                      className="px-3 py-1 rounded-full border border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50 text-blue-700 font-mono text-xs font-semibold transition cursor-pointer select-none"
                    >
                      {variable}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Card 2: Test prompt (Image 2 & Image 3) */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
              <h2 className="text-base font-bold text-slate-900 mb-4">
                Test prompt
              </h2>

              {/* Input Row: Design style dropdown & Run test */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Design style
                </label>
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <select
                      value={testStyle}
                      onChange={(e) => setTestStyle(e.target.value)}
                      disabled={testStylesLoading || testStyles.length === 0}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 bg-white appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {testStyles.map((style) => <option key={style.id} value={style.name}>{style.name}</option>)}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  <button
                    type="button"
                    onClick={handleRunTest}
                    disabled={isRunningTest || testStylesLoading || Boolean(testStylesError) || testStyles.length === 0}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-400 text-white font-semibold text-xs rounded-xl shadow-xs transition cursor-pointer shrink-0"
                  >
                    {isRunningTest ? 'Running...' : 'Run test'}
                  </button>
                </div>
                {testStylesLoading && <p className="mt-2 text-xs text-slate-500">Loading active design styles…</p>}
                {testStylesError && <p role="alert" className="mt-2 text-xs text-rose-600">{testStylesError}</p>}
                {!testStylesLoading && !testStylesError && testStyles.length === 0 && <p className="mt-2 text-xs text-slate-500">No active design styles are available.</p>}
              </div>

              {/* Output Container: Before test vs After test (Image 3) */}
              <div className="mt-5">
                {!hasRunTest ? (
                  /* Initial State (Image 2) */
                  <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70">
                    <p className="text-xs text-slate-400 font-medium">
                      Run a test with a sample project (Modern Townhouse · Thu Duc, Japandi).
                    </p>
                  </div>
                ) : (
                  /* Test Result (Image 3) */
                  <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col md:flex-row gap-5 items-start animate-in fade-in zoom-in-95 duration-200">
                    {/* Rendered Interior Image */}
                    <div className="w-full md:w-64 h-44 rounded-xl overflow-hidden shrink-0 border border-slate-100 bg-slate-100">
                      <img
                        src="/japandi-render.jpg"
                        alt="Warm Japandi interior render"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback placeholder if image not accessible
                          e.currentTarget.src =
                            'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=600&q=80';
                        }}
                      />
                    </div>

                    {/* Result Description */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-slate-900">
                        Direction 1 · Warm {testStyle}
                      </h3>
                      <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                        Light oak flooring, matte white walls and linen curtains. The sofa stays under 3.0 m.
                      </p>

                      <div className="mt-4">
                        <span className="inline-block px-3 py-1 bg-cyan-50 border border-cyan-100/80 text-cyan-800 text-xs font-bold rounded-lg">
                          Estimated VND 640M
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Versions History & Cyan Note (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-5">
            {/* Versions Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
              <h2 className="text-base font-bold text-slate-900">
                Versions
              </h2>

              <div className="divide-y divide-slate-100">
                {versionsList.map((ver, idx) => (
                  <div
                    key={ver.version}
                    className="py-3.5 flex items-center justify-between first:pt-0 last:pb-0"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800">
                          {ver.version}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            ver.status === 'Active'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {ver.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        {ver.date}
                      </p>
                    </div>

                    {idx !== 0 && (
                      <button
                        type="button"
                        onClick={() => handleRestoreVersion(ver.version)}
                        className="px-3 py-1 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer shadow-2xs"
                      >
                        Restore
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Cyan Notice Information Box */}
            <div className="bg-cyan-50/70 border border-cyan-100/90 rounded-2xl p-4 text-cyan-950 text-xs leading-relaxed shadow-2xs">
              <p>
                Saving creates a new version. The previous version stays in the history and can be restored.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AdminPromptDetail;
