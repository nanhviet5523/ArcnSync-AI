import React, { useState } from 'react';
import { Plus, Edit2, X, CheckCircle, Lock, ChevronDown } from 'lucide-react';
import { Header, Footer } from '@/components/layout';
import {
  INITIAL_BUILDING_TYPES,
  INITIAL_DESIGN_STYLES_ITEMS,
  INITIAL_PRODUCT_CATEGORIES,
  INITIAL_MATERIALS_FINISHES,
  INITIAL_CONSTRAINT_RULES,
} from '@/features/admin/services/adminService';
import type {
  BuildingTypeItem,
  DesignStyleItem,
  MaterialFinishItem,
  ProductCategoryItem,
  ConstraintRuleItem,
} from '@/types/admin';

type MasterDataSubTab =
  | 'building'
  | 'styles'
  | 'furniture'
  | 'rules'
  | 'packages';

interface ServicePackageItem {
  id: string;
  name: string;
  price: number;
  rounds: number;
  weeks: number;
  included: string[];
}

const INITIAL_SERVICE_PACKAGES: ServicePackageItem[] = [
  {
    id: 'pkg-1',
    name: 'Essential',
    price: 45,
    rounds: 2,
    weeks: 8,
    included: ['Concept design', '3D per floor'],
  },
  {
    id: 'pkg-2',
    name: 'Standard',
    price: 68,
    rounds: 3,
    weeks: 10,
    included: ['Concept', 'AI studio', '3D per floor', 'BOM & estimate'],
  },
  {
    id: 'pkg-3',
    name: 'Premium',
    price: 95,
    rounds: 4,
    weeks: 12,
    included: ['Everything in Standard', '2 site visits', 'Supplier sourcing'],
  },
];

interface PaymentMilestones {
  signed: number;
  concept: number;
  handover: number;
}

const INITIAL_MILESTONES: PaymentMilestones = {
  signed: 30,
  concept: 40,
  handover: 30,
};

