import React, { useMemo, useState } from 'react';
import { Plus, Search, Send } from 'lucide-react';
import { AdminButton, AdminCard, AdminCell, AdminPageFrame, AdminTable } from './AdminPageFrame';

type UserRow = { name: string; email: string; role: string; status: 'Active' | 'Invited'; lastActive: string };
const initialUsers: UserRow[] = [
  {name:'Minh Anh',email:'minh.anh@gmail.com',role:'Homeowner',status:'Active',lastActive:'Today'},
  {name:'Nguyen Linh',email:'linh@archsync.vn',role:'Designer',status:'Active',lastActive:'Today'},
  {name:'Pham Duc',email:'duc@archsync.vn',role:'Designer',status:'Active',lastActive:'Yesterday'},
  {name:'Tran Nam',email:'nam@archsync.vn',role:'Staff',status:'Active',lastActive:'Today'},
  {name:'Noi That Viet',email:'contact@noithatviet.vn',role:'Supplier',status:'Active',lastActive:'2 days ago'},
  {name:'Sang Lighting',email:'hello@sanglighting.vn',role:'Supplier',status:'Active',lastActive:'Yesterday'},
  {name:'Le Trang',email:'trang@archsync.vn',role:'Designer',status:'Invited',lastActive:'—'},
  {name:'Viglacera Tiles',email:'sales@viglacera-tiles.vn',role:'Supplier',status:'Invited',lastActive:'—'},
];
const tabs = ['All', 'Homeowners', 'Company team', 'Suppliers', 'Pending invitations'];

export const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState(initialUsers);
  const [filter, setFilter] = useState('All');
  const [query, setQuery] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Designer');
  const [notice, setNotice] = useState('');
  const filtered = useMemo(() => users.filter((user) => {
    const matchesTab = filter === 'All' || (filter === 'Homeowners' && user.role === 'Homeowner') || (filter === 'Company team' && ['Designer','Staff','Admin'].includes(user.role)) || (filter === 'Suppliers' && user.role === 'Supplier') || (filter === 'Pending invitations' && user.status === 'Invited');
    return matchesTab && `${user.name} ${user.email}`.toLowerCase().includes(query.toLowerCase());
  }), [users, filter, query]);
  const invite = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !email.trim()) { setNotice('Enter a name and email to create a demo invitation.'); return; }
    setUsers((current) => [{name:name.trim(),email:email.trim(),role,status:'Invited',lastActive:'—'}, ...current]);
    setNotice(`Demo invitation created for ${email.trim()}.`);
    setName(''); setEmail('');
  };
  return <AdminPageFrame title="Users & roles" description="Create accounts for company team members and supplier partners. Homeowners sign up themselves." action={<AdminButton onClick={() => document.getElementById('invite-name')?.focus()}><Plus size={17}/> Invite user</AdminButton>}>
    {notice && <div role="status" className="mb-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">{notice}</div>}
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.8fr)_minmax(300px,0.9fr)]">
      <AdminCard>
        <div className="mb-4 flex flex-col gap-3"><div className="flex gap-2 overflow-x-auto pb-1">{tabs.map((tab) => <button key={tab} onClick={() => setFilter(tab)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold ${filter === tab ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}>{tab}{tab === 'Pending invitations' ? ` (${users.filter((user)=>user.status==='Invited').length})` : ''}</button>)}</div><label className="relative block"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Search users" className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-400"/></label></div>
        <AdminTable headings={['Name','Email','Role','Status','Last active']}>{filtered.map((user)=><tr key={user.email}><AdminCell><span className="font-semibold">{user.name}</span></AdminCell><AdminCell>{user.email}</AdminCell><AdminCell>{user.role}</AdminCell><AdminCell><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${user.status==='Active'?'bg-emerald-50 text-emerald-700':'bg-amber-50 text-amber-700'}`}>{user.status}</span></AdminCell><AdminCell>{user.lastActive}</AdminCell></tr>)}</AdminTable>
        <p className="mt-3 text-xs text-slate-400">Showing {filtered.length} demo accounts of 214 total users</p>
      </AdminCard>
      <div className="space-y-4"><AdminCard title="Invite user"><p className="-mt-2 mb-4 text-sm text-slate-500">Send a demo invitation to a company team member or supplier partner.</p><form onSubmit={invite} className="space-y-4"><label className="block text-sm font-medium text-slate-700">Role<select value={role} onChange={(event)=>setRole(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5"><option>Designer</option><option>Staff</option><option>Supplier</option><option>Admin</option></select></label><label className="block text-sm font-medium text-slate-700">{role === 'Supplier' ? 'Company name' : 'Full name'}<input id="invite-name" value={name} onChange={(event)=>setName(event.target.value)} placeholder={role === 'Supplier' ? 'e.g. Noi That Viet Co., Ltd' : 'e.g. Le Trang'} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-blue-400"/></label><label className="block text-sm font-medium text-slate-700">{role === 'Supplier' ? 'Contact email' : 'Work email'}<input type="email" value={email} onChange={(event)=>setEmail(event.target.value)} placeholder="name@archsync.vn" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-blue-400"/></label><AdminButton type="submit" className="w-full"><Send size={15}/> Send invitation</AdminButton></form></AdminCard><AdminCard><p className="text-sm font-semibold text-slate-800">Demo behavior</p><p className="mt-2 text-sm leading-6 text-slate-500">Invitations are kept in page state only. Connect this form to the account API when the backend is ready.</p></AdminCard></div>
    </div>
  </AdminPageFrame>;
};
export default AdminUsers;
