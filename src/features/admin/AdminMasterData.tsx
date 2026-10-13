import React, { useState } from 'react';
import { Plus, Edit2, X, CheckCircle } from 'lucide-react';
import { AdminHeader } from '@/features/admin/components/AdminHeader';
import { Footer } from '@/components/layout';
import {
  INITIAL_BUILDING_TYPES,
  INITIAL_DESIGN_STYLES,
  INITIAL_CONSTRAINT_RULES,
  INITIAL_PROMPT_LIBRARY,
} from '@/features/admin/services/adminService';
import type { BuildingTypeItem } from '@/types/admin';

interface AdminMasterDataProps {
  initialTab?: 'building' | 'styles' | 'furniture' | 'rules' | 'ai';
}

export const AdminMasterData: React.FC<AdminMasterDataProps> = () => {
  const [activeSubTab, setActiveSubTab] = useState<string>('building');

  // Building Types state
  const [buildingTypes, setBuildingTypes] = useState<BuildingTypeItem[]>(INITIAL_BUILDING_TYPES);

  // Design Styles state
  const [designStyles, setDesignStyles] = useState<string[]>(INITIAL_DESIGN_STYLES);
  const [newStyleName, setNewStyleName] = useState<string>('');
  const [isAddingStyle, setIsAddingStyle] = useState<boolean>(false);

  // AI Settings state
  const [freeDirections, setFreeDirections] = useState<boolean>(true);
  const [showEstimatedBudget, setShowEstimatedBudget] = useState<boolean>(true);
  const [directionsPerProject, setDirectionsPerProject] = useState<number>(3);
  const [designerGenerationsPerDay, setDesignerGenerationsPerDay] = useState<number>(30);

  // Save changes toast
  const [savedNotification, setSavedNotification] = useState<boolean>(false);

  const subNavTabs = [
    { id: 'building', label: 'Building types' },
    { id: 'styles', label: 'Design styles' },
    { id: 'furniture', label: 'Furniture & materials' },
    { id: 'rules', label: 'Constraint rules' },
    { id: 'ai', label: 'AI settings' },
  ];

  const toggleBuildingType = (id: string) => {
    setBuildingTypes((prev) =>
      prev.map((bt) => {
        if (bt.id === id) {
          const nextEnabled = !bt.enabled;
          return {
            ...bt,
            enabled: nextEnabled,
            statusText: nextEnabled ? 'Enabled' : 'Not supported in this version',
          };
        }
        return bt;
      })
    );
  };

  const removeStyle = (styleToRemove: string) => {
    setDesignStyles((prev) => prev.filter((s) => s !== styleToRemove));
  };

  const handleAddStyle = (e: React.FormEvent) => {
    e.preventDefault();
    if (newStyleName.trim() && !designStyles.includes(newStyleName.trim())) {
      setDesignStyles((prev) => [...prev, newStyleName.trim()]);
      setNewStyleName('');
      setIsAddingStyle(false);
    }
  };

  const handleSaveChanges = () => {
    setSavedNotification(true);
    setTimeout(() => {
      setSavedNotification(false);
    }, 3500);
  };

  const enabledCount = buildingTypes.filter((bt) => bt.enabled).length;

  return (
    <div className="min-h-screen bg-slate-50/60 font-sans flex flex-col justify-between">
      <AdminHeader activeTab="master-data" />

      <main className="w-full max-w-[1440px] mx-auto px-6 lg:px-12 py-8 flex-1">
        {/* Saved Toast Notification */}
        {savedNotification && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-3 transition-all">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-sm font-semibold">
              Master data & AI settings updated successfully!
            </span>
          </div>
        )}

        {/* Page Title & Save Changes Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Master data & AI settings
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Controls what homeowners can choose and how AI behaves.
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

        {/* Sub-Navigation Pills Bar */}
        <div className="flex items-center flex-wrap gap-2 p-1 bg-slate-100/70 rounded-xl w-fit mb-8">
          {subNavTabs.map((tab) => {
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSubTab(tab.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Main 2-Column Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: Building Types, Design Styles & Constraint Rules (8 cols) */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            {/* Card 1: Building Types */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-bold text-slate-900">
                  Building types
                </h2>
                <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 font-semibold text-xs rounded-full">
                  {enabledCount} enabled
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {buildingTypes.map((item) => (
                  <div
                    key={item.id}
                    className="py-4 flex items-center justify-between gap-4 first:pt-0 last:pb-0"
                  >
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        {item.name}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {item.statusText}
                      </p>
                    </div>

                    {/* Toggle Switch */}
                    <button
                      type="button"
                      onClick={() => toggleBuildingType(item.id)}
                      className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                        item.enabled ? 'bg-blue-600 justify-end' : 'bg-slate-200 justify-start'
                      }`}
                    >
                      <div className="bg-white w-4 h-4 rounded-full shadow-xs" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Card 2: Design Styles */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-bold text-slate-900">
                  Design styles
                </h2>
                <button
                  type="button"
                  onClick={() => setIsAddingStyle(!isAddingStyle)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add style</span>
                </button>
              </div>

              {isAddingStyle && (
                <form onSubmit={handleAddStyle} className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={newStyleName}
                    onChange={(e) => setNewStyleName(e.target.value)}
                    placeholder="Enter new style name"
                    className="flex-1 px-3 py-1.5 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700"
                  >
                    Add
                  </button>
                </form>
              )}

              {/* Tag Pills */}
              <div className="flex flex-wrap gap-2.5">
                {designStyles.map((style) => (
                  <span
                    key={style}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50/80 text-blue-700 text-xs font-semibold rounded-xl border border-blue-100"
                  >
                    <span>{style}</span>
                    <button
                      type="button"
                      onClick={() => removeStyle(style)}
                      className="text-blue-500 hover:text-blue-800 cursor-pointer"
                    >
                      <X className="w-3 h-3 stroke-[2.5]" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Card 3: Constraint Rules */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
              <h2 className="text-base font-bold text-slate-900 mb-5">
                Constraint rules (applied to every design)
              </h2>

              <div className="divide-y divide-slate-100">
                {INITIAL_CONSTRAINT_RULES.map((rule) => (
                  <div
                    key={rule.id}
                    className="py-4 flex items-center justify-between gap-4 first:pt-0 last:pb-0"
                  >
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        {rule.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {rule.description}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => alert(`Edit constraint rule: ${rule.title}`)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer shadow-2xs"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                      <span>Edit</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: AI Settings & Prompt Library (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            {/* Card 1: AI Settings */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
              <h2 className="text-base font-bold text-slate-900 mb-5">
                AI settings
              </h2>

              <div className="space-y-5">
                {/* Switch 1: Free AI directions */}
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs font-medium text-slate-800">
                    Free AI directions for homeowners
                  </span>
                  <button
                    type="button"
                    onClick={() => setFreeDirections(!freeDirections)}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                      freeDirections ? 'bg-blue-600 justify-end' : 'bg-slate-200 justify-start'
                    }`}
                  >
                    <div className="bg-white w-4 h-4 rounded-full shadow-xs" />
                  </button>
                </div>

                {/* Switch 2: Show estimated budget */}
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs font-medium text-slate-800">
                    Show estimated budget in directions
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowEstimatedBudget(!showEstimatedBudget)}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                      showEstimatedBudget ? 'bg-blue-600 justify-end' : 'bg-slate-200 justify-start'
                    }`}
                  >
                    <div className="bg-white w-4 h-4 rounded-full shadow-xs" />
                  </button>
                </div>

                {/* Numeric Inputs Row */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1.5">
                      Directions per project
                    </label>
                    <input
                      type="number"
                      value={directionsPerProject}
                      onChange={(e) => setDirectionsPerProject(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1.5">
                      Designer generations / day
                    </label>
                    <input
                      type="number"
                      value={designerGenerationsPerDay}
                      onChange={(e) => setDesignerGenerationsPerDay(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Prompt Library */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-bold text-slate-900">
                  Prompt library
                </h2>
                <button
                  type="button"
                  onClick={() => alert('Create new prompt template')}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New</span>
                </button>
              </div>

              <div className="divide-y divide-slate-100">
                {INITIAL_PROMPT_LIBRARY.map((prompt) => (
                  <div
                    key={prompt.id}
                    className="py-3.5 flex items-center justify-between gap-3 first:pt-0 last:pb-0"
                  >
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {prompt.title}
                    </span>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 font-semibold text-[11px] rounded-full">
                        {prompt.version}
                      </span>
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-semibold text-[11px] rounded-full">
                        {prompt.status}
                      </span>
                      <button
                        type="button"
                        onClick={() => alert(`Edit prompt: ${prompt.title}`)}
                        className="px-2.5 py-1 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition cursor-pointer"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};
