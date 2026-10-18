import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Edit3, Layers, Users, Video, Plus } from 'lucide-react';
import { Header } from '@/components/layout';
import { Footer } from '@/components/layout';
import { useDemoWorkspace } from '@/hooks/useDemoWorkspace';

export const StaffDashboard: React.FC = () => {
  const navigate = useNavigate();
  const workspace = useDemoWorkspace();

  // Sample data for the four stat cards.
  const stats = [
    {
      title: 'NEW REQUESTS',
      value: String(workspace.requests.filter((request) => request.status === 'AI brief ready').length),
      icon: <FileText className="w-5 h-5 text-blue-600" />,
      bgColor: 'bg-blue-50',
    },
    {
      title: 'CONTRACTS PENDING',
      value: String(workspace.contracts.filter((contract) => contract.status !== 'Signed').length),
      icon: <Edit3 className="w-5 h-5 text-amber-600" />,
      bgColor: 'bg-amber-50',
    },
    {
      title: 'ACTIVE PROJECTS',
      value: String(workspace.projects.filter((project) => project.stage !== 'Handover').length),
      icon: <Layers className="w-5 h-5 text-emerald-600" />,
      bgColor: 'bg-emerald-50',
    },
    {
      title: 'AWAITING TEAM',
      value: String(workspace.projects.filter((project) => project.status === 'New · assigned today').length),
      icon: <Users className="w-5 h-5 text-purple-600" />,
      bgColor: 'bg-purple-50',
    },
  ];

  const requests = workspace.requests.map((request) => {
    const project = workspace.projects.find((item) => item.id === request.projectId);
    const statusBg = request.status === 'Signed' ? 'bg-emerald-50 text-emerald-700' : request.status === 'AI brief ready' ? 'bg-blue-50 text-blue-600' : request.status === 'Designer assigned' ? 'bg-violet-50 text-violet-700' : 'bg-amber-50 text-amber-700';
    return project ? { projectId: project.id, homeowner: project.homeowner, project: project.name, type: project.buildingType, budget: `${Math.round(project.budgetMin / 1e6)}–${Math.round(project.budgetMax / 1e6)}M`, status: request.status, statusBg, designer: project.designer, action: 'Open', actionStyle: 'border border-slate-200 text-slate-700 hover:bg-slate-50', isCreateContract: false } : null;
  }).filter((item): item is NonNullable<typeof item> => item !== null).slice(0, 5);
  // Sample data for today's consultations.
  const consultations = [
    {
      time: '09:30',
      name: 'Minh Anh',
      desc: 'Video consultation · Thu Duc',
      hasJoinBtn: true,
    },
    {
      time: '14:00',
      name: 'Hoang Gia',
      desc: 'Site review call · Long An',
      hasJoinBtn: false,
    },
    {
      time: '16:30',
      name: 'Phuong Vy',
      desc: 'Contract Q&A · Binh Thanh',
      hasJoinBtn: false,
    },
  ];

  const contracts = workspace.contracts.map((contract) => ({
    id: contract.id,
    name: workspace.projects.find((project) => project.id === contract.projectId)?.homeowner ?? 'Homeowner',
    status: contract.status,
    statusBg: contract.status === 'Signed' ? 'bg-emerald-50 text-emerald-600' : contract.status === 'Draft' ? 'bg-slate-100 text-slate-600' : 'bg-amber-50 text-amber-700',
  }));
  return (
    <div className="min-h-screen bg-slate-50/60 font-sans flex flex-col justify-between">
      <Header role="staff" />

      {/* Main Content Container */}
      <main className="w-full max-w-[1440px] mx-auto px-6 lg:px-12 py-10 flex-1">
        {/* Breadcrumb & Title Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
              Welcome back, Tran Nam
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Review new requests, prepare contracts and assign project teams.
            </p>
          </div>

          {/* The New contract button navigates to the contract form. */}
          <button
            type="button"
            onClick={() => navigate('/create-contract')}
            className="inline-flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md transition cursor-pointer"
          >
            <Plus size={18} />
            <span>New contract</span>
          </button>
        </div>

        {/* Top 4 Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {stats.map((stat, idx) => (
            <div
              key={idx}
              className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4"
            >
              <div
                className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center flex-shrink-0`}
              >
                {stat.icon}
              </div>
              <div>
                <span className="block text-[11px] font-bold text-slate-400 tracking-wider">
                  {stat.title}
                </span>
                <span className="text-2xl font-extrabold text-slate-900 mt-0.5 block">
                  {stat.value}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Main Grid: Left Table & Right Sidebars */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Column Left (2 Cols): Incoming Requests Table */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-900">Incoming requests</h2>
              <button
                type="button"
                onClick={() => navigate('/staff-requests')}
                className="text-xs font-bold text-blue-600 hover:underline inline-flex items-center gap-1"
              >
                View all →
              </button>
            </div>

            {/* Table Container */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/80">
                    <th className="py-3 px-4 rounded-l-xl">HOMEOWNER</th>
                    <th className="py-3 px-4">PROJECT</th>
                    <th className="py-3 px-4">TYPE</th>
                    <th className="py-3 px-4">BUDGET</th>
                    <th className="py-3 px-4">STATUS</th>
                    <th className="py-3 px-4 rounded-r-xl">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {requests.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition">
                      <td className="py-4 px-4 font-bold text-slate-900">{item.homeowner}</td>
                      <td className="py-4 px-4 font-medium text-slate-700">{item.project}</td>
                      <td className="py-4 px-4 text-slate-500">{item.type}</td>
                      <td className="py-4 px-4 font-semibold text-slate-700">{item.budget}</td>
                      <td className="py-4 px-4">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-[11px] font-semibold ${item.statusBg}`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <button
                          type="button"
                          onClick={() => {
                            navigate(`/staff-request-detail?projectId=${item.projectId}`);
                          }}
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${item.actionStyle}`}
                        >
                          {item.action}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Column Right (1 Col): Today's consultations & Contracts */}
          <div className="space-y-6">
            {/* Box 1: Today's consultations */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h2 className="text-base font-bold text-slate-900 mb-4">
                Today's consultations
              </h2>
              <div className="space-y-3">
                {consultations.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50/70 border border-slate-100"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                        {item.time}
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{item.name}</h4>
                        <p className="text-[11px] text-slate-500">{item.desc}</p>
                      </div>
                    </div>
                    {item.hasJoinBtn && (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition"
                      >
                        <Video size={13} />
                        <span>Join</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Box 2: Contracts in progress */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h2 className="text-base font-bold text-slate-900 mb-4">
                Contracts in progress
              </h2>
              <div className="space-y-3">
                {contracts.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => navigate(`/staff-contract-detail?contractId=${item.id}`)}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-50"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{item.id}</h4>
                      <p className="text-[11px] text-slate-500">{item.name}</p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-[11px] font-semibold ${item.statusBg}`}
                    >
                      {item.status}
                    </span>
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

export default StaffDashboard;