export const AdminMasterData: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<MasterDataSubTab>('building');

  // Sub-tab 1: Building types
  const [buildingTypes, setBuildingTypes] = useState<BuildingTypeItem[]>(INITIAL_BUILDING_TYPES);

  // Sub-tab 2: Design styles
  const [designStyles, setDesignStyles] = useState<DesignStyleItem[]>(INITIAL_DESIGN_STYLES_ITEMS);
  const [editingStyle, setEditingStyle] = useState<DesignStyleItem | null>(null);
  const [isStyleModalOpen, setIsStyleModalOpen] = useState<boolean>(false);
  const [styleName, setStyleName] = useState<string>('');
  const [styleDescription, setStyleDescription] = useState<string>('');
  const [styleKeywords, setStyleKeywords] = useState<string>('');

  // Sub-tab 3: Furniture & materials
  const [productCategories, setProductCategories] = useState<ProductCategoryItem[]>(INITIAL_PRODUCT_CATEGORIES);
  const [materialsFinishes, setMaterialsFinishes] = useState<MaterialFinishItem[]>(INITIAL_MATERIALS_FINISHES);
  const [isAddingCategory, setIsAddingCategory] = useState<boolean>(false);
  const [newCategoryName, setNewCategoryName] = useState<string>('');

  // Sub-tab 4: Constraint rules & Edit Rule Modal (Image 1)
  const [constraintRules, setConstraintRules] = useState<ConstraintRuleItem[]>(INITIAL_CONSTRAINT_RULES);
  const [editingRule, setEditingRule] = useState<ConstraintRuleItem | null>(null);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState<boolean>(false);
  const [ruleDescription, setRuleDescription] = useState<string>('');
  const [ruleSeverity, setRuleSeverity] = useState<'Warn only' | 'Block saving'>('Warn only');

  // Sub-tab 5: Packages & fees (Image 2 & Image 3)
  const [packages, setPackages] = useState<ServicePackageItem[]>(INITIAL_SERVICE_PACKAGES);
  const [savedPackages, setSavedPackages] = useState<ServicePackageItem[]>(INITIAL_SERVICE_PACKAGES);

  const [extraRoundFee, setExtraRoundFee] = useState<number>(5);
  const [savedExtraRoundFee, setSavedExtraRoundFee] = useState<number>(5);

  const [milestones, setMilestones] = useState<PaymentMilestones>(INITIAL_MILESTONES);
  const [savedMilestones, setSavedMilestones] = useState<PaymentMilestones>(INITIAL_MILESTONES);

  // Save changes toast notification
  const [savedNotification, setSavedNotification] = useState<string | null>(null);

  const subNavTabs: { id: MasterDataSubTab; label: string }[] = [
    { id: 'building', label: 'Building types' },
    { id: 'styles', label: 'Design styles' },
    { id: 'furniture', label: 'Furniture & materials' },
    { id: 'rules', label: 'Constraint rules' },
    { id: 'packages', label: 'Packages & fees' },
  ];

  // Check unsaved changes in Packages & fees
  const hasUnsavedPackagesChanges =
    JSON.stringify(packages) !== JSON.stringify(savedPackages) ||
    extraRoundFee !== savedExtraRoundFee ||
    JSON.stringify(milestones) !== JSON.stringify(savedMilestones);

  const handleDiscardPackages = () => {
    setPackages(JSON.parse(JSON.stringify(savedPackages)));
    setExtraRoundFee(savedExtraRoundFee);
    setMilestones({ ...savedMilestones });
  };

  const handleSavePackages = () => {
    setSavedPackages(JSON.parse(JSON.stringify(packages)));
    setSavedExtraRoundFee(extraRoundFee);
    setSavedMilestones({ ...milestones });
    setSavedNotification('Packages & fee configuration saved successfully!');
    setTimeout(() => {
      setSavedNotification(null);
    }, 3500);
  };

  const handleSaveChanges = () => {
    if (activeSubTab === 'packages') {
      handleSavePackages();
    } else {
      setSavedNotification('Master data settings updated successfully!');
      setTimeout(() => {
        setSavedNotification(null);
      }, 3500);
    }
  };

  // Toggle building type
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

  // Open Edit Style Modal
  const openEditStyle = (style: DesignStyleItem) => {
    setEditingStyle(style);
    setStyleName(style.name);
    setStyleDescription(style.description);
    setStyleKeywords(style.aiKeywords);
    setIsStyleModalOpen(true);
  };

  const openAddStyle = () => {
    setEditingStyle(null);
    setStyleName('');
    setStyleDescription('');
    setStyleKeywords('');
    setIsStyleModalOpen(true);
  };

  const closeStyleModal = () => {
    setIsStyleModalOpen(false);
    setEditingStyle(null);
  };

  const handleSaveStyle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!styleName.trim()) return;

    if (editingStyle) {
      setDesignStyles((prev) =>
        prev.map((item) =>
          item.id === editingStyle.id
            ? {
                ...item,
                name: styleName.trim(),
                description: styleDescription.trim(),
                aiKeywords: styleKeywords.trim(),
              }
            : item
        )
      );
    } else {
      const newStyle: DesignStyleItem = {
        id: `ds-${Date.now()}`,
        name: styleName.trim(),
        description: styleDescription.trim(),
        aiKeywords: styleKeywords.trim(),
      };
      setDesignStyles((prev) => [...prev, newStyle]);
    }

    closeStyleModal();
  };

  const removeStyle = (id: string) => {
    setDesignStyles((prev) => prev.filter((s) => s.id !== id));
  };

  // Toggle material finish
  const toggleMaterialFinish = (id: string) => {
    setMaterialsFinishes((prev) =>
      prev.map((mf) => {
        if (mf.id === id) {
          const nextEnabled = !mf.enabled;
          return {
            ...mf,
            enabled: nextEnabled,
            statusText: nextEnabled ? 'Used in AI palettes' : 'Not used by AI',
          };
        }
        return mf;
      })
    );
  };

  // Add Product Category
  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    const newCat: ProductCategoryItem = {
      id: `pc-${Date.now()}`,
      name: newCategoryName.trim(),
      count: 0,
    };
    setProductCategories((prev) => [...prev, newCat]);
    setNewCategoryName('');
    setIsAddingCategory(false);
  };

  // Open Edit Constraint Rule Modal (Image 1)
  const openEditRule = (rule: ConstraintRuleItem) => {
    setEditingRule(rule);
    setRuleDescription(rule.description);
    setRuleSeverity(rule.status === 'Blocks saving' ? 'Block saving' : 'Warn only');
    setIsRuleModalOpen(true);
  };

  const closeRuleModal = () => {
    setIsRuleModalOpen(false);
    setEditingRule(null);
  };

  const handleSaveRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRule) return;

    const normalizedStatus: 'Blocks saving' | 'Warns only' =
      ruleSeverity === 'Block saving' ? 'Blocks saving' : 'Warns only';

    setConstraintRules((prev) =>
      prev.map((r) =>
        r.id === editingRule.id
          ? {
              ...r,
              description: ruleDescription.trim(),
              status: normalizedStatus,
            }
          : r
      )
    );

    closeRuleModal();
  };

  // Calculate milestones total percentage
  const totalMilestonesPercent =
    Number(milestones.signed || 0) +
    Number(milestones.concept || 0) +
    Number(milestones.handover || 0);
  const isMilestonesValid = totalMilestonesPercent === 100;

  const enabledBuildingCount = buildingTypes.filter((bt) => bt.enabled).length;

  return (
    <div className="min-h-screen bg-slate-50/60 font-sans flex flex-col justify-between relative">
      <Header role="admin" activeTab="master-data" />

      <main className="w-full max-w-[1440px] mx-auto px-6 lg:px-12 py-8 flex-1">
        {/* Saved Toast Notification */}
        {savedNotification && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-3 transition-all shadow-xs">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-sm font-semibold">
              {savedNotification}
            </span>
          </div>
        )}

        {/* Page Title & Save Changes Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <span className="text-[11px] font-bold tracking-wider text-blue-600 uppercase mb-1 block">
              Admin · Configuration
            </span>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Master data
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Controls what homeowners can choose and what the contract offers. AI behaviour lives in AI Settings.
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
        <div className="flex items-center flex-wrap gap-1 p-1 bg-slate-100/70 rounded-xl w-fit mb-8">
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

        {/* SUB-TAB 1: BUILDING TYPES (Image 1) */}
        {activeSubTab === 'building' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 max-w-4xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-slate-900">
                Building types
              </h2>
              <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 font-semibold text-xs rounded-full">
                {enabledBuildingCount} enabled
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {buildingTypes.map((item) => (
                <div
                  key={item.id}
                  className="py-4 flex items-center justify-between gap-4 first:pt-0 last:pb-0"
                >
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      {item.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {item.statusText}
                    </p>
                  </div>

                  {/* Toggle Switch */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={item.enabled}
                    onClick={() => toggleBuildingType(item.id)}
                    className={`relative h-6 w-11 rounded-full transition-colors cursor-pointer shrink-0 ${
                      item.enabled ? 'bg-blue-600' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                        item.enabled ? 'left-6' : 'left-1'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SUB-TAB 2: DESIGN STYLES (Image 2) */}
        {activeSubTab === 'styles' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 max-w-4xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-slate-900">
                Design styles
              </h2>
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 font-semibold text-xs rounded-full">
                  {designStyles.length} styles
                </span>
                <button
                  type="button"
                  onClick={openAddStyle}
                  className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add style</span>
                </button>
              </div>
            </div>

            {/* Tag Pills */}
            <div className="flex flex-wrap gap-2.5">
              {designStyles.map((style) => (
                <span
                  key={style.id}
                  onClick={() => openEditStyle(style)}
                  title="Click to edit style"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50/80 hover:bg-blue-100/90 text-blue-700 text-xs font-semibold rounded-full border border-blue-200 transition cursor-pointer group select-none"
                >
                  <span>{style.name}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeStyle(style.id);
                    }}
                    title="Remove style"
                    className="text-blue-400 hover:text-blue-800 transition cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                </span>
              ))}
            </div>

            <p className="text-xs text-slate-400 mt-5">
              Click a style to edit its description and AI keywords. Removing a style hides it from new projects; existing projects keep it.
            </p>
          </div>
        )}

        {/* SUB-TAB 3: FURNITURE & MATERIALS (Image 4) */}
        {activeSubTab === 'furniture' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Card: Product Categories */}
            <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-bold text-slate-900">
                  Product categories
                </h2>
                <button
                  type="button"
                  onClick={() => setIsAddingCategory(!isAddingCategory)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add category</span>
                </button>
              </div>

              {isAddingCategory && (
                <form onSubmit={handleAddCategory} className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Enter category name"
                    className="flex-1 px-3 py-1.5 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 cursor-pointer"
                  >
                    Add
                  </button>
                </form>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3 text-right">Products</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {productCategories.map((cat) => (
                      <tr key={cat.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-3 font-semibold text-slate-900 text-xs">
                          {cat.name}
                        </td>
                        <td className="py-3 px-3 text-xs text-slate-600 text-right">
                          {cat.count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-xs text-slate-400 mt-4">
                Suppliers pick from these categories when they add products.
              </p>
            </div>

            {/* Right Card: Materials & Finishes */}
            <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
              <h2 className="text-base font-bold text-slate-900 mb-5">
                Materials &amp; finishes
              </h2>

              <div className="divide-y divide-slate-100">
                {materialsFinishes.map((item) => (
                  <div
                    key={item.id}
                    className="py-3.5 flex items-center justify-between gap-4 first:pt-0 last:pb-0"
                  >
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">
                        {item.name}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {item.category}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {item.statusText}
                      </p>
                    </div>

                    {/* Toggle Switch */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={item.enabled}
                      onClick={() => toggleMaterialFinish(item.id)}
                      className={`relative h-6 w-11 rounded-full transition-colors cursor-pointer shrink-0 ${
                        item.enabled ? 'bg-blue-600' : 'bg-slate-200'
                      }`}
                    >
                      <span
                        className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                          item.enabled ? 'left-6' : 'left-1'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SUB-TAB 4: CONSTRAINT RULES (Image 5) */}
        {activeSubTab === 'rules' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 max-w-4xl flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">
                Constraint rules
              </h2>
              <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 font-semibold text-xs rounded-full">
                Applied to every design
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {constraintRules.map((rule) => (
                <div
                  key={rule.id}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 first:pt-0 last:pb-0"
                >
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {rule.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {rule.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 self-end sm:self-auto shrink-0">
                    <span
                      className={`text-xs font-semibold ${
                        rule.status === 'Blocks saving'
                          ? 'text-rose-600'
                          : 'text-amber-700'
                      }`}
                    >
                      {rule.status}
                    </span>

                    <button
                      type="button"
                      onClick={() => openEditRule(rule)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer shadow-2xs"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                      <span>Edit</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Cyan Info Notice Box */}
            <div className="bg-cyan-50/70 border border-cyan-100/90 rounded-2xl p-4 flex items-start gap-3 text-cyan-950 text-xs leading-relaxed shadow-2xs">
              <Lock className="w-4 h-4 text-cyan-700 shrink-0 mt-0.5" />
              <p>
                Designers add project-specific constraints on top of these. These names match the Brief screen: Layout, Size, Equipment, Budget.
              </p>
            </div>
          </div>
        )}

        {/* SUB-TAB 5: PACKAGES & FEES (Image 2 & Image 3) */}
        {activeSubTab === 'packages' && (
          <div className="space-y-6">
            {/* Unsaved Changes Banner (Image 3) */}
            {hasUnsavedPackagesChanges && (
              <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200 flex items-center justify-between shadow-2xs animate-in fade-in duration-200">
                <span className="text-xs font-bold text-blue-700">
                  You have unsaved changes
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDiscardPackages}
                    className="px-4 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl transition cursor-pointer shadow-2xs"
                  >
                    Discard
                  </button>
                  <button
                    type="button"
                    onClick={handleSavePackages}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition cursor-pointer"
                  >
                    Save changes
                  </button>
                </div>
              </div>
            )}

            {/* Top Card: Service Packages */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-bold text-slate-900">
                  Service packages
                </h2>
                <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 font-semibold text-xs rounded-full">
                  Staff picks one when creating a contract
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-3">Package</th>
                      <th className="py-3 px-3">Price (VND M)</th>
                      <th className="py-3 px-3">Design rounds</th>
                      <th className="py-3 px-3">Timeline (weeks)</th>
                      <th className="py-3 px-3">Included</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {packages.map((pkg) => (
                      <tr key={pkg.id} className="hover:bg-slate-50/60 transition-colors">
                        {/* Package Name */}
                        <td className="py-3.5 px-3 font-bold text-slate-900 text-sm">
                          {pkg.name}
                        </td>

                        {/* Price Input */}
                        <td className="py-3.5 px-3">
                          <input
                            type="number"
                            value={pkg.price}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setPackages((prev) =>
                                prev.map((p) => (p.id === pkg.id ? { ...p, price: val } : p))
                              );
                            }}
                            className="w-24 px-3 py-1.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </td>

                        {/* Design Rounds Input */}
                        <td className="py-3.5 px-3">
                          <input
                            type="number"
                            value={pkg.rounds}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setPackages((prev) =>
                                prev.map((p) => (p.id === pkg.id ? { ...p, rounds: val } : p))
                              );
                            }}
                            className="w-20 px-3 py-1.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </td>

                        {/* Timeline Weeks Input */}
                        <td className="py-3.5 px-3">
                          <input
                            type="number"
                            value={pkg.weeks}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setPackages((prev) =>
                                prev.map((p) => (p.id === pkg.id ? { ...p, weeks: val } : p))
                              );
                            }}
                            className="w-20 px-3 py-1.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </td>

                        {/* Included feature pills */}
                        <td className="py-3.5 px-3">
                          <div className="flex flex-wrap gap-1.5">
                            {pkg.included.map((item) => (
                              <span
                                key={item}
                                className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700"
                              >
                                {item}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom 2 Cards Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Card: Extra round fee */}
              <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
                <h3 className="text-base font-bold text-slate-900 mb-4">
                  Extra round fee
                </h3>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Per extra round (VND M)
                  </label>
                  <input
                    type="number"
                    value={extraRoundFee}
                    onChange={(e) => setExtraRoundFee(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <p className="text-xs text-slate-400 mt-2">
                    Used when Staff approves an extra round and creates an addendum.
                  </p>
                </div>
              </div>

              {/* Right Card: Default payment milestones */}
              <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
                <h3 className="text-base font-bold text-slate-900 mb-4">
                  Default payment milestones
                </h3>

                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <span className="text-xs font-semibold text-slate-800">
                      Contract signed
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={milestones.signed}
                        onChange={(e) =>
                          setMilestones((prev) => ({
                            ...prev,
                            signed: Number(e.target.value),
                          }))
                        }
                        className="w-16 px-2.5 py-1.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <span className="text-xs font-bold text-slate-500">%</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <span className="text-xs font-semibold text-slate-800">
                      Concept approved
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={milestones.concept}
                        onChange={(e) =>
                          setMilestones((prev) => ({
                            ...prev,
                            concept: Number(e.target.value),
                          }))
                        }
                        className="w-16 px-2.5 py-1.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <span className="text-xs font-bold text-slate-500">%</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <span className="text-xs font-semibold text-slate-800">
                      Final handover
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={milestones.handover}
                        onChange={(e) =>
                          setMilestones((prev) => ({
                            ...prev,
                            handover: Number(e.target.value),
                          }))
                        }
                        className="w-16 px-2.5 py-1.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <span className="text-xs font-bold text-slate-500">%</span>
                    </div>
                  </div>

                  {/* Total calculation indicator */}
                  <div>
                    {isMilestonesValid ? (
                      <p className="text-xs font-bold text-emerald-600">
                        Total 100%
                      </p>
                    ) : (
                      <p className="text-xs font-bold text-rose-600">
                        Total {totalMilestonesPercent}%, must be 100%
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL: EDIT DESIGN STYLE (Image 3 from previous prompt) */}
      {isStyleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-[1px] transition-opacity"
            onClick={closeStyleModal}
          />

          <div className="relative bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 z-10 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingStyle ? `Edit ${editingStyle.name}` : 'Add design style'}
              </h3>
              <button
                type="button"
                onClick={closeStyleModal}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStyle} className="mt-4 flex flex-col gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Name
                </label>
                <input
                  type="text"
                  value={styleName}
                  onChange={(e) => setStyleName(e.target.value)}
                  placeholder="e.g. Japandi"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={styleDescription}
                  onChange={(e) => setStyleDescription(e.target.value)}
                  placeholder="Brief style summary"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  AI keywords
                </label>
                <input
                  type="text"
                  value={styleKeywords}
                  onChange={(e) => setStyleKeywords(e.target.value)}
                  placeholder="e.g. warm timber, low furniture, paper lantern"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <p className="text-xs text-slate-400 mt-1.5">
                  Added to the prompt when a homeowner or designer picks this style.
                </p>
              </div>

              <div className="mt-2 flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeStyleModal}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs rounded-xl shadow-xs transition cursor-pointer"
                >
                  Save style
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT CONSTRAINT RULE (Image 1) */}
      {isRuleModalOpen && editingRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-[1px] transition-opacity"
            onClick={closeRuleModal}
          />

          <div className="relative bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 z-10 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                Edit {editingRule.title} rule
              </h3>
              <button
                type="button"
                onClick={closeRuleModal}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRule} className="mt-4 flex flex-col gap-4">
              {/* Field 1: Rule */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Rule
                </label>
                <textarea
                  rows={3}
                  value={ruleDescription}
                  onChange={(e) => setRuleDescription(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Field 2: When a design breaks it */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  When a design breaks it
                </label>
                <div className="relative">
                  <select
                    value={ruleSeverity}
                    onChange={(e) =>
                      setRuleSeverity(e.target.value as 'Warn only' | 'Block saving')
                    }
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 bg-white appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="Warn only">Warn only</option>
                    <option value="Block saving">Block saving</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <p className="text-xs text-slate-400 mt-1.5">
                  Block saving / Warn only
                </p>
              </div>

              <div className="mt-2 flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeRuleModal}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs rounded-xl shadow-xs transition cursor-pointer"
                >
                  Save rule
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

export default AdminMasterData;
