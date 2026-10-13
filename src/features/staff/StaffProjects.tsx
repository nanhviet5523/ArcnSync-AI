import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, Clock, AlertTriangle, Calendar, Search, Download } from 'lucide-react';
import { Header } from '@/components/layout';
import { Footer } from '@/components/layout';
import { useDemoWorkspace } from '@/hooks/useDemoWorkspace';

export const StaffProjects: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const workspace = useDemoWorkspace();
  const projects = workspace.projects.map((project) => {
    const stage = project.stage === 'Product selection' ? 'Products' : project.stage === 'Design review' ? 'Review' : project.stage;
    const roundsAtLimit = project.currentRound >= project.totalRounds;
    const stageColor = stage === 'Review' ? 'bg-amber-50 text-amber-700' : stage === 'Handover' ? 'bg-emerald-50 text-emerald-600' : stage === 'Products' ? 'bg-sky-50 text-sky-600' : 'bg-blue-50 text-blue-600';
    return { id: project.id, name: project.name, homeowner: project.homeowner, designer: project.designer, stage, stageBg: stageColor, progress: project.progress, rounds: `${project.currentRound}/${project.totalRounds}`, roundsBg: roundsAtLimit ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600', due: project.dueDate, roundsAtLimit, completed: project.stage === 'Handover' };
  });
  const matchesSearch = (project: typeof projects[number]) => `${project.name} ${project.homeowner} ${project.designer}`.toLowerCase().includes(searchQuery.toLowerCase());
  const visibleProjects = projects.filter((project) => {
    const matchesTab = activeTab === 'All' || activeTab === 'All 18' || (activeTab === 'Active' && !project.completed) || (activeTab === 'Waiting' && project.stage === 'Requirements') || (activeTab.startsWith('At round limit') && project.roundsAtLimit) || (activeTab === 'Completed' && project.completed);
    return matchesTab && matchesSearch(project);
  });
  const roundLimitProject = projects.find((project) => project.roundsAtLimit);

  const stats = [
    {
      title: 'ACTIVE',
      value: String(projects.filter((project) => !project.completed).length),
      icon: <Layers className="w-5 h-5 text-blue-600" />,
      bgColor: 'bg-blue-50',
    },
    {
      title: 'WAITING FOR HOMEOWNER',
      value: String(projects.filter((project) => project.stage === 'Requirements').length),
      icon: <Clock className="w-5 h-5 text-amber-600" />,
      bgColor: 'bg-amber-50',
    },
    {
      title: 'AT ROUND LIMIT',
      value: String(projects.filter((project) => project.roundsAtLimit).length),
      icon: <AlertTriangle className="w-5 h-5 text-rose-600" />,
      bgColor: 'bg-rose-50',
    },
    {
      title: 'DUE THIS MONTH',
      value: String(projects.filter((project) => project.due.includes('Oct 2026')).length),
      icon: <Calendar className="w-5 h-5 text-sky-600" />,
      bgColor: 'bg-sky-50',
    },
  ];


  return (
    <div className="min-h-screen bg-slate-50/60 font-sans flex flex-col justify-between">
      <Header role="staff" />

      <main className="w-full max-w-[1440px] mx-auto px-6 lg:px-12 py-10 flex-1">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Projects
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {projects.filter((project) => !project.completed).length} active projects · progress and design rounds
            </p>
          </div>

          <button
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl shadow-sm transition cursor-pointer"
          >
            <Download size={14} />
            <span>Export</span>
          </button>
        </div>

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

        {roundLimitProject && <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-amber-900">
          <div className="flex items-center gap-2.5">
            <AlertTriangle size={16} className="text-amber-600 flex-shrink-0" />
            <span>
              <strong>{roundLimitProject.name}</strong> reached its design round limit. Add an extra round to continue.
            </span>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/staff-addendum?projectId=${roundLimitProject.id}`)}
            className="px-4 py-2 bg-white hover:bg-amber-100/50 text-slate-800 font-bold text-xs rounded-xl border border-amber-200 transition whitespace-nowrap cursor-pointer shadow-sm"
          >
            Create addendum
          </button>
        </div>}

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
              {['All', 'Active', 'Waiting', 'At round limit', 'Completed'].map((tab) => {
                const isSelected = activeTab === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                      isSelected
                        ? 'bg-slate-100 text-slate-900'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>

            <div className="relative w-full md:w-64">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50/80 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/80">
                  <th className="py-3 px-4 rounded-l-xl">PROJECT</th>
                  <th className="py-3 px-4">HOMEOWNER</th>
                  <th className="py-3 px-4">DESIGNER</th>
                  <th className="py-3 px-4">STAGE</th>
                  <th className="py-3 px-4">PROGRESS</th>
                  <th className="py-3 px-4">ROUNDS</th>
                  <th className="py-3 px-4">DUE</th>
                  <th className="py-3 px-4 rounded-r-xl">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {visibleProjects.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-4 px-4 font-bold text-slate-900">{item.name}</td>
                    <td className="py-4 px-4 text-slate-700 font-medium">{item.homeowner}</td>
                    <td className="py-4 px-4 text-slate-700 font-medium">{item.designer}</td>
                    <td className="py-4 px-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-semibold ${item.stageBg}`}>
                        {item.stage}
                      </span>
                    </td>
                    <td className="py-4 px-4 w-32">
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-blue-600 h-full rounded-full"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-bold ${item.roundsBg}`}>
                        {item.rounds}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-slate-500 font-medium">{item.due}</td>
                    <td className="py-4 px-4">
                      <button
                        type="button"
                        onClick={() => navigate(`/staff-project-detail?projectId=${item.id}`)}
                        className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold text-xs rounded-lg transition cursor-pointer"
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default StaffProjects;
