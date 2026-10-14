import React, { useState } from 'react';
import { Plus, X, CheckCircle, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Header, Footer } from '@/components/layout';

export interface PromptItem {
  id: string;
  name: string;
  used: string;
  version: number;
  status: 'Active' | 'Draft' | 'Archived';
}

const INITIAL_PROMPTS: PromptItem[] = [
  {
    id: 'pr1',
    name: 'Direction suggestion (free)',
    used: 'Homeowner AI directions',
    version: 3,
    status: 'Active',
  },
  {
    id: 'pr2',
    name: 'Concept render (designer)',
    used: 'Designer AI Studio',
    version: 5,
    status: 'Active',
  },
  {
    id: 'pr3',
    name: 'Mood board & palette',
    used: 'Designer AI Studio',
    version: 2,
    status: 'Active',
  },
  {
    id: 'pr4',
    name: 'Cost optimization',
    used: 'Designer budget page',
    version: 2,
    status: 'Active',
  },
];

export const AdminAISettings: React.FC = () => {
  const navigate = useNavigate();

  // Prompts state
  const [prompts, setPrompts] = useState<PromptItem[]>(INITIAL_PROMPTS);

  // New prompt modal state (Image 4)
  const [isNewPromptModalOpen, setIsNewPromptModalOpen] = useState<boolean>(false);
  const [newPromptName, setNewPromptName] = useState<string>('');
  const [newPromptUsedBy, setNewPromptUsedBy] = useState<string>('Homeowner AI directions');

  // Switches state
  const [freeDirections, setFreeDirections] = useState<boolean>(true);
  const [showEstimatedBudget, setShowEstimatedBudget] = useState<boolean>(true);

  // Limits state
  const [directionsPerProject, setDirectionsPerProject] = useState<number>(3);
  const [designerGenerationsPerDay, setDesignerGenerationsPerDay] = useState<number>(30);
  const [maxConceptsPerRun, setMaxConceptsPerRun] = useState<number>(4);

  // Toast notification
  const [notification, setNotification] = useState<string | null>(null);

  const handleSaveChanges = () => {
    setNotification('AI settings updated successfully!');
    setTimeout(() => {
      setNotification(null);
    }, 3500);
  };

  const handleCreatePrompt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPromptName.trim()) return;

    const newId = `pr-${Date.now()}`;
    const newPrompt: PromptItem = {
      id: newId,
      name: newPromptName.trim(),
      used: newPromptUsedBy,
      version: 1,
      status: 'Active',
    };

    setPrompts((prev) => [newPrompt, ...prev]);
    setNewPromptName('');
    setIsNewPromptModalOpen(false);
    setNotification(`Prompt "${newPrompt.name}" created successfully!`);
    setTimeout(() => {
      setNotification(null);
    }, 3500);
  };

  const usageStats = [
    { label: 'Homeowner directions', count: 812, percent: 65 },
    { label: 'Designer concepts', count: 372, percent: 30 },
    { label: 'Mood boards', count: 40, percent: 3.5 },
    { label: 'Cost optimization', count: 24, percent: 2 },
  ];

  return (
    <div className="min-h-screen bg-slate-50/60 font-sans flex flex-col justify-between relative">
      <Header role="admin" activeTab="ai-settings" />

      <main className="w-full max-w-[1440px] mx-auto px-6 lg:px-12 py-8 flex-1">
        {/* Toast Notification */}
        {notification && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-3 transition-all shadow-xs">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-sm font-semibold">{notification}</span>
          </div>
        )}

        {/* Page Title & Save Changes Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <span className="text-[11px] font-bold tracking-wider text-blue-600 uppercase mb-1 block">
              Admin · AI
            </span>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              AI settings
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Limits, switches and the prompts that shape every AI output.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSaveChanges}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold rounded-xl shadow-xs transition cursor-pointer self-start sm:self-auto"
          >
            Save changes
          </button>
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: Prompt library & Usage this month (8 cols) */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            {/* Card 1: Prompt library */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-bold text-slate-900">
                  Prompt library
                </h2>
                <button
                  type="button"
                  onClick={() => setIsNewPromptModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Prompt</th>
                      <th className="py-2.5 px-3">Used by</th>
                      <th className="py-2.5 px-3">Version</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {prompts.map((item) => (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/60 transition-colors group cursor-pointer"
                        onClick={() => navigate(`/admin-prompts/${item.id}`)}
                      >
                        <td className="py-3.5 px-3 font-semibold text-slate-900 text-xs">
                          {item.name}
                        </td>
                        <td className="py-3.5 px-3 text-xs text-slate-500">
                          {item.used}
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                            v{item.version}
                          </span>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                            {item.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/admin-prompts/${item.id}`);
                            }}
                            className="px-3 py-1 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Card 2: Usage this month */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-bold text-slate-900">
                  Usage this month
                </h2>
                <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 font-bold text-xs rounded-full">
                  1,248
                </span>
              </div>

              <div className="space-y-4">
                {usageStats.map((stat) => (
                  <div key={stat.label} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-medium">{stat.label}</span>
                      <span className="font-bold text-slate-900">{stat.count}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all duration-500"
                        style={{ width: `${stat.percent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Switches, Limits, Provider (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            {/* Card 1: Switches */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
              <h2 className="text-base font-bold text-slate-900">
                Switches
              </h2>

              <div className="space-y-4 pt-1">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-slate-700">
                    Free AI directions for homeowners
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={freeDirections}
                    onClick={() => setFreeDirections(!freeDirections)}
                    className={`relative h-6 w-11 rounded-full transition-colors cursor-pointer shrink-0 ${
                      freeDirections ? 'bg-blue-600' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                        freeDirections ? 'left-6' : 'left-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
                  <span className="text-xs font-medium text-slate-700">
                    Show estimated budget in directions
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={showEstimatedBudget}
                    onClick={() => setShowEstimatedBudget(!showEstimatedBudget)}
                    className={`relative h-6 w-11 rounded-full transition-colors cursor-pointer shrink-0 ${
                      showEstimatedBudget ? 'bg-blue-600' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                        showEstimatedBudget ? 'left-6' : 'left-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Card 2: Limits */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
              <h2 className="text-base font-bold text-slate-900">
                Limits
              </h2>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Directions per project
                  </label>
                  <input
                    type="number"
                    value={directionsPerProject}
                    onChange={(e) => setDirectionsPerProject(Number(e.target.value))}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Designer generations / day
                  </label>
                  <input
                    type="number"
                    value={designerGenerationsPerDay}
                    onChange={(e) => setDesignerGenerationsPerDay(Number(e.target.value))}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Max concepts / run
                  </label>
                  <input
                    type="number"
                    value={maxConceptsPerRun}
                    onChange={(e) => setMaxConceptsPerRun(Number(e.target.value))}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Card 3: Provider */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-3">
              <h2 className="text-base font-bold text-slate-900">
                Provider
              </h2>

              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-medium">Generative AI service</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                    Operational
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                  <span className="text-slate-600 font-medium">Average response</span>
                  <span className="font-bold text-slate-900">38 s</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* MODAL: NEW PROMPT (Image 4) */}
      {isNewPromptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-[1px] transition-opacity"
            onClick={() => setIsNewPromptModalOpen(false)}
          />

          <div className="relative bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 z-10 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                New prompt
              </h3>
              <button
                type="button"
                onClick={() => setIsNewPromptModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePrompt} className="mt-4 flex flex-col gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Name
                </label>
                <input
                  type="text"
                  value={newPromptName}
                  onChange={(e) => setNewPromptName(e.target.value)}
                  placeholder="e.g. Room layout suggestion"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Used by
                </label>
                <div className="relative">
                  <select
                    value={newPromptUsedBy}
                    onChange={(e) => setNewPromptUsedBy(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 bg-white appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="Homeowner AI directions">Homeowner AI directions</option>
                    <option value="Designer AI Studio">Designer AI Studio</option>
                    <option value="Designer budget page">Designer budget page</option>
                    <option value="Supplier inquiries">Supplier inquiries</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div className="mt-3 flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewPromptModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs rounded-xl shadow-xs transition cursor-pointer"
                >
                  Create prompt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default AdminAISettings;
