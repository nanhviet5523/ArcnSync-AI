import React, { useEffect, useState } from 'react';
import { Camera, Check, LockKeyhole, UserRound } from 'lucide-react';
import { Footer, Header } from '@/components/layout';
import { ApiError, getCurrentUser } from '@/services/authService';
import { changeMyPassword, getMyProfile, updateMyProfile, type UserProfile } from '@/services/userService';
import { ROLE_CONFIG } from '@/types/role';

const fieldClass = 'mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500';
const roleKey = (role: UserProfile['role']) => role === 'designer' ? 'designerProfile' : role === 'supplier' ? 'supplierProfile' : null;

function apiErrorMessage(error: unknown, action: 'load' | 'profile' | 'password'): string {
  if (error instanceof ApiError) {
    if (error.status === 0) return 'Could not connect to the server. Check your connection and try again.';
    if (action === 'password' && error.status === 401) return 'The current password is incorrect or your session has expired.';
    if (error.status === 401) return 'Your session has expired. Please sign in again.';
    if (error.status === 403) return 'You do not have permission to perform this action.';
    if (error.status === 400 || error.status === 422) return 'Some information is invalid. Check the fields and try again.';
    if (error.status >= 500) return 'The server encountered an error. Please try again later.';
  }
  return action === 'load' ? 'Could not load your account information.' : action === 'profile' ? 'Could not update your profile.' : 'Could not change your password.';
}

