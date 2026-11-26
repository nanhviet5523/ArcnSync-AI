import React, { useState } from 'react';
import { Search, Users } from 'lucide-react';
import { Footer, Header } from '@/components/layout';
import { ApiError, getCurrentUser } from '@/services/authService';
import { getCustomers, type CustomerAccount } from '@/services/userService';

function customerSearchError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 0) return 'Could not connect to the server. Check your connection and try again.';
    if (error.status === 400 || error.status === 422) return 'The customer search was rejected. Check the email address and try again.';
    if (error.status === 401) return 'Your session has expired. Please sign in again.';
    if (error.status === 403) return 'You do not have permission to search customers.';
    if (error.status === 404) return 'The customer search endpoint was not found.';
    if (error.status >= 500) return 'The server encountered an error. Please try again later.';
  }
  return 'Could not search customers. Please try again.';
}

export const CustomerDirectory: React.FC = () => {
  const role = getCurrentUser()?.role;
  const [email, setEmail] = useState('');
  const [customers, setCustomers] = useState<CustomerAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');

  const searchCustomers = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setError('Enter a customer email address to search.');
      setCustomers([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setError('');
    setSearched(true);
    try {
      const results = await getCustomers(normalizedEmail);
      setCustomers(results);
    } catch (reason) {
      setCustomers([]);
      setError(customerSearchError(reason));
    } finally {
      setLoading(false);
    }
  };

  return <div className="flex min-h-screen flex-col bg-sand-50 font-sans">
    <Header role={role}/>
    <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10 lg:px-8">
      <div className="mb-8 flex items-center gap-4"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-sand-100 text-ink"><Users size={22}/></span><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-text">Accounts</p><h1 className="mt-1 text-3xl font-extrabold tracking-tight text-ink">Customers</h1><p className="mt-1 text-sm text-slate-500">Search for a registered, active customer by email.</p></div></div>
      <section className="rounded-2xl border border-control bg-surface p-5 shadow-sm sm:p-7">
        <form onSubmit={searchCustomers} className="mb-5 flex flex-col gap-3 sm:flex-row">
          <label className="relative block flex-1"><Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-subtext"/><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Enter customer email" className="w-full rounded-xl border border-control bg-sand-100 py-3 pl-10 pr-4 text-sm outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand-soft"/></label>
          <button type="submit" disabled={loading} className="rounded-xl bg-brand px-5 py-3 text-sm font-bold text-white hover:bg-brand-hover disabled:cursor-wait disabled:opacity-60">{loading ? 'Searching…' : 'Search'}</button>
        </form>
        {error && <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
        {loading ? <p className="py-12 text-center text-sm text-slate-500">Searching customer accounts…</p> : customers.length > 0 ? <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead className="bg-sand-50 text-xs uppercase tracking-wide text-subtext"><tr><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{customers.map((customer) => <tr key={customer.id}><td className="px-4 py-4 font-semibold text-ink">{customer.fullName}</td><td className="px-4 py-4 text-slate-600">{customer.email}</td><td className="px-4 py-4"><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">{customer.status ?? 'ACTIVE'}</span></td></tr>)}</tbody></table></div> : searched && !error ? <div className="py-12 text-center"><Users size={28} className="mx-auto text-slate-300"/><p className="mt-3 text-sm font-semibold text-ink">No active customer found for this email.</p><p className="mt-1 text-xs text-slate-500">Only registered customer accounts with ACTIVE status are returned.</p></div> : !error ? <p className="py-10 text-center text-sm text-slate-500">Enter an email address to search for an active customer.</p> : null}
      </section>
    </main>
    <Footer/>
  </div>;
};

export default CustomerDirectory;
