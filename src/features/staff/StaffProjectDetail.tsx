import React, { useState } from 'react';
import { Bell, Plus } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export const StaffProjectDetail: React.FC = () => {
  // Data danh sách nhân sự tham gia dự án
  const [members, setMembers] = useState([
    {
      role: 'Homeowner',
      person: 'Minh Anh',
      type: 'External',
      typeBg: 'bg-slate-100 text-slate-600',
      access: 'View · Comment · Approve',
      hasAction: false,
      actionText: '',
    },
    {
      role: 'Lead Designer',
      person: 'Nguyen Linh',
      type: 'Company',
      typeBg: 'bg-blue-50 text-blue-600',
      access: 'Edit design · Versions',
      hasAction: true,
      actionText: 'Change',
    },
    {
      role: 'Support Designer',
      person: 'Pham Duc',
      type: 'Company',
      typeBg: 'bg-blue-50 text-blue-600',
      access: 'Edit 3D · Renders',
      hasAction: true,
      actionText: 'Change',
    },
    {
      role: 'Staff coordinator',
      person: 'Tran Nam',
      type: 'Company',
      typeBg: 'bg-blue-50 text-blue-600',
      access: 'Contract · Billing',
      hasAction: false,
      actionText: '',
    },
    {
      role: 'Supplier partner',
      person: 'Noi That Viet',
      type: 'Partner',
      typeBg: 'bg-purple-50 text-purple-600',
      access: 'Catalog · Quotes',
      hasAction: true,
      actionText: 'Remove',
    },
  ]);

  // Data danh sách nhà cung cấp
  const [suppliers, setSuppliers] = useState([
    {
      name: 'Noi That Viet',
      category: 'Furniture',
      isAdded: true,
    },
    {
      name: 'Viglacera Tiles',
      category: 'Floor & wall tiles',
      isAdded: false,
    },
    {
      name: 'Sang Lighting',
      category: 'Lighting',
      isAdded: false,
    },
  ]);

  // States quản lý form Add role
  const [selectedRole, setSelectedRole] = useState('Designer');
  const [selectedPerson, setSelectedPerson] = useState('');
  const [selectedAccess, setSelectedAccess] = useState('Edit design');

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPerson) return;

    setMembers([
      ...members,
      {
        role: selectedRole,
        person: selectedPerson,
        type: 'Company',
        typeBg: 'bg-blue-50 text-blue-600',
        access: selectedAccess,
        hasAction: true,
        actionText: 'Change',
      },
    ]);
    setSelectedPerson('');
  };

  return (
    <div className="min-h-screen bg-slate-50/60 font-sans flex flex-col justify-between">
      <Header />

      {/* Main Content */}
      <main className="w-full max-w-[1440px] mx-auto px-6 lg:px-12 py-10 flex-1">
        {/* Title & Top Action */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Project team & roles
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Modern Townhouse · Thu Duc · Contract signed 03 Oct 2026
            </p>
          </div>

          <button
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
          >
            <Bell size={14} />
            <span>Notify team</span>
          </button>
        </div>

        {/* 2 Columns Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* CỘT TRÁI (2 Cols): Roles List & Add Role Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Box 1: Roles on this project */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-base font-bold text-slate-900">
                  Roles on this project
                </h2>
                <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-semibold rounded-full">
                  {members.length} members
                </span>
              </div>

              {/* Table Roles */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/80">
                      <th className="py-3 px-4 rounded-l-xl">ROLE</th>
                      <th className="py-3 px-4">PERSON</th>
                      <th className="py-3 px-4">TYPE</th>
                      <th className="py-3 px-4">ACCESS</th>
                      <th className="py-3 px-4 rounded-r-xl text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {members.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition">
                        <td className="py-4 px-4 font-bold text-slate-900">
                          {item.role}
                        </td>
                        <td className="py-4 px-4 font-medium text-slate-700">
                          {item.person}
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-semibold ${item.typeBg}`}
                          >
                            {item.type}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-slate-500 font-medium">
                          {item.access}
                        </td>
                        <td className="py-4 px-4 text-right">
                          {item.hasAction && (
                            <button
                              type="button"
                              className="px-3 py-1 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-[11px] rounded-lg transition"
                            >
                              {item.actionText}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Box 2: Add role to project */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h2 className="text-base font-bold text-slate-900 mb-4">
                Add role to project
              </h2>

              <form onSubmit={handleAddMember}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1.5">
                      Role
                    </label>
                    <select
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      <option value="Designer">Designer</option>
                      <option value="Lead Designer">Lead Designer</option>
                      <option value="Support Designer">Support Designer</option>
                      <option value="Supplier partner">Supplier partner</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1.5">
                      Person
                    </label>
                    <select
                      value={selectedPerson}
                      onChange={(e) => setSelectedPerson(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      <option value="">Select employee...</option>
                      <option value="Le Trang">Le Trang</option>
                      <option value="Hoang Nam">Hoang Nam</option>
                      <option value="Viglacera Tiles">Viglacera Tiles</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1.5">
                      Access level
                    </label>
                    <select
                      value={selectedAccess}
                      onChange={(e) => setSelectedAccess(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      <option value="Edit design">Edit design</option>
                      <option value="View only">View only</option>
                      <option value="Full access">Full access</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition"
                  >
                    <Plus size={14} />
                    <span>Add to project</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedPerson('')}
                    className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* CỘT PHẢI (1 Col): Project snapshot & Supplier partners */}
          <div className="space-y-6">
            {/* Box 1: Project snapshot */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-3.5">
              <h2 className="text-base font-bold text-slate-900 mb-2">
                Project snapshot
              </h2>

              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Type</span>
                <span className="font-bold text-slate-900">Townhouse (Nhà phố)</span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Area</span>
                <span className="font-bold text-slate-900">80 m² · 3 floors</span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Budget</span>
                <span className="font-bold text-slate-900">VND 600–900M</span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Package</span>
                <span className="font-bold text-slate-900">Standard · 3 rounds</span>
              </div>

              <div className="flex justify-between items-center text-xs pt-1">
                <span className="text-slate-500">Timeline</span>
                <span className="font-bold text-slate-900">10 weeks</span>
              </div>
            </div>

            {/* Box 2: Supplier partners */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h2 className="text-base font-bold text-slate-900 mb-4">
                Supplier partners
              </h2>

              <div className="space-y-4">
                {suppliers.map((sup, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between pb-3 border-b border-slate-100 last:border-none last:pb-0"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{sup.name}</h4>
                      <p className="text-[11px] text-slate-500">{sup.category}</p>
                    </div>

                    {sup.isAdded ? (
                      <span className="px-3 py-1 bg-emerald-50 text-emerald-600 font-bold text-[11px] rounded-full">
                        Added
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...suppliers];
                          updated[idx].isAdded = true;
                          setSuppliers(updated);
                        }}
                        className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold text-xs rounded-lg transition"
                      >
                        Add
                      </button>
                    )}
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

export default StaffProjectDetail;