export const ProfileSettings: React.FC = () => {
  const sessionUser = getCurrentUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [fullName, setFullName] = useState(sessionUser?.name ?? '');
  const [phone, setPhone] = useState(sessionUser?.phone ?? '');
  const [roleDetails, setRoleDetails] = useState<Record<string, string>>({});
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordFormOpen, setPasswordFormOpen] = useState(false);
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null);

  useEffect(() => {
    let mounted = true;
    getMyProfile().then((data) => {
      if (!mounted) return;
      setProfile(data);
      setFullName(data.fullName ?? '');
      setPhone(data.phone ?? '');
      const key = roleKey(data.role);
      const details = key ? data[key] : undefined;
      if (details && typeof details === 'object') {
        setRoleDetails(Object.fromEntries(Object.entries(details).map(([name, value]) => [name, String(value ?? '')])));
      }
    }).catch((error: unknown) => {
      if (mounted) setNotice({ text: apiErrorMessage(error, 'load'), error: true });
    }).finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const resetProfileForm = () => {
    if (!profile) return;
    setFullName(profile.fullName ?? '');
    setPhone(profile.phone ?? '');
    const key = roleKey(profile.role);
    const details = key ? profile[key] : undefined;
    setRoleDetails(details && typeof details === 'object'
      ? Object.fromEntries(Object.entries(details).map(([name, value]) => [name, String(value ?? '')]))
      : {});
    setNotice(null);
  };

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!profile) return;
    setSavingProfile(true);
    setNotice(null);
    try {
      const key = roleKey(profile.role);
      const details = Object.fromEntries(Object.entries(roleDetails).filter(([, value]) => value.trim()));
      const updated = await updateMyProfile({ fullName: fullName.trim(), phone: phone.trim(), ...(key ? { [key]: details } : {}) });
      setProfile(updated);
      setFullName(updated.fullName ?? '');
      setPhone(updated.phone ?? '');
      setNotice({ text: 'Profile updated successfully.' });
    } catch (error) {
      setNotice({ text: apiErrorMessage(error, 'profile'), error: true });
    } finally { setSavingProfile(false); }
  };

  const savePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      setNotice({ text: 'The new password and confirmation do not match.', error: true });
      return;
    }
    setSavingPassword(true);
    setNotice(null);
    try {
      await changeMyPassword({ currentPassword, newPassword });
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      setPasswordFormOpen(false);
      setNotice({ text: 'Password changed successfully. Other active sessions have expired.' });
    } catch (error) {
      setNotice({ text: apiErrorMessage(error, 'password'), error: true });
    } finally { setSavingPassword(false); }
  };

  const role = profile?.role ?? sessionUser?.role;
  const roleLabel = role ? ROLE_CONFIG[role].badge : 'Account';
  const initials = (profile?.fullName || sessionUser?.name || profile?.email || sessionUser?.email || 'U')
    .trim().split(/\s+/).map((part) => part[0]?.toUpperCase()).slice(0, 2).join('');
  const roleFields = profile?.role === 'designer'
    ? [['jobTitle', 'Job title (optional)'], ['specialty', 'Specialty']]
    : profile?.role === 'supplier'
      ? [['companyName', 'Company name'], ['warehouseAddress', 'Warehouse address']]
      : [];
  const profileDetails = (profile?.role === 'designer' ? profile.designerProfile : profile?.role === 'supplier' ? profile.supplierProfile : undefined) ?? {};
  const unavailablePreferences = ['New message', 'New version or feedback on my project', 'Project deadline reminders', 'Weekly summary email'];

  return <div className="flex min-h-screen flex-col bg-slate-50 font-sans">
    <Header role={role}/>
    <main className="mx-auto w-full max-w-[1440px] flex-1 px-5 py-10 lg:px-12">
      <div className="mb-7"><h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Profile &amp; Settings</h1><p className="mt-2 text-base text-slate-500">One profile page shared by every role. Fields adapt to your role.</p></div>
      {notice && <div role={notice.error ? 'alert' : 'status'} className={`mb-6 rounded-xl border px-4 py-3 text-sm ${notice.error ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{notice.text}</div>}

      <div className="profile-settings-layout grid items-start gap-6">
        <aside className="rounded-3xl border border-slate-100 bg-white p-7 text-center shadow-[0_12px_30px_rgba(15,23,42,.08)]">
          <div className="mx-auto grid h-32 w-32 place-items-center rounded-full bg-slate-900 text-4xl font-extrabold text-white">{loading ? <UserRound size={42}/> : initials || 'U'}</div>
          <h2 className="mt-4 text-2xl font-extrabold text-slate-900">{loading ? 'Loading profile…' : profile?.fullName || sessionUser?.name || 'Account'}</h2>
          <span className="mt-3 inline-flex rounded-full bg-cyan-100 px-3 py-1 text-sm font-bold text-cyan-800">{roleLabel}</span>
          <p className="mt-4 break-all text-sm text-slate-500">{profile?.email ?? sessionUser?.email ?? ''}</p>
          <button type="button" disabled title="Profile photo upload is not available in the current API." className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-400 disabled:cursor-not-allowed"><Camera size={17}/>Change photo</button>
          <dl className="mt-6 space-y-3 border-t border-slate-200 pt-5 text-left text-sm">
            <div className="flex justify-between gap-3"><dt className="text-slate-500">Joined</dt><dd className="font-bold text-slate-800" title="Join date is not returned by the current profile API.">—</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-slate-500">Assigned projects</dt><dd className="font-bold text-slate-800" title="Project count is not returned by the current profile API.">—</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-slate-500">Team</dt><dd className="font-bold text-slate-800" title="Team information is not returned by the current profile API.">—</dd></div>
            {role === 'designer' && Object.entries(profileDetails).map(([label, value]) => <div key={label} className="flex justify-between gap-3"><dt className="capitalize text-slate-500">{label.replace(/([A-Z])/g, ' $1')}</dt><dd className="text-right font-bold text-slate-800">{String(value ?? '—')}</dd></div>)}
            {role === 'supplier' && Object.entries(profileDetails).map(([label, value]) => <div key={label} className="flex justify-between gap-3"><dt className="capitalize text-slate-500">{label.replace(/([A-Z])/g, ' $1')}</dt><dd className="text-right font-bold text-slate-800">{String(value ?? '—')}</dd></div>)}
          </dl>
        </aside>

        <div className="space-y-6">
          <form onSubmit={saveProfile} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,.08)] sm:p-8">
            <h2 className="mb-5 text-xl font-extrabold text-slate-900">Personal information</h2>
            {loading ? <div className="grid gap-5 sm:grid-cols-2"><div className="h-14 animate-pulse rounded-xl bg-slate-100"/><div className="h-14 animate-pulse rounded-xl bg-slate-100"/><div className="h-14 animate-pulse rounded-xl bg-slate-100"/></div> : <>
              <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
                <label className="text-sm font-medium text-slate-500">Full name<input className={fieldClass} value={fullName} onChange={(event) => setFullName(event.target.value)} required disabled={!profile}/></label>
                <label className="text-sm font-medium text-slate-500">Phone<input className={fieldClass} value={phone} onChange={(event) => setPhone(event.target.value)} disabled={!profile}/></label>
                <label className="text-sm font-medium text-slate-500">Email<input className={`${fieldClass} bg-slate-100`} value={profile?.email ?? sessionUser?.email ?? ''} readOnly/><span className="mt-1 block text-xs text-slate-400">Email is managed by the account system.</span></label>
                <label className="text-sm font-medium text-slate-500">Language<input className={`${fieldClass} bg-slate-100`} value="English" readOnly disabled/><span className="mt-1 block text-xs text-slate-400">Language preferences are not available in the current API.</span></label>
                {roleFields.map(([key, label]) => <label key={key} className="text-sm font-medium text-slate-500">{label}<input className={fieldClass} value={roleDetails[key] ?? ''} onChange={(event) => setRoleDetails((current) => ({ ...current, [key]: event.target.value }))}/></label>)}
              </div>
              <div className="mt-5 flex justify-end gap-3"><button type="button" onClick={resetProfileForm} disabled={!profile || savingProfile} className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancel</button><button disabled={savingProfile || !profile} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">{savingProfile ? 'Saving…' : 'Save changes'}</button></div>
            </>}
          </form>

          <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,.08)] sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-extrabold text-slate-900">Notifications</h2><span className="text-xs text-slate-400">Settings API unavailable</span></div>
            <div className="mt-3 divide-y divide-slate-100">{unavailablePreferences.map((label) => <div key={label} className="flex items-center justify-between gap-4 py-3"><span className="text-sm font-medium text-slate-700">{label}</span><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-400">Unavailable</span></div>)}</div>
          </section>

          <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,.08)] sm:p-8">
            <h2 className="text-xl font-extrabold text-slate-900">Account &amp; security</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium text-slate-500">Role<input className={`${fieldClass} bg-slate-100`} value={roleLabel} readOnly disabled/></label><label className="text-sm font-medium text-slate-500">Account status<input className={`${fieldClass} bg-slate-100`} value={profile?.status ?? 'Unavailable'} readOnly disabled/></label></div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-5"><div><h3 className="font-bold text-slate-800">Password</h3><p className="mt-1 text-sm text-slate-500">Change your sign-in password.</p></div><button type="button" onClick={() => setPasswordFormOpen((open) => !open)} className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50">{passwordFormOpen ? 'Cancel password change' : 'Change password'}</button></div>
            {passwordFormOpen && <form onSubmit={savePassword} className="mt-5 grid gap-4 rounded-2xl bg-slate-50 p-5 sm:grid-cols-2"><label className="text-sm font-medium text-slate-600 sm:col-span-2">Current password<input className={fieldClass} type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required/></label><label className="text-sm font-medium text-slate-600">New password<input className={fieldClass} type="password" autoComplete="new-password" minLength={8} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required/></label><label className="text-sm font-medium text-slate-600">Confirm new password<input className={fieldClass} type="password" autoComplete="new-password" minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required/></label><div className="flex items-center gap-2 text-xs text-slate-500 sm:col-span-2"><LockKeyhole size={15}/>Other active sessions expire after a successful password change.</div><div className="flex justify-end sm:col-span-2"><button disabled={savingPassword} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50">{savingPassword ? 'Updating…' : <><Check size={16}/>Update password</>}</button></div></form>}
          </section>
        </div>
      </div>
    </main>
    <Footer/>
  </div>;
};

export default ProfileSettings;
